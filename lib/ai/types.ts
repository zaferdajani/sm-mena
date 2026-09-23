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

export type MatchResponse = {
  reply: string;
  recommendation: Recommendation | null;
  suggestions: string[];
  mode: "ai" | "basic";
};
