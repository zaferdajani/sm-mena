import "server-only";
import { and, eq, gte, inArray, lt, ne, notInArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, escrowLedger, milestones, users, workInquiries, workInquiryRecipients, workOrderSubmissions, workOrders } from "@/lib/db/schema";
import { STAFF_ROLES } from "@/lib/auth/permissions";

// Collaboration funnel and cohorts (docs/50 §metrics, AC28): derived from the
// source rows, never from a separate event stream, so a retry or a re-render
// cannot inflate a step. Demo agencies and agencies owned by staff are left
// out. Every rate carries its denominator and observation window; "payout
// initiated" and "received" are separate steps; direct confirmations are
// labelled as such. Nothing here identifies an agency.

export type FunnelStep = { key: string; n: number };
export type CollabMetrics = {
  days: number;
  excluded: { demo: number; staff: number };
  funnel: FunnelStep[];
  repeat: { cohort: number; repeated: number; rate: number | null; windowDays: number; note: "ok" | "no_full_window" };
  payment: { protected: { n: number; medianDays: number | null }; direct: { n: number; medianDays: number | null } };
};

const dayMs = 86_400_000;
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)] : null);

export async function collabMetrics(days: number, now = new Date()): Promise<CollabMetrics> {
  const db = await getDb();
  const since = new Date(now.getTime() - days * dayMs);
  const staffUsers = db.select({ id: users.id }).from(users).where(inArray(users.role, [...STAFF_ROLES]));
  const excludedRows = await db.select({ id: agencies.id, isDemo: agencies.isDemo }).from(agencies).where(sql`${agencies.isDemo} = true or ${agencies.ownerUserId} in (${staffUsers})`);
  const excluded = excludedRows.map((r) => r.id);
  const excludedDemo = excludedRows.filter((r) => r.isDemo).length;
  const real = (col: typeof workInquiries.buyerAgencyId | typeof workOrders.buyerAgencyId | typeof workOrders.supplierAgencyId | typeof workInquiryRecipients.supplierAgencyId) => (excluded.length ? notInArray(col, excluded) : sql`true`);

  const inquiries = await db.select({ id: workInquiries.id, status: workInquiries.status, accepted: workInquiries.acceptedQuoteId, request: workInquiries.contractRequestId }).from(workInquiries).where(and(gte(workInquiries.createdAt, since), real(workInquiries.buyerAgencyId)));
  const ids = inquiries.map((i) => i.id);
  const replied = ids.length ? await db.selectDistinct({ id: workInquiryRecipients.inquiryId }).from(workInquiryRecipients).where(and(inArray(workInquiryRecipients.inquiryId, ids), inArray(workInquiryRecipients.status, ["quoted", "accepted", "passed"]), real(workInquiryRecipients.supplierAgencyId))) : [];
  const orders = await db.select({ id: workOrders.id, buyer: workOrders.buyerAgencyId, supplier: workOrders.supplierAgencyId, status: workOrders.status, milestoneId: workOrders.milestoneId, updatedAt: workOrders.updatedAt, createdAt: workOrders.createdAt }).from(workOrders).where(and(gte(workOrders.createdAt, since), real(workOrders.buyerAgencyId), real(workOrders.supplierAgencyId)));
  const orderIds = orders.map((o) => o.id);
  const delivered = orderIds.length ? await db.selectDistinct({ id: workOrderSubmissions.workOrderId }).from(workOrderSubmissions).where(inArray(workOrderSubmissions.workOrderId, orderIds)) : [];
  const approved = orders.filter((o) => ["approved", "closed"].includes(o.status));
  const msIds = approved.map((o) => o.milestoneId).filter((m): m is string => Boolean(m));
  const ms = msIds.length ? await db.select({ id: milestones.id, approvedAt: milestones.approvedAt, direct: milestones.agencyConfirmedPaid, status: milestones.status }).from(milestones).where(inArray(milestones.id, msIds)) : [];
  const releases = msIds.length ? await db.select({ milestoneId: escrowLedger.milestoneId, at: escrowLedger.createdAt }).from(escrowLedger).where(and(inArray(escrowLedger.milestoneId, msIds), eq(escrowLedger.type, "release"), ne(escrowLedger.status, "failed"))) : [];
  const releaseAt = new Map<string, Date>();
  for (const r of releases) if (r.milestoneId && !releaseAt.has(r.milestoneId)) releaseAt.set(r.milestoneId, r.at);
  const protectedDelays: number[] = [];
  const directConfirmed = ms.filter((m) => m.direct && !releaseAt.has(m.id)).length;
  for (const m of ms) {
    if (!m.approvedAt) continue;
    const rel = releaseAt.get(m.id);
    if (rel) protectedDelays.push(Math.max(0, (rel.getTime() - m.approvedAt.getTime()) / dayMs));
    // A direct confirmation has no timestamp of its own in the milestone row, so its delay is not measured (n only).

  }
  // Repeat engagement: the same buyer accepts a second work order with the same supplier within 30 days of the first.
  const accepted = orders.filter((o) => !["draft", "offered", "declined", "withdrawn"].includes(o.status));
  const firstByPair = new Map<string, Date>();
  const allAccepted = await db.select({ buyer: workOrders.buyerAgencyId, supplier: workOrders.supplierAgencyId, at: workOrders.createdAt }).from(workOrders).where(and(notInArray(workOrders.status, ["draft", "offered", "declined", "withdrawn"]), real(workOrders.buyerAgencyId), real(workOrders.supplierAgencyId), lt(workOrders.createdAt, now)));
  for (const o of allAccepted) { const k = `${o.buyer}|${o.supplier}`; if (!firstByPair.has(k) || firstByPair.get(k)! > o.at) firstByPair.set(k, o.at); }
  const cutoff = new Date(now.getTime() - 30 * dayMs);
  const cohortPairs = [...firstByPair.entries()].filter(([, at]) => at >= since && at <= cutoff);
  let repeated = 0;
  for (const [k, first] of cohortPairs) if (allAccepted.some((o) => `${o.buyer}|${o.supplier}` === k && o.at > first && o.at.getTime() - first.getTime() <= 30 * dayMs)) repeated++;
  const repeatCandidates = [...firstByPair.entries()].filter(([, at]) => at >= since).length;
  return {
    days,
    excluded: { demo: excludedDemo, staff: excludedRows.length - excludedDemo },
    funnel: [
      { key: "inquiry_created", n: inquiries.length },
      { key: "inquiry_sent", n: inquiries.filter((i) => i.status !== "draft").length },
      { key: "reply", n: replied.length },
      { key: "quote_accepted", n: inquiries.filter((i) => i.accepted).length },
      { key: "contract_requested", n: inquiries.filter((i) => i.request).length },
      { key: "work_accepted", n: accepted.length },
      { key: "delivered", n: delivered.length },
      { key: "approved", n: approved.length },
      { key: "payout_initiated", n: releaseAt.size },
      { key: "direct_confirmed", n: ms.filter((m) => m.direct && !releaseAt.has(m.id)).length },
      { key: "repeat_engagement", n: repeated },
    ],
    repeat: { cohort: cohortPairs.length, repeated, rate: cohortPairs.length ? Math.round((repeated / cohortPairs.length) * 1000) / 10 : null, windowDays: 30, note: cohortPairs.length || !repeatCandidates ? "ok" : "no_full_window" },
    payment: { protected: { n: protectedDelays.length, medianDays: median(protectedDelays) === null ? null : Math.round(median(protectedDelays)! * 10) / 10 }, direct: { n: directConfirmed, medianDays: null } },
  };
}

