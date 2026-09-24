import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "../prompt";
import { runTool, TOOL_DEFINITIONS, type ToolState } from "../tools";
import { emptyUsage, type ChatMessage, type ProviderResult } from "../types";

// ANTHROPIC_MODEL (AI_MODEL is the older name, still honoured).
export const anthropicModel = () => process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || "claude-opus-5";
// Chat matching works well at medium effort; raise AI_EFFORT for harder briefs.
const effort = () => (process.env.AI_EFFORT as "low" | "medium" | "high" | "xhigh" | "max" | undefined) || "medium";
const MAX_STEPS = 6;

export const anthropicConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic({ timeout: 90_000 }));

export async function anthropicMatchmaker(history: ChatMessage[]): Promise<ProviderResult> {
  const model = anthropicModel();
  // Haiku 4.5 (the low-cost option) predates the effort control and server-side
  // fallbacks, so those are only sent to models that support them.
  const advanced = !model.startsWith("claude-haiku");
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const state: ToolState = { seen: new Map(), recommendation: null };
  const usage = emptyUsage();
  let reply = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await getClient().beta.messages.create({
      model,
      max_tokens: advanced ? 16000 : 4000,
      // Server-side fallback: if a safety classifier declines, the API retries
      // on Anthropic's recommended model for that category.
      ...(advanced
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const, output_config: { effort: effort() } }
        : {}),
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: TOOL_DEFINITIONS as unknown as Anthropic.Beta.BetaTool[],
      messages,
    });
    usage.calls++;
    usage.inputTokens += (response.usage?.input_tokens ?? 0) + (response.usage?.cache_read_input_tokens ?? 0) + (response.usage?.cache_creation_input_tokens ?? 0);
    usage.cachedInputTokens += response.usage?.cache_read_input_tokens ?? 0;
    usage.outputTokens += response.usage?.output_tokens ?? 0;

    if (response.stop_reason === "refusal") throw new Error("refusal");
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

  if (!reply && !state.recommendation) throw new Error("empty_reply");
  return { model, usage, response: { mode: "ai", provider: "anthropic", reply, recommendation: state.recommendation, suggestions: [] } };
}
