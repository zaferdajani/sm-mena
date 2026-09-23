import "server-only";
import { and, arrayOverlaps, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, events, packages, posts } from "@/lib/db/schema";
import { toSummary, type AgencySummary } from "@/lib/data/agencies";
import { monetizationEnabled } from "@/lib/monetization/plans";
import { isServiceKey } from "@/lib/taxonomy";
import { rank, suggestBudget, type Need, type Reason } from "./score";

export type Match = AgencySummary & {
  score: number;
  featured: boolean;
  reasons: Reason[];
  bio: string;
  cheapestPackage: { title: string; priceJod: number; billing: "monthly" | "one_off" } | null;
};

/** Loads candidates, scores them, and returns the best matches with display data. */
export async function findMatches(need: Need, limit = 8): Promise<Match[]> {
  const db = await getDb();
  const valid = need.services.filter(isServiceKey);
  const services = valid.length ? valid : null;
  need = { ...need, services: valid };
  const candidates = await db
    .select()
    .from(agencies)
    .where(and(eq(agencies.status, "active"), services ? arrayOverlaps(agencies.services, services) : undefined));
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
    candidates.map((a) => ({
      id: a.id,
      services: a.services,
      platforms: a.platforms,
      industries: a.industries,
      city: a.city,
      startingPriceJod: a.startingPriceJod,
      cheapestPackageJod: cheapest.get(a.id)?.priceJod ?? null,
      isVerified: a.isVerified,
      ratingSum: a.ratingSum,
      ratingCount: a.ratingCount,
      googleRating: a.googleRating,
      googleRatingCount: a.googleRatingCount,
      servicePosts: postsBy.get(a.id) ?? 0,
      plan: a.plan,
      // No paid priority while the platform is free for everyone.
      planActive: monetizationEnabled() && a.plan !== "free" && (!a.planExpiresAt || a.planExpiresAt > now),
    })),
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
  const starting = await db
    .select({ p: agencies.startingPriceJod })
    .from(agencies)
    .where(and(eq(agencies.status, "active"), sql`${service} = any(${agencies.services})`, city ? eq(agencies.city, city) : undefined));
  const pkgs = await db
    .select({ p: packages.priceJod })
    .from(packages)
    .innerJoin(agencies, eq(packages.agencyId, agencies.id))
    .where(and(eq(packages.service, service), eq(packages.billing, "monthly"), eq(agencies.status, "active")));
  const startingPrices = starting.map((r) => r.p).filter((p): p is number => p !== null);
  const packagePrices = pkgs.map((r) => r.p);
  return {
    agencies: starting.length,
    startingPrices: suggestBudget(startingPrices),
    packagePrices: suggestBudget(packagePrices),
    suggested: suggestBudget([...startingPrices, ...packagePrices]),
  };
}

/** Records that agencies were recommended to a visitor (shown in their insights). */
export async function recordRecommendations(agencyIds: string[], visitorId: string | null) {
  if (!agencyIds.length) return;
  const db = await getDb();
  await db.insert(events).values(agencyIds.map((agencyId) => ({ type: "recommended" as const, agencyId, visitorId })));
}
