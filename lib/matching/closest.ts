import "server-only";
import { and, arrayOverlaps, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, packages } from "@/lib/db/schema";
import { toSummary, type AgencySummary } from "@/lib/data/agencies";
import { inCountry, realUnless } from "@/lib/data/agency-filters";
import { tagInfo } from "@/lib/services/catalog";
import { allServices } from "@/lib/taxonomy";
import { closeness, type Closeness, type Requirements } from "./closeness";
import type { Match } from "./index";

export type CloseMatch = AgencySummary & Closeness & { bio: string };

/** Below this, an agency isn't close enough to suggest. */
const MIN_PERCENT = 30;

/** The services asked for plus their siblings in the same category (for "offers something similar"). */
function widen(services: string[]) {
  const cats = new Set(services.map((s) => allServices.find((x) => x.key === (tagInfo(s)?.parent ?? s))?.category).filter(Boolean));
  return [...new Set([...services, ...allServices.filter((s) => cats.has(s.category)).map((s) => s.key)])];
}

/**
 * When a search finds nothing: the agencies that meet most of what was asked,
 * best first, each with its match percentage and the differences
 * (docs/35-closest-matches.md). Candidates are agencies listed in the
 * visitor's country, plus agencies elsewhere that offer a requested or
 * similar service. Real agencies only unless the demo view is on.
 */
export async function closestAgencies(req: Requirements, { includeDemo = false, limit = 6 } = {}): Promise<CloseMatch[]> {
  const db = await getDb();
  const services = req.services?.length ? widen(req.services) : null;
  const rows = await db
    .select()
    .from(agencies)
    .where(and(eq(agencies.status, "active"), realUnless(includeDemo), services ? or(inCountry(req.country), arrayOverlaps(agencies.services, services)) : inCountry(req.country)))
    .orderBy(desc(agencies.isVerified), desc(agencies.postCount))
    .limit(400);
  if (!rows.length) return [];
  const prices = await db
    .select({ agencyId: packages.agencyId, min: sql<number>`min(${packages.priceJod})::int`, max: sql<number>`max(${packages.priceJod})::int` })
    .from(packages)
    .where(inArray(packages.agencyId, rows.map((r) => r.id)))
    .groupBy(packages.agencyId);
  const byAgency = new Map(prices.map((p) => [p.agencyId, p]));
  return rows
    .map((a) => {
      const p = byAgency.get(a.id);
      const lowest = [a.startingPriceJod, p?.min ?? null].filter((x): x is number => x !== null && x > 0);
      const c = closeness(req, {
        services: a.services,
        platforms: a.platforms,
        industries: a.industries,
        city: a.city,
        country: a.country,
        servesCountries: a.servesCountries,
        priceJod: lowest.length ? Math.min(...lowest) : null,
        maxPackageJod: p?.max ?? null,
        isVerified: a.isVerified,
      });
      return { ...toSummary(a), ...c, bio: a.bio.slice(0, 240) };
    })
    .filter((m) => m.percent >= MIN_PERCENT)
    .sort((x, y) => y.percent - x.percent || Number(y.isVerified) - Number(x.isVerified) || y.postCount - x.postCount)
    .slice(0, limit);
}

/** The closest agencies in the matchmaker's card format (score = match percentage). */
export async function closestAsMatches(req: Requirements, options: { includeDemo?: boolean; limit?: number } = {}): Promise<Match[]> {
  const found = await closestAgencies(req, { limit: 5, ...options });
  return found.map(({ percent, differences, ...a }) => ({ ...a, score: percent, featured: false, reasons: [], cheapestPackage: null, closeness: { percent, differences } }));
}
