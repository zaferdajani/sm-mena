// Next actions and reminders (docs/50 §next actions): pure rules shared by the
// dashboard panel and the daily reminder job. Reminders are deduplicated per
// item and day, respect muted kinds and quiet hours, and never carry amounts,
// tokens or file previews: only a kind, a title and a link.
import { offsetMinutes } from "./time";

export const NEXT_ACTION_KINDS = ["offer_to_answer", "submission_to_review", "amendment_to_answer", "inquiry_to_answer", "quotes_to_compare", "hold_expiring", "availability_stale", "feedback_to_leave"] as const;
export type NextActionKind = (typeof NEXT_ACTION_KINDS)[number];

export type NextAction = { kind: NextActionKind; href: string; title: string; due: Date | null; overdue: boolean; id: string };

/** Which kinds a reminder notification may be sent for (the rest are dashboard-only). */
export const REMINDER_KINDS: NextActionKind[] = ["offer_to_answer", "submission_to_review", "amendment_to_answer", "inquiry_to_answer", "hold_expiring", "availability_stale"];

/** Local hour in the agency's zone, 0–23. */
export function localHour(now: Date, zone: string) {
  return Math.floor((((now.getTime() / 60000 + offsetMinutes(zone, now)) / 60) % 24 + 24) % 24);
}

/** Quiet hours may wrap midnight (22 → 7). Both null = no quiet hours. */
export function inQuietHours(hour: number, start: number | null, end: number | null) {
  if (start === null || end === null || start === end) return false;
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/** When a reminder due now should be delivered: now, or the end of quiet hours in the agency's zone. */
export function deliveryTime(now: Date, zone: string, start: number | null, end: number | null) {
  const hour = localHour(now, zone);
  if (!inQuietHours(hour, start, end) || end === null) return now;
  const hoursAhead = ((end - hour) % 24 + 24) % 24 || 24;
  const t = new Date(now);
  t.setUTCMinutes(0, 0, 0);
  t.setTime(t.getTime() + hoursAhead * 3_600_000);
  return t;
}

/** Sort: overdue first, then nearest due, then kind order. */
export function sortActions(actions: NextAction[], now = new Date()) {
  const order = new Map(NEXT_ACTION_KINDS.map((k, i) => [k, i]));
  return [...actions].sort((a, b) => {
    const ad = a.due ? a.due.getTime() - now.getTime() : Infinity;
    const bd = b.due ? b.due.getTime() - now.getTime() : Infinity;
    return ad - bd || (order.get(a.kind) ?? 99) - (order.get(b.kind) ?? 99);
  });
}

/** Keep only the actions whose (kind, href) has no reminder in the last day and whose kind is not muted. */
export function remindable(actions: NextAction[], recent: { kind: string; href: string }[], muted: string[]) {
  const seen = new Set(recent.map((r) => `${r.kind}|${r.href}`));
  return actions.filter((a) => REMINDER_KINDS.includes(a.kind) && !muted.includes(a.kind) && !seen.has(`reminder_${a.kind}|${a.href}`));
}
