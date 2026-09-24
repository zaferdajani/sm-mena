import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { recordRecommendations } from "@/lib/matching";
import { basicMatchmaker } from "./fallback";
import { SYSTEM_PROMPT } from "./prompt";
import { runTool, TOOL_DEFINITIONS, type ToolState } from "./tools";
import type { ChatMessage, MatchResponse } from "./types";

const MODEL = process.env.AI_MODEL || "claude-opus-5";
// Chat matching works well at medium effort; raise AI_EFFORT for harder briefs.
const EFFORT = (process.env.AI_EFFORT as "low" | "medium" | "high" | "xhigh" | "max" | undefined) || "medium";
const MAX_STEPS = 6;
// Haiku 4.5 (the low-cost option) predates the effort control and server-side
// fallbacks, so those are only sent to models that support them.
const ADVANCED = !MODEL.startsWith("claude-haiku");

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic({ timeout: 90_000 }));

/**
 * Runs the matchmaker for one user turn. History is plain text (the page keeps
 * the transcript); the model re-runs tools as needed each turn.
 */
export async function runMatchmaker(history: ChatMessage[], locale: string, visitorId: string | null): Promise<MatchResponse> {
  let result: MatchResponse;
  if (!aiEnabled()) {
    result = await basicMatchmaker(history, locale);
  } else {
    try {
      result = await claudeMatchmaker(history);
    } catch (error) {
      // Rate limits, outages or auth problems: keep the product working.
      if (error instanceof Anthropic.APIError) console.error(`[matchmaker] API error ${error.status}: ${error.message}`);
      else console.error("[matchmaker]", error);
      result = await basicMatchmaker(history, locale);
    }
  }
  if (result.recommendation) {
    await recordRecommendations(result.recommendation.agencies.map((a) => a.id), visitorId).catch(() => {});
  }
  return result;
}

async function claudeMatchmaker(history: ChatMessage[]): Promise<MatchResponse> {
  const anthropic = getClient();
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const state: ToolState = { seen: new Map(), recommendation: null };
  let reply = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: ADVANCED ? 16000 : 4000,
      // Server-side fallback: if a safety classifier declines, the API retries
      // on Anthropic's recommended model for that category.
      ...(ADVANCED
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const, output_config: { effort: EFFORT } }
        : {}),
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: TOOL_DEFINITIONS as unknown as Anthropic.Beta.BetaTool[],
      messages,
    });

    if (response.stop_reason === "refusal") {
      reply = "";
      break;
    }
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "pause_turn") continue;

    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason === "tool_use" && toolUses.length) {
      const results = await Promise.all(
        toolUses.map(async (block) => {
          const r = await runTool(block.name, block.input, state);
          return { type: "tool_result" as const, tool_use_id: block.id, content: r.content, is_error: r.isError };
        }),
      );
      messages.push({ role: "user", content: results }); // all results in one message
      continue;
    }

    reply = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    break;
  }

  if (!reply && !state.recommendation) {
    throw new Error("empty_reply");
  }
  return { mode: "ai", reply, recommendation: state.recommendation, suggestions: [] };
}
