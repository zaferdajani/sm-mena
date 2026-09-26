import "server-only";
import { countryOfCity } from "@/lib/countries";
import { scopedCountry, scopedIncludeDemo } from "./scope";
import { and, arrayOverlaps, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, events, packages, posts } from "@/lib/db/schema";
import { toSummary, type AgencySummary } from "@/lib/data/agencies";
import { inCountry, realUnless } from "@/lib/data/agency-filters";
import { monetizationEnabled } from "@/lib/monetization/plans";
import { isServiceKey } from "@/lib/taxonomy";
import { MIN_PRICE_SAMPLE } from "@/lib/price-stats";
import type { Difference } from "./closeness";
import { rank, suggestBudget, type Need, type Reason } from "./score";

export type Match = AgencySummary & {
  score: number;
  featured: boolean;
  reasons: Reason[];
  bio: string;
  cheapestPackage: { title: string; priceJod: number; billing: "monthly" | "one_off" } | null;
  /** Set when nothing matched everything: how close this agency comes and what differs (docs/35). */
  closeness?: { percent: number; differences: Difference[] };
};

/** Loads candidates, scores them, and returns the best matches with display data. */
export async function findMatches(need: Need, limit = 8): Promise<Match[]> {
  const db = await getDb();
  const valid = need.services.filter(isServiceKey);
  const services = valid.length ? valid : null;
  // The visitor's chosen country wins; a city elsewhere never switches countries
  // silently (the matchmaker asks first), so it is dropped here.
  const country = need.country ?? scopedCountry() ?? countryOfCity(need.city) ?? null;
  const city = need.city && country && countryOfCity(need.city) !== country ? null : need.city;
  need = { ...need, services: valid, country, city };
  const candidates = await db
    .select()
    .from(agencies)
    .where(and(eq(agencies.status, "active"), services ? arrayOverlaps(agencies.services, services) : undefined, country ? inCountry(country) : undefined, realUnless(scopedIncludeDemo())));
  if (!candidates.length) return [];
  const ids = candidates.map((c) => c.id);

  const [postCounts, pkgRows] = await Promise.all([
    services
      ? db
          .select({ agencyId: posts.agencyId, n: sql<number>`count(*)::int` })
          .from(posts)
          .where(and(inArray(posts.agencyId, ids), eq(posts.status, "published"), arrayOverlaps(posts.services, services)))
          .groupBy(posts.agencyId)
      : db.select({ agencyId: posts.agencyId, n: sql<number>`count(*)::int` }).from(posts).where(and(inArray(posts.agencyId, ids), eq(posts.status, "published"))).groupBy(posts.agencyId),
    db
      .select()
      .from(packages)
      .where(services ? and(inArray(packages.agencyId, ids), inArray(packages.service, services)) : inArray(packages.agencyId, ids)),
  ]);
  const postsBy = new Map(postCounts.map((r) => [r.agencyId, r.n]));
  const cheapest = new Map<string, (typeof pkgRows)[number]>();
  for (const p of pkgRows) {
    const cur = cheapest.get(p.agencyId);
    if (!cur || p.priceJod < cur.priceJod) cheapest.set(p.agencyId, p);
  }
  const now = new Date();
  const ranked = rank(
    need,
    candidates.map((a) => {
      // An agency based in another country prices in its own currency: no budget comparison.
      const samePrices = !country || a.country === country;
      return {
        id: a.id,
        services: a.services,
        platforms: a.platforms,
        industries: a.industries,
        city: a.city,
        startingPriceJod: samePrices ? a.startingPriceJod : null,
        cheapestPackageJod: samePrices ? (cheapest.get(a.id)?.priceJod ?? null) : null,
        isVerified: a.isVerified,
        ratingSum: a.ratingSum,
        ratingCount: a.ratingCount,
        googleRating: a.googleRating,
        googleRatingCount: a.googleRatingCount,
        servicePosts: postsBy.get(a.id) ?? 0,
        plan: a.plan,
        // No paid priority while the platform is free for everyone.
        planActive: monetizationEnabled() && a.plan !== "free" && (!a.planExpiresAt || a.planExpiresAt > now),
      };
    }),
    limit,
  );
  const byId = new Map(candidates.map((a) => [a.id, a]));
  return ranked.map((r) => {
    const a = byId.get(r.agencyId)!;
    const pkg = cheapest.get(a.id);
    return {
      ...toSummary(a),
      score: r.score,
      featured: r.featured,
      reasons: r.reasons,
      bio: a.bio.slice(0, 240),
      cheapestPackage: pkg ? { title: pkg.title, priceJod: pkg.priceJod, billing: pkg.billing } : null,
    };
  });
}

/** Market price data for a service, used for budget estimates. */
export async function marketPrices(service: string, city?: string | null) {
  const db = await getDb();
  // Prices are per currency, so always within one country: the visitor's, else the city's.
  const country = scopedCountry() ?? countryOfCity(city) ?? "jo";
  if (city && countryOfCity(city) !== country) city = null;
  const starting = await db
    .select({ p: agencies.startingPriceJod })
    .from(agencies)
    .where(
      and(
        eq(agencies.status, "active"),
        sql`${service} = any(${agencies.services})`,
        city ? eq(agencies.city, city) : undefined,
        eq(agencies.country, country),
        eq(agencies.isDemo, false),
      ),
    );
  const pkgs = await db
    .select({ p: packages.priceJod })
    .from(packages)
    .innerJoin(agencies, eq(packages.agencyId, agencies.id))
    .where(and(eq(packages.service, service), eq(packages.billing, "monthly"), eq(agencies.status, "active"), eq(agencies.country, country), eq(agencies.isDemo, false)));
  const startingPrices = starting.map((r) => r.p).filter((p): p is number => p !== null);
  const packagePrices = pkgs.map((r) => r.p);
  // Real agencies only, and no range from fewer than MIN_PRICE_SAMPLE prices.
  const enough = (xs: number[]) => (xs.length >= MIN_PRICE_SAMPLE ? suggestBudget(xs) : null);
  return {
    agencies: starting.length,
    country,
    note: "Agency service fees only; advertising spend excluded. Real (non-demo) agencies only.",
    startingPrices: enough(startingPrices),
    packagePrices: enough(packagePrices),
    suggested: enough([...startingPrices, ...packagePrices]),
  };
}

/** Records that agencies were recommended to a visitor (shown in their insights). */
export async function recordRecommendations(agencyIds: string[], visitorId: string | null) {
  if (!agencyIds.length) return;
  const db = await getDb();
  await db.insert(events).values(agencyIds.map((agencyId) => ({ type: "recommended" as const, agencyId, visitorId })));
}
