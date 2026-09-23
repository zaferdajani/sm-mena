import "./setup-db";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Scripted fake of the Anthropic SDK: each call returns the next queued response.
const queue: unknown[] = [];
const calls: Record<string, unknown>[] = [];
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    status = 500;
  }
  class Anthropic {
    static APIError = APIError;
    beta = {
      messages: {
        create: async (params: Record<string, unknown>) => {
          calls.push(structuredClone(params));
          const next = queue.shift();
          if (next instanceof Error) throw next;
          return next;
        },
      },
    };
  }
  return { default: Anthropic, APIError };
});

const { createAgency } = await import("@/lib/data/agencies");
const { createUser } = await import("@/lib/data/users");
const { closeDb } = await import("@/lib/db");
const { runMatchmaker } = await import("@/lib/ai/agent");
const { APIError } = (await import("@anthropic-ai/sdk")) as unknown as { APIError: new () => Error };

const msg = (stop_reason: string, content: unknown[]) => ({ id: "m", type: "message", role: "assistant", model: "claude-opus-5", stop_reason, content, usage: {} });

beforeAll(async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  const u = await createUser("ai@t.jo", "password-123");
  await createAgency(u.id, { handle: "meta.pros", name: "Meta Pros", city: "amman", services: ["ads_meta"], startingPriceJod: 300 }, { isVerified: true });
});
afterAll(async () => {
  delete process.env.ANTHROPIC_API_KEY;
  await closeDb();
});
beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
});

describe("Claude matchmaker loop", () => {
  it("runs tools, captures the recommendation and returns the final text", async () => {
    queue.push(
      msg("tool_use", [
        { type: "text", text: "Let me search." },
        { type: "tool_use", id: "t1", name: "search_agencies", input: { services: ["ads_meta"], city: "amman", budget_max_jod: 400, platforms: [], industry: null } },
        { type: "tool_use", id: "t2", name: "price_guide", input: { service: "ads_meta", city: null } },
      ]),
      msg("tool_use", [
        { type: "tool_use", id: "t3", name: "recommend_agencies", input: { handles: ["meta.pros"], services: ["ads_meta"], city: "amman", platforms: [], budget_min_jod: 250, budget_max_jod: 400, budget_note: "Typical range.", summary: "Meta ads for a café." } },
      ]),
      msg("end_turn", [{ type: "text", text: "Meta Pros is a strong fit." }]),
    );
    const res = await runMatchmaker([{ role: "user", content: "Meta ads for my café in Amman, 400 JOD" }], "en", "v1");
    expect(res.mode).toBe("ai");
    expect(res.reply).toBe("Meta Pros is a strong fit.");
    expect(res.recommendation?.agencies.map((a) => a.handle)).toEqual(["meta.pros"]);
    expect(res.recommendation?.budgetMaxJod).toBe(400);

    // Request shape: model, fallbacks, cached system prompt, strict tools.
    expect(calls[0]).toMatchObject({ model: "claude-opus-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect((calls[0].tools as { strict: boolean }[]).every((t) => t.strict)).toBe(true);
    // Both tool results go back in a single user message.
    const second = calls[1].messages as { role: string; content: { type: string; tool_use_id: string }[] }[];
    const results = second.at(-1)!;
    expect(results.role).toBe("user");
    expect(results.content.map((c) => c.tool_use_id)).toEqual(["t1", "t2"]);
  });

  it("rejects handles the model did not get from search", async () => {
    queue.push(
      msg("tool_use", [{ type: "tool_use", id: "t1", name: "recommend_agencies", input: { handles: ["made.up"], services: ["ads_meta"], city: null, platforms: [], budget_min_jod: null, budget_max_jod: null, budget_note: "", summary: "" } }]),
      msg("end_turn", [{ type: "text", text: "Let me search first." }]),
    );
    const res = await runMatchmaker([{ role: "user", content: "ads" }], "en", null);
    expect(res.recommendation).toBeNull();
    const toolResult = (calls[1].messages as { content: { is_error?: boolean }[] }[]).at(-1)!.content[0];
    expect(toolResult.is_error).toBe(true);
  });

  it("falls back to the rule-based matchmaker on refusal or API errors", async () => {
    queue.push(msg("refusal", []));
    const refused = await runMatchmaker([{ role: "user", content: "Meta ads in Amman" }], "en", null);
    expect(refused.mode).toBe("basic");

    queue.push(new APIError());
    const outage = await runMatchmaker([{ role: "user", content: "Meta ads in Amman" }], "en", null);
    expect(outage.mode).toBe("basic");
    expect(outage.recommendation?.agencies[0].handle).toBe("meta.pros");
  });
});
