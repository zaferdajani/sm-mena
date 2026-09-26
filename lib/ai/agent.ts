import "server-only";
import { scopedCountry, withCountry } from "@/lib/matching/scope";
import { countryOf, currencyOf } from "@/lib/countries";
import { INDUSTRIES, serviceLabel } from "@/lib/labels";
import { resolveServices, type WizardNeed } from "@/lib/match-wizard";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { recordRecommendations } from "@/lib/matching";
import { basicMatchmaker, turnCountry } from "./fallback";
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
 * A note appended to the client's latest message for the model: the country
 * they browse (its currency) and what they tapped in the guided chat. Per-turn
 * data stays out of the cached system prompt.
 */
export function pageContext(country: string, need?: WizardNeed) {
  const c = countryOf(country);
  const parts = [`they are browsing agencies in ${c.en} (country code ${c.code}); amounts are in ${c.currency} a month, and the *_jod tool fields hold ${c.currency} here`];
  if (need) {
    const services = resolveServices(need);
    if (services.length) parts.push(`services: ${services.map((s) => serviceLabel(s, "en")).join(", ")}`);
    if (need.industry && (INDUSTRIES as readonly string[]).includes(need.industry)) parts.push(`business: ${need.industry}`);
    if (need.platforms.length) parts.push(`platforms: ${need.platforms.join(", ")}`);
    if (need.budgetMax !== null) parts.push(`budget up to ${need.budgetMax} ${c.currency}`);
    else if (need.budgetMin !== null) parts.push(`budget over ${need.budgetMin} ${c.currency}`);
    if (need.city) parts.push(`city: ${need.city}`);
  }
  return `\n\n[Page context, not written by the client: ${parts.join("; ")}.]`;
}

function withContext(history: ChatMessage[], country: string, need?: WizardNeed): ChatMessage[] {
  const i = history.findLastIndex((m) => m.role === "user");
  return history.map((m, j) => (j === i ? { ...m, content: m.content + pageContext(country, need) } : m));
}

export type TurnOptions = {
  /** The guided chat's answers so far. */
  need?: WizardNeed;
  /** The last message is a choice the guided chat tapped (already in `need`). */
  picked?: boolean;
  /** The visitor chose the demo view: demo agencies may be recommended (labelled). */
  includeDemo?: boolean;
};

/**
 * Runs the matchmaker for one user turn. History is plain text (the page keeps
 * the transcript); the model re-runs tools as needed each turn. The visitor's
 * `country` scopes every search and price.
 */
export async function runMatchmaker(history: ChatMessage[], locale: string, visitorId: string | null, country?: string, options: TurnOptions = {}): Promise<MatchResponse> {
  if (country && !scopedCountry()) return withCountry(country, () => runMatchmaker(history, locale, visitorId, country, options), options.includeDemo);
  let result: MatchResponse | null = null;
  const aiHistory = country ? withContext(history, country, options.need) : history;
  for (const provider of providerChain()) {
    try {
      result = (await runProvider(provider, aiHistory, locale)).response;
      break;
    } catch (error) {
      // Log status and message only; never the conversation.
      const status = (error as { status?: number }).status;
      console.error(`[matchmaker] ${provider} failed${status ? ` (${status})` : ""}: ${(error as Error).message}`);
    }
  }
  result ??= await basicMatchmaker(history, locale, options.need, options.picked);
  if (result.recommendation) result.recommendation.currency ??= currencyOf(turnCountry());
  // One ai_chat event per answered turn, tagged with who answered (Admin → Statistics).
  await getDb()
    .then((db) => db.insert(events).values({ type: "ai_chat", visitorId, detail: result.provider }))
    .catch(() => {});
  if (result.recommendation) {
    await recordRecommendations(result.recommendation.agencies.map((a) => a.id), visitorId).catch(() => {});
  }
  return result;
}
