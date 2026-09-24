import "server-only";
import { scopedCountry, withCountry } from "@/lib/matching/scope";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { recordRecommendations } from "@/lib/matching";
import { basicMatchmaker } from "./fallback";
import { anthropicConfigured, anthropicMatchmaker, anthropicModel } from "./providers/anthropic";
import { mockMatchmaker } from "./providers/mock";
import { openaiConfigured, openaiMatchmaker, openaiModel } from "./providers/openai";
import type { ChatMessage, MatchResponse, ProviderId, ProviderResult } from "./types";

// AI_PROVIDER picks who runs the chat:
//   auto (default)  Claude if ANTHROPIC_API_KEY is set, else OpenAI if OPENAI_API_KEY is set
//   anthropic       Claude first, OpenAI as backup when its key is set
//   openai          OpenAI first, Claude as backup when its key is set
//   mock            scripted offline stand-in (tests, demos; no key, no cost)
//   basic | off     rule-based matchmaker only
// Whatever fails (outage, rate limit, spend limit, refusal) falls through to the
// next provider and finally to the free rule-based matchmaker.
export function providerChain(): ProviderId[] {
  const choice = (process.env.AI_PROVIDER || "auto").toLowerCase();
  if (choice === "mock") return ["mock"];
  if (choice === "basic" || choice === "off") return [];
  const order: ProviderId[] = choice === "openai" ? ["openai", "anthropic"] : ["anthropic", "openai"];
  return order.filter((p) => (p === "anthropic" ? anthropicConfigured() : openaiConfigured()));
}

export function aiEnabled() {
  return providerChain().length > 0;
}

/** For /api/health: provider order and models, never keys. */
export function aiStatus() {
  const chain = providerChain();
  const models: Record<ProviderId, () => string> = { anthropic: anthropicModel, openai: openaiModel, mock: () => "mock" };
  return chain.length ? chain.map((p) => `${p}:${models[p]()}`).join(" > ") : "basic";
}

export async function runProvider(provider: ProviderId, history: ChatMessage[], locale: string): Promise<ProviderResult> {
  if (provider === "anthropic") return anthropicMatchmaker(history);
  if (provider === "openai") return openaiMatchmaker(history);
  return mockMatchmaker(history, locale);
}

/**
 * Runs the matchmaker for one user turn. History is plain text (the page keeps
 * the transcript); the model re-runs tools as needed each turn.
 */
export async function runMatchmaker(history: ChatMessage[], locale: string, visitorId: string | null, country?: string): Promise<MatchResponse> {
  if (country && !scopedCountry()) return withCountry(country, () => runMatchmaker(history, locale, visitorId, country));
  let result: MatchResponse | null = null;
  for (const provider of providerChain()) {
    try {
      result = (await runProvider(provider, history, locale)).response;
      break;
    } catch (error) {
      // Log status and message only; never the conversation.
      const status = (error as { status?: number }).status;
      console.error(`[matchmaker] ${provider} failed${status ? ` (${status})` : ""}: ${(error as Error).message}`);
    }
  }
  result ??= await basicMatchmaker(history, locale);
  // One ai_chat event per answered turn, tagged with who answered (Admin → Statistics).
  await getDb()
    .then((db) => db.insert(events).values({ type: "ai_chat", visitorId, detail: result.provider }))
    .catch(() => {});
  if (result.recommendation) {
    await recordRecommendations(result.recommendation.agencies.map((a) => a.id), visitorId).catch(() => {});
  }
  return result;
}
