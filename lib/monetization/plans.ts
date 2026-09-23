// Single source of truth for plans (docs/10-monetization.md).
// Prices are proposals to validate with agencies; nothing is charged while
// MONETIZATION_ENABLED is not "true".

export type PlanId = "free" | "pro" | "business";

export type Plan = {
  id: PlanId;
  priceJodMonthly: number;
  maxPosts: number | null; // null = unlimited
  insightsDays: number;
  rankingBoost: number; // added to explore ranking; 0 = none
  badge: boolean;
  teamSeats: number;
  leadExport: boolean;
  proposalsPerMonth: number | null; // null = unlimited
  recommendationBoost: boolean; // capped boost + "Featured" label in AI matches
};

export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", priceJodMonthly: 0, maxPosts: 12, insightsDays: 30, rankingBoost: 0, badge: false, teamSeats: 1, leadExport: false, proposalsPerMonth: 5, recommendationBoost: false },
  pro: { id: "pro", priceJodMonthly: 19, maxPosts: null, insightsDays: 365, rankingBoost: 1, badge: true, teamSeats: 1, leadExport: false, proposalsPerMonth: 30, recommendationBoost: true },
  business: { id: "business", priceJodMonthly: 49, maxPosts: null, insightsDays: 365, rankingBoost: 2, badge: true, teamSeats: 3, leadExport: true, proposalsPerMonth: null, recommendationBoost: true },
};

/** Sponsored slot pacing rules (docs/10-monetization.md §3). */
export const PROMOTION_RULES = {
  feedEvery: 6, // at most one sponsored post after every six organic posts
  stripAfter: 2, // one sponsored agency after two organic ones in the strip
  exploreTop: 1, // one sponsored result at the top of explore
  pricePerDayJod: 5,
};

export function monetizationEnabled(): boolean {
  return process.env.MONETIZATION_ENABLED === "true";
}
