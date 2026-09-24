import type { Match } from "@/lib/matching";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type Recommendation = {
  agencies: Match[];
  services: string[];
  city: string | null;
  platforms: string[];
  budgetMinJod: number | null;
  budgetMaxJod: number | null;
  budgetNote: string;
  summary: string;
};

/** "mock" runs the real tool loop with a scripted, offline stand-in for the model. */
export type ProviderId = "anthropic" | "openai" | "mock";

export type MatchResponse = {
  reply: string;
  recommendation: Recommendation | null;
  suggestions: string[];
  mode: "ai" | "basic";
  provider: ProviderId | "basic";
};

export type Usage = { inputTokens: number; cachedInputTokens: number; outputTokens: number; calls: number };

export type ProviderResult = { response: MatchResponse; usage: Usage; model: string };

export const emptyUsage = (): Usage => ({ inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, calls: 0 });
