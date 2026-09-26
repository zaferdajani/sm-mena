import "server-only";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { summariseProviders } from "@/lib/teaser";

/**
 * Give every real provider without a founding seat the next numbers, in the
 * order they joined (docs/39). A seat is stored, so it never changes or
 * returns to the pool, even if an earlier provider leaves. Demo agencies never
 * get one. Safe to call often: a provider numbered by a racing call keeps that
 * number (at worst a number is skipped, never given twice).
 */
export async function assignFoundingSeats() {
  const db = await getDb();
  try {
    // nextval walks the providers in join order; the sequence never goes back.
    // MATERIALIZED runs the numbering once: as a plain subquery the planner may
    // rescan it per row, and every rescan would burn more numbers.
    await db.execute(sql`
      WITH s AS MATERIALIZED (
        SELECT q.id, nextval('founding_seat_seq') AS n
        FROM (SELECT id FROM ${agencies} WHERE founding_seat IS NULL AND is_demo = false ORDER BY created_at, id) q
      )
      UPDATE ${agencies} a SET founding_seat = s.n
      FROM s
      WHERE a.id = s.id AND a.founding_seat IS NULL`);
  } catch {}
}

/** Live counts for the teaser page: real, active providers only (never demo agencies). */
export async function teaserStats() {
  await assignFoundingSeats();
  const db = await getDb();
  const [rows, last] = await Promise.all([
    db
      .select({ country: agencies.country, city: agencies.city, kind: agencies.kind })
      .from(agencies)
      .where(and(eq(agencies.status, "active"), eq(agencies.isDemo, false))),
    db.execute(sql`SELECT last_value AS seat FROM founding_seat_seq WHERE is_called`) as Promise<unknown>,
  ]);
  // PGlite returns { rows }, postgres-js the rows themselves.
  const seqRows = (Array.isArray(last) ? last : (last as { rows: unknown[] }).rows) as { seat: string | number }[];
  return { ...summariseProviders(rows), nextSeat: Number(seqRows[0]?.seat ?? 0) + 1 };
}

/** An agency's founding seat, and its place among providers in its city. */
export async function seatOf(agency: { id: string; city: string; isDemo: boolean; foundingSeat: number | null }) {
  if (agency.isDemo) return null;
  let seat = agency.foundingSeat;
  if (seat == null) {
    await assignFoundingSeats();
    const db = await getDb();
    [{ seat }] = await db.select({ seat: agencies.foundingSeat }).from(agencies).where(eq(agencies.id, agency.id));
  }
  if (seat == null) return null;
  const db = await getDb();
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(agencies)
    .where(and(eq(agencies.city, agency.city), eq(agencies.isDemo, false), isNotNull(agencies.foundingSeat), lte(agencies.foundingSeat, seat)));
  return { seat, citySeat: n };
}
