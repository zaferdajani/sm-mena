import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { toSummary, type AgencySummary } from "@/lib/data/agencies";

// The Sawwiq 50 (marketing/05): the people behind the most pages in a country,
// ranked by client-confirmed accounts, then verified reviews, then work posted.
// Real agencies only; the list is computed live, never edited by hand.

export type TopRow = { rank: number; agency: AgencySummary; memberNo: number | null; confirmed: number; reviews: number; posts: number };

export async function topAgencies(country: string, limit = 50): Promise<TopRow[]> {
  const db = await getDb();
  // Aliased so the driver maps it back by name (an unnamed expression comes back null).
  // Written with explicit identifiers: the query builder's column references inside a correlated subquery
  // don't resolve against the outer table.
  const confirmed = sql<number>`(select count(*) from portfolio_clients p where p.agency_id = agencies.id and p.confirmed_at is not null)`.mapWith(Number).as("confirmed_n");
  const rows = await db
    .select({ agency: agencies, confirmed })
    .from(agencies)
    .where(and(eq(agencies.status, "active"), eq(agencies.isDemo, false), eq(agencies.country, country), isNotNull(agencies.memberNo)))
    .orderBy(desc(confirmed), desc(agencies.ratingCount), desc(agencies.postCount), agencies.memberNo)
    .limit(limit);
  return rows.map((r, i) => ({ rank: i + 1, agency: toSummary(r.agency), memberNo: r.agency.memberNo, confirmed: Number(r.confirmed), reviews: r.agency.ratingCount, posts: r.agency.postCount }));
}
