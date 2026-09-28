import "server-only";
import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { getDb, type DB } from "@/lib/db";
import { availabilityWindows, capacityReservations } from "@/lib/db/schema";
import { capacityLeft } from "@/lib/collab/work-orders";
import { addDays } from "@/lib/collab/time";

// Capacity holds (docs/49 §capacity). A tentative hold is made when a work
// order is offered; confirming it happens inside the acceptance transaction
// under a per-provider advisory lock, so two acceptances cannot both fit into
// the last declared unit. Expired tentative holds free themselves.

type Tx = Pick<DB, "select" | "insert" | "update" | "delete" | "execute">;
export const HOLD_DAYS = 7;

export type CapacityCheck = { declared: number | null; left: number | null; ok: boolean };

/** What is free for `interval`, as the provider declared it (null = not declared). */
export async function capacityFor(tx: Tx, providerId: string, interval: { start: Date; end: Date }, excludeWorkOrderId?: string): Promise<CapacityCheck> {
  const windows = await tx.select().from(availabilityWindows).where(and(eq(availabilityWindows.agencyId, providerId), lt(availabilityWindows.startsAt, interval.end), gt(availabilityWindows.endsAt, interval.start)));
  const holds = await tx
    .select()
    .from(capacityReservations)
    .where(and(eq(capacityReservations.providerAgencyId, providerId), eq(capacityReservations.status, "confirmed"), lt(capacityReservations.startsAt, interval.end), gt(capacityReservations.endsAt, interval.start)));
  const left = capacityLeft(windows, holds.filter((h) => h.workOrderId !== excludeWorkOrderId), interval);
  const declared = left === null ? null : Math.min(...windows.filter((w) => w.status !== "busy" && w.capacityUnits !== null && w.startsAt <= interval.start && w.endsAt >= interval.end).map((w) => w.capacityUnits as number));
  return { declared, left, ok: left === null || left > 0 };
}

/** A tentative hold for an offered work order (one live hold per work order). Returns the row, or null when nothing to hold. */
export async function holdTentative(tx: Tx, providerId: string, workOrderId: string, interval: { start: Date; end: Date } | null, units = 1, now = new Date()) {
  if (!interval) return null;
  await tx.update(capacityReservations).set({ status: "released", updatedAt: now }).where(and(eq(capacityReservations.workOrderId, workOrderId), inArray(capacityReservations.status, ["tentative", "confirmed"])));
  const [row] = await tx
    .insert(capacityReservations)
    .values({ providerAgencyId: providerId, workOrderId, startsAt: interval.start, endsAt: interval.end, units, status: "tentative", expiresAt: addDays(now, HOLD_DAYS) })
    .returning();
  return row;
}

/**
 * Confirms the hold for a work order inside the caller's transaction. Takes a
 * per-provider transaction lock first, then re-reads declared capacity and
 * confirmed holds, so concurrent acceptances serialise and the check is
 * against the latest state. A hold already confirmed returns ok (retry-safe).
 */
export async function confirmHold(tx: Tx, providerId: string, workOrderId: string, interval: { start: Date; end: Date } | null, units = 1, now = new Date()): Promise<{ ok: true; left: number | null } | { ok: false; reason: "no_capacity" }> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${providerId}))`);
  const live = await tx.select().from(capacityReservations).where(and(eq(capacityReservations.workOrderId, workOrderId), inArray(capacityReservations.status, ["tentative", "confirmed"])));
  let hold: (typeof live)[number] | undefined = live[0];
  if (hold && hold.status === "tentative" && hold.expiresAt && hold.expiresAt <= now) {
    // The cron has not run yet: an expired hold counts for nothing, so the acceptance is checked afresh below.
    await tx.update(capacityReservations).set({ status: "expired", updatedAt: now }).where(eq(capacityReservations.id, hold.id));
    hold = undefined;
  }
  if (!hold) {
    // No live hold (none was needed, or it expired): check the declared capacity now and confirm directly.
    if (!interval) return { ok: true, left: null };
    const check = await capacityFor(tx, providerId, interval, workOrderId);
    if (check.left !== null && check.left < units) return { ok: false, reason: "no_capacity" };
    await tx.insert(capacityReservations).values({ providerAgencyId: providerId, workOrderId, startsAt: interval.start, endsAt: interval.end, units, status: "confirmed", expiresAt: null });
    return { ok: true, left: check.left === null ? null : check.left - units };
  }
  if (hold.status === "confirmed") return { ok: true, left: null };
  const check = await capacityFor(tx, providerId, { start: hold.startsAt, end: hold.endsAt }, workOrderId);
  if (check.left !== null && check.left < units) return { ok: false, reason: "no_capacity" };
  await tx.update(capacityReservations).set({ status: "confirmed", expiresAt: null, version: sql`${capacityReservations.version} + 1`, updatedAt: now }).where(and(eq(capacityReservations.id, hold.id), eq(capacityReservations.status, "tentative")));
  return { ok: true, left: check.left === null ? null : check.left - units };
}

export async function releaseHold(tx: Tx, workOrderId: string, now = new Date()) {
  await tx.update(capacityReservations).set({ status: "released", updatedAt: now }).where(and(eq(capacityReservations.workOrderId, workOrderId), inArray(capacityReservations.status, ["tentative", "confirmed"])));
}

/** Daily job: tentative holds past their date stop counting. */
export async function expireHolds(now = new Date()) {
  const db = await getDb();
  const rows = await db.update(capacityReservations).set({ status: "expired", updatedAt: now }).where(and(eq(capacityReservations.status, "tentative"), sql`${capacityReservations.expiresAt} <= ${now}`)).returning({ id: capacityReservations.id });
  return rows.length;
}

export async function holdFor(workOrderId: string) {
  const db = await getDb();
  const [row] = await db.select().from(capacityReservations).where(and(eq(capacityReservations.workOrderId, workOrderId), inArray(capacityReservations.status, ["tentative", "confirmed"])));
  return row ?? null;
}
