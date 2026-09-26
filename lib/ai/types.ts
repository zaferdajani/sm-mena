import type { Match } from "@/lib/matching";
import type { WizardNeed } from "@/lib/match-wizard";

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
  /** Currency of the budget amounts (the visitor's country); JOD when missing. */
  currency?: string;
  /** Nothing matched everything: these are the closest agencies (docs/35). */
  closest?: boolean;
};

/** "mock" runs the real tool loop with a scripted, offline stand-in for the model. */
export type ProviderId = "anthropic" | "openai" | "mock";

export type MatchResponse = {
  reply: string;
  recommendation: Recommendation | null;
  suggestions: string[];
  mode: "ai" | "basic";
  provider: ProviderId | "basic";
  /** The guided chat's answers after this turn (rule-based mode). */
  need?: WizardNeed;
  /** The message named a place in another country: offer to switch (the visitor's country otherwise wins). */
  countrySwitch?: { country: string; city: string | null };
};

export type Usage = { inputTokens: number; cachedInputTokens: number; outputTokens: number; calls: number };

export type ProviderResult = { response: MatchResponse; usage: Usage; model: string };

export const emptyUsage = (): Usage => ({ inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, calls: 0 });
