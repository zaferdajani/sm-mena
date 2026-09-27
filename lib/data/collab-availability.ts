import "server-only";
import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { availabilityWindows, type AvailabilityWindow } from "@/lib/db/schema";
import { availabilityFor, isFresh, type AvailabilityState, type Interval, type Window } from "@/lib/collab/availability";
import { rangeIn, addDays } from "@/lib/collab/time";
import { AVAILABILITY_FRESH_DAYS, type AvailabilityStatus, type Visibility } from "@/lib/collab/types";

// Manual availability (docs/48 §availability). Providers type date ranges in
// their own zone; readers get a state per period, never the note and never
// who a busy window is for. Nothing here syncs an external calendar.

export type WindowInput = { from: string; to: string; timezone: string; status: AvailabilityStatus; capacityUnits: number | null; capacityUnit: string | null; visibility: Visibility; note: string };

export async function listWindows(agencyId: string, now = new Date()): Promise<AvailabilityWindow[]> {
  const db = await getDb();
  return db
    .select()
    .from(availabilityWindows)
    .where(and(eq(availabilityWindows.agencyId, agencyId), gt(availabilityWindows.endsAt, addDays(now, -60))))
    .orderBy(asc(availabilityWindows.startsAt))
    .limit(200);
}

/** Adds a window; confirmation is now and it stays fresh for AVAILABILITY_FRESH_DAYS. */
export async function addWindow(agencyId: string, input: WindowInput, now = new Date()) {
  const { start, end } = rangeIn(input.from, input.to, input.timezone);
  const db = await getDb();
  const [row] = await db
    .insert(availabilityWindows)
    .values({
      agencyId,
      startsAt: start,
      endsAt: end,
      timezone: input.timezone,
      status: input.status,
      capacityUnits: input.capacityUnits,
      capacityUnit: input.capacityUnits === null ? null : input.capacityUnit,
      visibility: input.visibility,
      note: input.note,
      confirmedAt: now,
      expiresAt: addDays(now, AVAILABILITY_FRESH_DAYS),
    })
    .returning();
  return row;
}

export async function removeWindow(agencyId: string, id: string) {
  const db = await getDb();
  const rows = await db.delete(availabilityWindows).where(and(eq(availabilityWindows.id, id), eq(availabilityWindows.agencyId, agencyId))).returning({ id: availabilityWindows.id });
  return rows.length > 0;
}

/** "Still right": re-confirms every window that has not ended, so they read as fresh again. */
export async function reconfirmWindows(agencyId: string, now = new Date()) {
  const db = await getDb();
  const rows = await db
    .update(availabilityWindows)
    .set({ confirmedAt: now, expiresAt: addDays(now, AVAILABILITY_FRESH_DAYS) })
    .where(and(eq(availabilityWindows.agencyId, agencyId), gt(availabilityWindows.endsAt, now)))
    .returning({ id: availabilityWindows.id });
  return rows.length;
}

/**
 * Availability state of several providers for a period, as the viewer may
 * see it: private windows count for nobody but the owner, partner windows
 * for accepted partners, public ones for everyone. Busy stays busy even when
 * hidden? No: a hidden window is simply not there for this viewer, so the
 * answer is "unknown" rather than a leak of the provider's calendar.
 */
export async function availabilityStates(providerIds: string[], period: Interval | null, viewer: { partnerIds: Set<string> }, now = new Date()): Promise<Map<string, AvailabilityState>> {
  const out = new Map<string, AvailabilityState>();
  if (!providerIds.length) return out;
  const db = await getDb();
  const p = period ?? { start: now, end: addDays(now, 14) };
  const rows = await db
    .select()
    .from(availabilityWindows)
    .where(and(inArray(availabilityWindows.agencyId, providerIds), lt(availabilityWindows.startsAt, p.end), gt(availabilityWindows.endsAt, p.start)));
  const byAgency = new Map<string, AvailabilityWindow[]>();
  for (const w of rows) {
    const visible = w.visibility === "public" || (w.visibility === "partners" && viewer.partnerIds.has(w.agencyId));
    if (!visible) continue;
    byAgency.set(w.agencyId, [...(byAgency.get(w.agencyId) ?? []), w]);
  }
  for (const id of providerIds) out.set(id, availabilityFor((byAgency.get(id) ?? []) as Window[], p, now));
  return out;
}

/** The provider's own freshness summary for the studio. */
export function windowSummary(rows: AvailabilityWindow[], now = new Date()) {
  const upcoming = rows.filter((w) => w.endsAt > now);
  return { count: upcoming.length, stale: upcoming.filter((w) => !isFresh(w, now)).length };
}
