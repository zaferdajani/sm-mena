import "server-only";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "../prompt";
import { runTool, TOOL_DEFINITIONS, type ToolState } from "../tools";
import { emptyUsage, type ChatMessage, type ProviderResult } from "../types";

// Any Responses-API model with function calling. Pick the cheapest one that
// passes `npm run ai:eval` on Arabic conversations.
export const openaiModel = () => process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_STEPS = 6;

export const openaiConfigured = () => Boolean(process.env.OPENAI_API_KEY);

let client: OpenAI | undefined;
const getClient = () => (client ??= new OpenAI({ timeout: 90_000 }));

// Same tool schemas as the Claude provider, in the Responses API shape.
const TOOLS: OpenAI.Responses.FunctionTool[] = TOOL_DEFINITIONS.map((t) => ({
  type: "function",
  name: t.name,
  description: t.description,
  parameters: t.input_schema as unknown as Record<string, unknown>,
  strict: true,
}));

export async function openaiMatchmaker(history: ChatMessage[]): Promise<ProviderResult> {
  const model = openaiModel();
  const input: OpenAI.Responses.ResponseInputItem[] = history.map((m) => ({ role: m.role, content: m.content }));
  const state: ToolState = { seen: new Map(), recommendation: null };
  const usage = emptyUsage();
  let reply = "";

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await getClient().responses.create({
      model,
      instructions: SYSTEM_PROMPT, // identical every call, so OpenAI's automatic prefix cache applies
      input,
      tools: TOOLS,
      max_output_tokens: 4000,
      // Don't keep conversations on OpenAI's side beyond their standard abuse logs.
      store: false,
      prompt_cache_key: "sawwiq-matchmaker",
    });
    usage.calls++;
    usage.inputTokens += response.usage?.input_tokens ?? 0;
    usage.cachedInputTokens += response.usage?.input_tokens_details?.cached_tokens ?? 0;
    usage.outputTokens += response.usage?.output_tokens ?? 0;

    if (response.error) throw new Error(`openai_error: ${response.error.code}`);
    const refused = response.output.some((item) => item.type === "message" && item.content.some((c) => c.type === "refusal"));
    if (refused) throw new Error("refusal");

    const calls = response.output.filter((item): item is OpenAI.Responses.ResponseFunctionToolCall => item.type === "function_call");
    if (calls.length) {
      for (const item of response.output) {
        // With store:false, item ids can't be referenced later, so function calls
        // are replayed without them and reasoning items are left out.
        if (item.type === "function_call") input.push({ type: "function_call", call_id: item.call_id, name: item.name, arguments: item.arguments });
        else if (item.type === "message") {
          const text = item.content.map((c) => (c.type === "output_text" ? c.text : "")).join("");
          if (text) input.push({ role: "assistant", content: text });
        }
      }
      const results = await Promise.all(
        calls.map(async (call) => {
          let args: unknown;
          try {
            args = JSON.parse(call.arguments);
          } catch {
            return { type: "function_call_output" as const, call_id: call.call_id, output: "Invalid JSON arguments." };
          }
          const r = await runTool(call.name, args, state);
          return { type: "function_call_output" as const, call_id: call.call_id, output: r.isError ? `Error: ${r.content}` : r.content };
        }),
      );
      input.push(...results);
      continue;
    }

    reply = response.output_text.trim();
    if (!reply && response.incomplete_details?.reason) throw new Error(`incomplete: ${response.incomplete_details.reason}`);
    break;
  }

  if (!reply && !state.recommendation) throw new Error("empty_reply");
  return { model, usage, response: { mode: "ai", provider: "openai", reply, recommendation: state.recommendation, suggestions: [] } };
}
