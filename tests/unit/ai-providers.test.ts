import "./setup-db";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Scripted fakes of both SDKs: each call returns the next queued response.
const openaiQueue: unknown[] = [];
const openaiCalls: Record<string, unknown>[] = [];
const anthropicQueue: unknown[] = [];
vi.mock("openai", () => {
  class APIError extends Error {
    status = 429;
  }
  class OpenAI {
    static APIError = APIError;
    responses = {
      create: async (params: Record<string, unknown>) => {
        openaiCalls.push(structuredClone(params));
        const next = openaiQueue.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    };
  }
  return { default: OpenAI, APIError };
});
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status = 500;
  }
  class Anthropic {
    static APIError = APIError;
    beta = {
      messages: {
        create: async () => {
          const next = anthropicQueue.shift();
          if (next instanceof Error) throw next;
          return next;
        },
      },
    };
  }
  return { default: Anthropic, APIError };
});

const { seed } = await import("@/lib/db/seed");
const { closeDb } = await import("@/lib/db");
const { runMatchmaker, runProvider, providerChain, aiStatus } = await import("@/lib/ai/agent");
const { scoreCase } = await import("@/lib/ai/eval");
const { MATCH_CASES } = await import("../fixtures/matchmaker-cases");
const { APIError: OpenAIError } = (await import("openai")) as unknown as { APIError: new () => Error };

const usage = { input_tokens: 1200, output_tokens: 80, input_tokens_details: { cached_tokens: 1000 }, output_tokens_details: { reasoning_tokens: 0 }, total_tokens: 1280 };
const fnCall = (id: string, name: string, args: unknown) => ({ type: "function_call", id: `fc_${id}`, call_id: id, name, arguments: JSON.stringify(args), status: "completed" });
const respond = (output: unknown[], text = "") => ({ id: "resp", status: "completed", error: null, incomplete_details: null, output, output_text: text, usage });
const text = (t: string) => ({ type: "message", id: "msg", role: "assistant", status: "completed", content: [{ type: "output_text", text: t, annotations: [] }] });

const env = { ...process.env };
beforeAll(async () => {
  await seed({ quiet: true });
}, 600_000); // the demo seed encodes every demo photo (quality search)
afterAll(async () => {
  process.env = env;
  await closeDb();
});
beforeEach(() => {
  openaiQueue.length = 0;
  openaiCalls.length = 0;
  anthropicQueue.length = 0;
  for (const k of ["AI_PROVIDER", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "OPENAI_MODEL"]) delete process.env[k];
});

describe("provider selection", () => {
  it("follows AI_PROVIDER and the keys that are present", () => {
    expect(providerChain()).toEqual([]);
    expect(aiStatus()).toBe("basic");
    process.env.OPENAI_API_KEY = "k";
    expect(providerChain()).toEqual(["openai"]);
    process.env.ANTHROPIC_API_KEY = "k";
    expect(providerChain()).toEqual(["anthropic", "openai"]);
    process.env.AI_PROVIDER = "openai";
    expect(providerChain()).toEqual(["openai", "anthropic"]);
    expect(aiStatus()).toBe("openai:gpt-4o-mini > anthropic:claude-opus-5");
    process.env.AI_PROVIDER = "mock";
    expect(providerChain()).toEqual(["mock"]);
    process.env.AI_PROVIDER = "basic";
    expect(providerChain()).toEqual([]);
  });
});

describe("OpenAI matchmaker loop", () => {
  it("runs function calls, replays them statelessly and returns the final text", async () => {
    process.env.OPENAI_API_KEY = "k";
    openaiQueue.push(
      respond([
        fnCall("c1", "search_agencies", { services: ["ads_meta"], city: "amman", budget_max_jod: 500, platforms: [], industry: null }),
        fnCall("c2", "price_guide", { service: "ads_meta", city: null }),
      ]),
      respond([fnCall("c3", "recommend_agencies", { handles: ["petra.growth"], services: ["ads_meta"], city: "amman", platforms: [], budget_min_jod: 250, budget_max_jod: 500, budget_note: "Typical range.", summary: "Meta ads for a store." })]),
      respond([text("Petra Growth fits well.")], "Petra Growth fits well."),
    );
    const res = await runMatchmaker([{ role: "user", content: "Meta ads for my store in Amman, 500 JOD" }], "en", "v1");
    expect(res).toMatchObject({ mode: "ai", provider: "openai", reply: "Petra Growth fits well." });
    expect(res.recommendation?.agencies.map((a) => a.handle)).toEqual(["petra.growth"]);

    // Request shape: nothing stored at OpenAI, cached instructions, strict function tools.
    expect(openaiCalls[0]).toMatchObject({ model: "gpt-4o-mini", store: false, prompt_cache_key: "sawwiq-matchmaker" });
    expect(typeof openaiCalls[0].instructions).toBe("string");
    const tools = openaiCalls[0].tools as { type: string; strict: boolean; name: string }[];
    expect(tools.map((t) => t.name)).toEqual(["search_agencies", "price_guide", "recommend_agencies"]);
    expect(tools.every((t) => t.type === "function" && t.strict)).toBe(true);

    // Second call replays the calls without ids, then both outputs.
    const input = openaiCalls[1].input as Record<string, unknown>[];
    const replayed = input.filter((i) => i.type === "function_call");
    expect(replayed.map((i) => i.call_id)).toEqual(["c1", "c2"]);
    expect(replayed.every((i) => !("id" in i))).toBe(true);
    const outputs = input.filter((i) => i.type === "function_call_output");
    expect(outputs.map((o) => o.call_id)).toEqual(["c1", "c2"]);
    expect(String(outputs[0].output)).toContain("petra.growth");
    // Phone numbers never reach the model.
    expect(String(outputs[0].output)).not.toMatch(/\+962|whatsapp/i);
  });

  it("reports bad arguments back to the model instead of crashing", async () => {
    process.env.OPENAI_API_KEY = "k";
    openaiQueue.push(
      respond([{ ...fnCall("c1", "search_agencies", {}), arguments: "{not json" }]),
      respond([text("Could you tell me the service you need?")], "Could you tell me the service you need?"),
    );
    const res = await runMatchmaker([{ role: "user", content: "help" }], "en", null);
    expect(res.provider).toBe("openai");
    const out = (openaiCalls[1].input as Record<string, unknown>[]).find((i) => i.type === "function_call_output");
    expect(out?.output).toBe("Invalid JSON arguments.");
  });

  it("falls back to Claude, then to the free matchmaker", async () => {
    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "k";
    process.env.ANTHROPIC_API_KEY = "k";
    openaiQueue.push(new OpenAIError()); // e.g. spend limit reached (429)
    anthropicQueue.push({ id: "m", type: "message", role: "assistant", model: "claude-opus-5", stop_reason: "end_turn", content: [{ type: "text", text: "From Claude." }], usage: {} });
    const viaClaude = await runMatchmaker([{ role: "user", content: "Meta ads in Amman" }], "en", null);
    expect(viaClaude).toMatchObject({ provider: "anthropic", reply: "From Claude." });

    openaiQueue.push(new OpenAIError());
    anthropicQueue.push(new Error("outage"));
    const viaRules = await runMatchmaker([{ role: "user", content: "Meta ads in Amman" }], "en", null);
    expect(viaRules.provider).toBe("basic");
    expect(viaRules.recommendation?.agencies.length).toBeGreaterThan(0);
  });

  it("treats a refusal as a failure and moves on", async () => {
    process.env.OPENAI_API_KEY = "k";
    openaiQueue.push(respond([{ type: "message", id: "m", role: "assistant", status: "completed", content: [{ type: "refusal", refusal: "no" }] }]));
    const res = await runMatchmaker([{ role: "user", content: "Meta ads in Amman" }], "en", null);
    expect(res.provider).toBe("basic");
  });
});

describe("mock provider on the test conversations", () => {
  it("drives the real tools and passes every case the keyword rules can handle", async () => {
    const failures: string[] = [];
    for (const c of MATCH_CASES.filter((c) => c.rules)) {
      const { response } = await runProvider("mock", c.turns, "en");
      expect(response.provider).toBe("mock");
      const bad = scoreCase(c.expect, c.turns.at(-1)!.content, response).filter((ch) => !ch.ok);
      if (bad.length) failures.push(`${c.id}: ${bad.map((b) => b.name).join(", ")}`);
    }
    expect(failures).toEqual([]);
  }, 60_000);

  it("is what runMatchmaker uses when AI_PROVIDER=mock", async () => {
    process.env.AI_PROVIDER = "mock";
    const res = await runMatchmaker([{ role: "user", content: "أحتاج إعلانات فيسبوك في عمان" }], "ar", null);
    expect(res).toMatchObject({ mode: "ai", provider: "mock" });
    expect(res.reply).toMatch(/تجريبي/);
    expect(res.recommendation?.agencies.length).toBeGreaterThan(0);
  });
});

describe("eval scoring", () => {
  it("flags wrong city, invented agencies and wrong language", () => {
    const agency = { handle: "petra.growth", services: ["ads_meta"] } as never;
    const rec = { agencies: [agency], services: ["ads_meta"], city: "irbid", platforms: [], budgetMinJod: null, budgetMaxJod: 500, budgetNote: "", summary: "" };
    const res = { mode: "ai" as const, provider: "openai" as const, reply: "Here you go", suggestions: [], recommendation: rec };
    const checks = scoreCase({ kind: "recommend", services: ["ads_meta"], city: "amman", budget: 500 }, "Meta ads in Amman", res);
    expect(checks.find((c) => c.name === "city")?.ok).toBe(false);
    expect(checks.find((c) => c.name === "budget")?.ok).toBe(true);
    expect(scoreCase({ kind: "grounded", forbiddenHandles: ["petra.growth"] }, "x", res)[1].ok).toBe(false);
    expect(scoreCase({ kind: "ask" }, "مرحبا", { ...res, recommendation: null })[0].ok).toBe(false); // replied in English to Arabic
  });
});
