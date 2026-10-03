import { count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ownerNeeds } from "@/lib/db/schema";
import type { OwnerNeedInput } from "@/lib/validation/owner-needs";

// Business owners' early registrations (docs/58-owner-early-registration.md):
// one row per client account, rewritten on edit; counts for the studio and admin.

export async function getOwnerNeed(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(ownerNeeds).where(eq(ownerNeeds.userId, userId)).limit(1);
  return row ?? null;
}

export async function saveOwnerNeed(userId: string, input: OwnerNeedInput, locale: string) {
  const db = await getDb();
  const values = {
    userId,
    country: input.country,
    city: input.city,
    businessType: input.businessType,
    services: input.services,
    timing: input.timing,
    whatsapp: input.whatsapp,
    note: input.note,
    locale: locale === "en" ? "en" : "ar",
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(ownerNeeds)
    .values(values)
    .onConflictDoUpdate({ target: ownerNeeds.userId, set: { ...values, userId: undefined } })
    .returning();
  return row;
}

export type OwnerNeedsStats = {
  total: number;
  byCountry: { key: string; n: number }[];
  byService: { key: string; n: number }[];
  byTiming: { key: string; n: number }[];
};

/** Registered owners so far: how many, where, what they need and when. Real rows only; no demo data exists for this table. */
export async function ownerNeedsStats(): Promise<OwnerNeedsStats> {
  const db = await getDb();
  const [[{ total }], byCountry, byService, byTiming] = await Promise.all([
    db.select({ total: count() }).from(ownerNeeds),
    db.select({ key: ownerNeeds.country, n: count() }).from(ownerNeeds).groupBy(ownerNeeds.country).orderBy(desc(count())),
    db
      .select({ key: sql<string>`s.key`, n: sql<number>`count(*)::int` })
      .from(sql`${ownerNeeds}, jsonb_array_elements_text(${ownerNeeds.services}) as s(key)`)
      .groupBy(sql`s.key`)
      .orderBy(sql`count(*) desc`),
    db.select({ key: ownerNeeds.timing, n: count() }).from(ownerNeeds).groupBy(ownerNeeds.timing).orderBy(desc(count())),
  ]);
  return { total: Number(total), byCountry: byCountry.map((r) => ({ key: r.key, n: Number(r.n) })), byService: byService.map((r) => ({ key: r.key, n: Number(r.n) })), byTiming: byTiming.map((r) => ({ key: r.key, n: Number(r.n) })) };
}

/** How many owners registered in one country (for a provider's studio). */
export async function ownerNeedsInCountry(country: string) {
  const db = await getDb();
  const [row] = await db.select({ n: count() }).from(ownerNeeds).where(eq(ownerNeeds.country, country));
  return Number(row?.n ?? 0);
}
