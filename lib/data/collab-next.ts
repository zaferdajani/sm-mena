import "server-only";
import { and, eq, gte, inArray, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, availabilityWindows, capacityReservations, collabFeedback, notifications, workInquiries, workInquiryRecipients, workOrderVersions, workOrders, type Agency } from "@/lib/db/schema";
import { freshnessOf } from "@/lib/collab/availability";
import { deliveryTime, remindable, sortActions, type NextAction, type NextActionKind } from "@/lib/collab/next-actions";
import { countryOf } from "@/lib/countries";
import { addNotifications, type NewNotification } from "./notifications";
import { getPrefs } from "./collab-prefs";

// Next actions (docs/50 §next actions, AC27): what waits on this agency,
// computed from the same rows the pages show, so the panel and the reminder
// job never disagree. Reminders carry a kind, a title and a link only.

const OPEN = ["accepted", "in_progress", "submitted", "changes_requested"];
const dayMs = 86_400_000;

async function actionsFor(agencyId: string, now: Date): Promise<NextAction[]> {
  const db = await getDb();
  const out: NextAction[] = [];
  const add = (kind: NextActionKind, id: string, href: string, title: string, due: Date | null) => out.push({ kind, id, href, title, due, overdue: Boolean(due && due < now) });
  const offered = await db.select({ id: workOrders.id, title: workOrders.title }).from(workOrders).where(and(eq(workOrders.supplierAgencyId, agencyId), eq(workOrders.status, "offered")));
  for (const o of offered) add("offer_to_answer", o.id, `/studio/collab/orders/${o.id}`, o.title, null);
  const submitted = await db.select({ id: workOrders.id, title: workOrders.title, at: workOrders.updatedAt, days: workOrderVersions.reviewDays }).from(workOrders).leftJoin(workOrderVersions, and(eq(workOrderVersions.workOrderId, workOrders.id), eq(workOrderVersions.status, "accepted"))).where(and(eq(workOrders.buyerAgencyId, agencyId), eq(workOrders.status, "submitted")));
  for (const o of submitted) add("submission_to_review", o.id, `/studio/collab/orders/${o.id}`, o.title, new Date(o.at.getTime() + (o.days ?? 7) * dayMs));
  const amendments = await db
    .select({ id: workOrders.id, title: workOrders.title, by: workOrderVersions.proposedBy, buyer: workOrders.buyerAgencyId })
    .from(workOrderVersions)
    .innerJoin(workOrders, eq(workOrders.id, workOrderVersions.workOrderId))
    .where(and(eq(workOrderVersions.status, "proposed"), inArray(workOrders.status, OPEN), or(eq(workOrders.buyerAgencyId, agencyId), eq(workOrders.supplierAgencyId, agencyId))));
  for (const a of amendments) if ((a.buyer === agencyId ? "buyer" : "supplier") !== a.by) add("amendment_to_answer", a.id, `/studio/collab/orders/${a.id}`, a.title, null);
  const asked = await db
    .select({ id: workInquiries.id, title: workInquiries.title, by: workInquiries.responseBy })
    .from(workInquiryRecipients)
    .innerJoin(workInquiries, eq(workInquiries.id, workInquiryRecipients.inquiryId))
    .where(and(eq(workInquiryRecipients.supplierAgencyId, agencyId), inArray(workInquiryRecipients.status, ["sent", "viewed"]), inArray(workInquiries.status, ["sent", "replied"]), or(isNull(workInquiries.responseBy), gte(workInquiries.responseBy, now))));
  for (const i of asked) add("inquiry_to_answer", i.id, `/studio/collab/work/${i.id}`, i.title, i.by);
  const replied = await db.select({ id: workInquiries.id, title: workInquiries.title, by: workInquiries.responseBy }).from(workInquiries).where(and(eq(workInquiries.buyerAgencyId, agencyId), eq(workInquiries.status, "replied")));
  for (const i of replied) add("quotes_to_compare", i.id, `/studio/collab/work/${i.id}`, i.title, i.by);
  const holds = await db
    .select({ id: workOrders.id, title: workOrders.title, at: capacityReservations.expiresAt })
    .from(capacityReservations)
    .innerJoin(workOrders, eq(workOrders.id, capacityReservations.workOrderId))
    .where(and(eq(workOrders.buyerAgencyId, agencyId), eq(workOrders.status, "offered"), eq(capacityReservations.status, "tentative"), lte(capacityReservations.expiresAt, new Date(now.getTime() + 2 * dayMs))));
  for (const h of holds) add("hold_expiring", h.id, `/studio/collab/orders/${h.id}`, h.title, h.at);
  const windows = await db.select().from(availabilityWindows).where(and(eq(availabilityWindows.agencyId, agencyId), gte(availabilityWindows.endsAt, now)));
  if (windows.length && freshnessOf(windows.map((w) => ({ ...w, status: w.status as "available" })), now) === "stale") add("availability_stale", agencyId, "/studio/collab/availability", "", null);
  const finished = await db
    .select({ id: workOrders.id, title: workOrders.title, at: workOrders.updatedAt })
    .from(workOrders)
    .where(and(inArray(workOrders.status, ["approved", "closed"]), gte(workOrders.updatedAt, new Date(now.getTime() - 30 * dayMs)), or(eq(workOrders.buyerAgencyId, agencyId), eq(workOrders.supplierAgencyId, agencyId)), notInArray(workOrders.id, db.select({ id: collabFeedback.workOrderId }).from(collabFeedback).where(eq(collabFeedback.authorAgencyId, agencyId)))));
  for (const f of finished) add("feedback_to_leave", f.id, `/studio/collab/orders/${f.id}#feedback`, f.title, null);
  return sortActions(out, now);
}

export async function nextActions(me: Pick<Agency, "id">, now = new Date()) {
  return actionsFor(me.id, now);
}

/** Agencies with anything open in collaboration right now (bounded: distinct ids from the open rows). */
async function activeAgencyIds(now: Date) {
  const db = await getDb();
  const a = await db.selectDistinct({ id: workOrders.supplierAgencyId }).from(workOrders).where(eq(workOrders.status, "offered"));
  const b = await db.selectDistinct({ id: workOrders.buyerAgencyId }).from(workOrders).where(inArray(workOrders.status, ["submitted", "offered"]));
  const c = await db.selectDistinct({ id: workInquiryRecipients.supplierAgencyId }).from(workInquiryRecipients).innerJoin(workInquiries, eq(workInquiries.id, workInquiryRecipients.inquiryId)).where(and(inArray(workInquiryRecipients.status, ["sent", "viewed"]), inArray(workInquiries.status, ["sent", "replied"]), or(isNull(workInquiries.responseBy), gte(workInquiries.responseBy, now))));
  const d = await db.selectDistinct({ id: workOrders.buyerAgencyId }).from(workOrders).innerJoin(workOrderVersions, and(eq(workOrderVersions.workOrderId, workOrders.id), eq(workOrderVersions.status, "proposed"))).where(inArray(workOrders.status, OPEN));
  const e = await db.selectDistinct({ id: workOrders.supplierAgencyId }).from(workOrders).innerJoin(workOrderVersions, and(eq(workOrderVersions.workOrderId, workOrders.id), eq(workOrderVersions.status, "proposed"))).where(inArray(workOrders.status, OPEN));
  const f = await db.selectDistinct({ id: availabilityWindows.agencyId }).from(availabilityWindows).where(and(gte(availabilityWindows.endsAt, now), lte(availabilityWindows.expiresAt, now)));
  // Bounded and ordered, so one slow day cannot starve the same agencies twice.
  return [...new Set([...a, ...b, ...c, ...d, ...e, ...f].map((r) => r.id))].sort().slice(0, 300);
}

/**
 * Daily reminders: one notification per open item per day, skipping muted
 * kinds, delivered after quiet hours in the agency's zone. Demo agencies get
 * none. Returns how many were written.
 */
export async function sendCollabReminders(now = new Date()) {
  const db = await getDb();
  const ids = await activeAgencyIds(now);
  if (!ids.length) return 0;
  const rows = await db.select({ id: agencies.id, country: agencies.country, isDemo: agencies.isDemo, status: agencies.status }).from(agencies).where(and(inArray(agencies.id, ids), eq(agencies.status, "active"), eq(agencies.isDemo, false)));
  let written = 0;
  for (const a of rows) {
    const prefs = await getPrefs(a.id);
    // Deduplicate against the delivery time, so a reminder deferred by quiet hours still counts for its own day only.
    const at = deliveryTime(now, countryOf(a.country).timeZones[0] ?? "Asia/Amman", prefs.quietStart, prefs.quietEnd);
    const [actions, recent] = await Promise.all([
      actionsFor(a.id, now),
      db.select({ kind: notifications.kind, href: notifications.href }).from(notifications).where(and(eq(notifications.agencyId, a.id), gte(notifications.createdAt, new Date(at.getTime() - dayMs + 3_600_000)), sql`${notifications.kind} like 'reminder_%'`)),
    ]);
    const due = remindable(actions, recent, prefs.mutedKinds);
    if (!due.length) continue;
    const batch: NewNotification[] = due.map((x) => ({ agencyId: a.id, kind: `reminder_${x.kind}` as NewNotification["kind"], href: x.href, params: { title: x.title }, createdAt: at }));
    await addNotifications(batch);
    written += batch.length;
  }
  return written;
}

