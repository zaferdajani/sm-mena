import { describe, expect, it } from "vitest";
import { bayesian, rank, scoreAgency, suggestBudget, WEIGHTS, type AgencyFeatures } from "@/lib/matching/score";

const base: AgencyFeatures = {
  id: "a",
  services: ["ads_meta", "smm_management"],
  platforms: ["instagram"],
  industries: ["restaurant_cafe"],
  city: "amman",
  startingPriceJod: 300,
  cheapestPackageJod: null,
  isVerified: false,
  ratingSum: 0,
  ratingCount: 0,
  googleRating: null,
  googleRatingCount: null,
  servicePosts: 0,
  plan: "free",
  planActive: false,
};

describe("scoreAgency", () => {
  it("excludes agencies that offer none of the requested services", () => {
    expect(scoreAgency({ services: ["seo"] }, base)).toBeNull();
  });

  it("rewards full service coverage, budget fit, city, platform and industry", () => {
    const s = scoreAgency({ services: ["ads_meta"], city: "amman", budgetMaxJod: 400, platforms: ["instagram"], industry: "restaurant_cafe" }, base)!;
    const codes = s.reasons.map((r) => r.code);
    expect(codes).toEqual(expect.arrayContaining(["services", "budget_fit", "same_city", "platform", "industry"]));
    expect(s.relevance).toBe(WEIGHTS.services + WEIGHTS.budgetFit + WEIGHTS.sameCity + WEIGHTS.platform + WEIGHTS.industry);
  });

  it("uses the cheapest package over the starting price and flags over-budget", () => {
    const s = scoreAgency({ services: ["ads_meta"], budgetMaxJod: 200 }, { ...base, cheapestPackageJod: 190 })!;
    expect(s.reasons).toContainEqual({ code: "budget_fit", priceJod: 190 });
    const over = scoreAgency({ services: ["ads_meta"], budgetMaxJod: 100 }, base)!;
    expect(over.reasons).toContainEqual({ code: "over_budget", priceJod: 300 });
  });

  it("shrinks small review counts toward the prior", () => {
    expect(bayesian(5, 1)).toBeLessThan(bayesian(4.8, 30));
    const few = scoreAgency({ services: ["ads_meta"] }, { ...base, ratingSum: 5, ratingCount: 1 })!;
    const many = scoreAgency({ services: ["ads_meta"] }, { ...base, ratingSum: 144, ratingCount: 30 })!;
    expect(many.relevance).toBeGreaterThan(few.relevance);
  });

  it("boosts paid plans only when already relevant, and labels them featured", () => {
    const need = { services: ["ads_meta"], city: "amman", budgetMaxJod: 400 };
    const paid = scoreAgency(need, { ...base, plan: "business", planActive: true })!;
    expect(paid.featured).toBe(true);
    expect(paid.score - paid.relevance).toBe(WEIGHTS.boost.business);
    const irrelevant = scoreAgency({ services: ["ads_meta", "seo", "web_design", "photography"], city: "irbid", budgetMaxJod: 50 }, { ...base, plan: "business", planActive: true })!;
    expect(irrelevant.relevance).toBeLessThan(WEIGHTS.boostMinRelevance);
    expect(irrelevant.featured).toBe(false);
    const expired = scoreAgency(need, { ...base, plan: "pro", planActive: false })!;
    expect(expired.featured).toBe(false);
  });
});

describe("rank", () => {
  it("orders by score, keeps relevance ahead of a paid boost, and is stable", () => {
    const great: AgencyFeatures = { ...base, id: "great", isVerified: true, servicePosts: 5, ratingSum: 96, ratingCount: 20 };
    const paidWeak: AgencyFeatures = { ...base, id: "paid", city: "zarqa", startingPriceJod: 900, plan: "pro", planActive: true };
    const result = rank({ services: ["ads_meta"], city: "amman", budgetMaxJod: 400 }, [paidWeak, great, { ...base, id: "b" }, { ...base, id: "c" }]);
    expect(result[0].agencyId).toBe("great");
    expect(result.map((r) => r.agencyId).slice(1, 3)).toEqual(["b", "c"]);
  });
});

describe("suggestBudget", () => {
  it("returns the interquartile range and median", () => {
    expect(suggestBudget([100, 200, 300, 400, 500])).toEqual({ min: 200, median: 300, max: 400, n: 5 });
    expect(suggestBudget([])).toBeNull();
  });
});
