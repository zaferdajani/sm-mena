// Pure scoring: how well an agency fits a project. No I/O, fully unit-tested.
//
// Relevance comes first. A paid plan adds a small, capped boost only to
// agencies that are already a good fit, and boosted results are labelled
// "Featured" in the UI (docs/10-monetization.md).

import { isFullService } from "@/lib/full-service";

export type Need = {
  services: string[];
  city?: string | null;
  budgetMaxJod?: number | null;
  platforms?: string[];
  industry?: string | null;
  /** The client wants one team for content, ads and branding ("A to Z"). */
  fullService?: boolean;
};

export type AgencyFeatures = {
  id: string;
  services: string[];
  platforms: string[];
  industries: string[];
  city: string;
  startingPriceJod: number | null;
  cheapestPackageJod: number | null;
  isVerified: boolean;
  ratingSum: number;
  ratingCount: number;
  googleRating: number | null;
  googleRatingCount: number | null;
  servicePosts: number; // published posts tagged with a requested service
  plan: "free" | "pro" | "business";
  planActive: boolean;
};

export type Reason =
  | { code: "services"; matched: number; total: number }
  | { code: "portfolio"; posts: number }
  | { code: "budget_fit"; priceJod: number }
  | { code: "over_budget"; priceJod: number }
  | { code: "same_city" }
  | { code: "platform" }
  | { code: "industry" }
  | { code: "rating"; average: number; count: number }
  | { code: "google"; average: number; count: number }
  | { code: "verified" }
  | { code: "full_service" }
  | { code: "featured" };

export type Scored = { agencyId: string; score: number; relevance: number; featured: boolean; reasons: Reason[] };

export const WEIGHTS = {
  services: 35,
  portfolioPerPost: 3,
  portfolioMax: 15,
  budgetFit: 15,
  budgetNear: 7,
  budgetUnknown: 8,
  sameCity: 10,
  otherCity: 4,
  anyCity: 6,
  platform: 5,
  industry: 5,
  reputationMax: 15,
  verified: 3,
  fullService: 8,
  boostMinRelevance: 45,
  boost: { free: 0, pro: 6, business: 10 } as const,
};

const PRIOR_MEAN = 4.0;
const PRIOR_WEIGHT = 3;

/** Bayesian average so one 5-star review doesn't beat twenty 4.8s. */
export function bayesian(average: number, count: number) {
  return (PRIOR_MEAN * PRIOR_WEIGHT + average * count) / (PRIOR_WEIGHT + count);
}

export function scoreAgency(need: Need, a: AgencyFeatures): Scored | null {
  const reasons: Reason[] = [];
  const wanted = [...new Set(need.services)];
  const matched = wanted.filter((s) => a.services.includes(s)).length;
  if (wanted.length && matched === 0) return null; // must offer at least one requested service

  let relevance = wanted.length ? (WEIGHTS.services * matched) / wanted.length : WEIGHTS.services / 2;
  if (wanted.length) reasons.push({ code: "services", matched, total: wanted.length });

  const portfolio = Math.min(a.servicePosts * WEIGHTS.portfolioPerPost, WEIGHTS.portfolioMax);
  relevance += portfolio;
  if (a.servicePosts > 0) reasons.push({ code: "portfolio", posts: a.servicePosts });

  const price = a.cheapestPackageJod ?? a.startingPriceJod;
  if (!need.budgetMaxJod || price === null) relevance += WEIGHTS.budgetUnknown;
  else if (price <= need.budgetMaxJod) {
    relevance += WEIGHTS.budgetFit;
    reasons.push({ code: "budget_fit", priceJod: price });
  } else if (price <= need.budgetMaxJod * 1.25) {
    relevance += WEIGHTS.budgetNear;
    reasons.push({ code: "over_budget", priceJod: price });
  } else reasons.push({ code: "over_budget", priceJod: price });

  if (!need.city) relevance += WEIGHTS.anyCity;
  else if (need.city === a.city) {
    relevance += WEIGHTS.sameCity;
    reasons.push({ code: "same_city" });
  } else relevance += WEIGHTS.otherCity;

  if (need.platforms?.length && need.platforms.some((p) => a.platforms.includes(p))) {
    relevance += WEIGHTS.platform;
    reasons.push({ code: "platform" });
  }
  if (need.industry && a.industries.includes(need.industry)) {
    relevance += WEIGHTS.industry;
    reasons.push({ code: "industry" });
  }

  // Reputation: platform reviews and Google rating, shrunk toward the prior.
  const signals: number[] = [];
  if (a.ratingCount > 0) {
    const avg = a.ratingSum / a.ratingCount;
    signals.push(bayesian(avg, a.ratingCount));
    reasons.push({ code: "rating", average: Math.round(avg * 10) / 10, count: a.ratingCount });
  }
  if (a.googleRating !== null && (a.googleRatingCount ?? 0) > 0) {
    signals.push(bayesian(a.googleRating, a.googleRatingCount!));
    reasons.push({ code: "google", average: a.googleRating, count: a.googleRatingCount! });
  }
  const reviewsTotal = a.ratingCount + (a.googleRatingCount ?? 0);
  if (signals.length) {
    const rep = signals.reduce((x, y) => x + y, 0) / signals.length;
    relevance += Math.max(0, ((rep - 3) / 2) * (WEIGHTS.reputationMax - 3)) + (Math.min(reviewsTotal, 20) / 20) * 3;
  }
  if (need.fullService && isFullService(a.services)) {
    relevance += WEIGHTS.fullService;
    reasons.push({ code: "full_service" });
  }
  if (a.isVerified) {
    relevance += WEIGHTS.verified;
    reasons.push({ code: "verified" });
  }

  relevance = Math.min(100, Math.round(relevance));
  const boost = a.planActive && relevance >= WEIGHTS.boostMinRelevance ? WEIGHTS.boost[a.plan] : 0;
  if (boost) reasons.push({ code: "featured" });
  return { agencyId: a.id, score: Math.min(100, relevance + boost), relevance, featured: boost > 0, reasons };
}

/** Ranks agencies; ties break on relevance, then id for stable output. */
export function rank(need: Need, agencies: AgencyFeatures[], limit = 8): Scored[] {
  return agencies
    .map((a) => scoreAgency(need, a))
    .filter((s): s is Scored => s !== null)
    .sort((x, y) => y.score - x.score || y.relevance - x.relevance || x.agencyId.localeCompare(y.agencyId))
    .slice(0, limit);
}

/** Budget range suggestion from real prices (starting prices and packages). */
export function suggestBudget(prices: number[]): { min: number; max: number; median: number } | null {
  const sorted = prices.filter((p) => p > 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))];
  return { min: q(0.25), median: q(0.5), max: q(0.75) };
}
