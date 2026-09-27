// Availability rules (docs/48-collaboration-v2.md §availability): pure, unit tested.
// A provider's windows say what they declared; nothing here reads a calendar.
import { AVAILABILITY_FRESH_DAYS, type AvailabilityStatus } from "./types";

export type Window = {
  startsAt: Date;
  endsAt: Date;
  status: AvailabilityStatus;
  confirmedAt: Date;
  expiresAt: Date;
  capacityUnits?: number | null;
  capacityUnit?: string | null;
};

export type Interval = { start: Date; end: Date };

/**
 * What a reader may conclude about a period:
 * confirmed   — a fresh window says available (or limited) for the whole period;
 * busy        — a fresh window says busy for some of it;
 * stale       — a window covers it but its confirmation is old or expired;
 * unknown     — the provider said nothing about it.
 * Unknown and stale are shown as "needs confirmation", never as ready.
 */
export type AvailabilityState = "confirmed" | "limited" | "busy" | "stale" | "unknown";

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

export function isFresh(w: Pick<Window, "confirmedAt" | "expiresAt">, now = new Date()) {
  return w.expiresAt > now && now.getTime() - w.confirmedAt.getTime() <= AVAILABILITY_FRESH_DAYS * 86_400_000;
}

export function availabilityFor(windows: Window[], period: Interval, now = new Date()): AvailabilityState {
  const hits = windows.filter((w) => overlaps({ start: w.startsAt, end: w.endsAt }, period));
  if (!hits.length) return "unknown";
  const fresh = hits.filter((w) => isFresh(w, now));
  if (!fresh.length) return "stale";
  if (fresh.some((w) => w.status === "busy")) return "busy";
  // Available/limited windows must cover the whole period; a gap is unknown.
  const covered = coverage(fresh.map((w) => ({ start: w.startsAt, end: w.endsAt })), period);
  if (!covered) return hits.length === fresh.length ? "unknown" : "stale";
  return fresh.some((w) => w.status === "limited") ? "limited" : "confirmed";
}

/** True when the union of `pieces` covers `period` without a gap. */
export function coverage(pieces: Interval[], period: Interval) {
  const sorted = [...pieces].sort((a, b) => a.start.getTime() - b.start.getTime());
  let cursor = period.start;
  for (const p of sorted) {
    if (p.start > cursor) break;
    if (p.end > cursor) cursor = p.end;
    if (cursor >= period.end) return true;
  }
  return cursor >= period.end;
}

/** The provider's own summary for the next weeks: what to fix first. */
export function freshnessOf(windows: Window[], now = new Date()): "none" | "fresh" | "stale" {
  if (!windows.length) return "none";
  return windows.some((w) => isFresh(w, now) && w.endsAt > now) ? "fresh" : "stale";
}

/** A public projection of a window: never the note, never who booked it. */
export function projectWindow(w: Window) {
  return { startsAt: w.startsAt, endsAt: w.endsAt, status: w.status, fresh: isFresh(w) };
}
