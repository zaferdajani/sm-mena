// Work-order rules (docs/49-work-orders.md): pure and unit tested. The
// workspace is a projection around the signed contract; these functions never
// decide money, only what the record says and who may see which part.
import { createHash } from "node:crypto";
import type { DeliverableLine } from "@/lib/db/schema";

export const WORK_ORDER_STATUSES = ["draft", "offered", "accepted", "in_progress", "submitted", "changes_requested", "approved", "closed", "declined", "withdrawn", "cancelled"] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];
export const OPEN_STATUSES: WorkOrderStatus[] = ["accepted", "in_progress", "submitted", "changes_requested"];
export const TERMINAL_STATUSES: WorkOrderStatus[] = ["approved", "closed", "declined", "withdrawn", "cancelled"];

export type VersionTerms = { deliverables: DeliverableLine[]; scope: string; revisionAllowance: number; dueOn: string | null; reviewDays: number; compensationNote: string; permissionScope: string };

/** Fingerprint of exactly what both sides accepted; stored on the version and checked when rendering. */
export function versionHash(workOrderId: string, version: number, t: VersionTerms) {
  const canonical = JSON.stringify({ workOrderId, version, deliverables: t.deliverables.map((d) => ({ key: d.key, quantity: d.quantity, platform: d.platform ?? null })), scope: t.scope, revisionAllowance: t.revisionAllowance, dueOn: t.dueOn, reviewDays: t.reviewDays, compensationNote: t.compensationNote, permissionScope: t.permissionScope });
  return createHash("sha256").update(canonical).digest("hex");
}

/** Which statuses each action may start from. Anything else is refused, and a retry of a done action is a no-op. */
export const TRANSITIONS: Record<string, WorkOrderStatus[]> = {
  offer: ["draft"],
  accept: ["offered"],
  decline: ["offered"],
  withdraw: ["draft", "offered"],
  start: ["accepted", "changes_requested"],
  submit: ["accepted", "in_progress", "changes_requested"],
  approve: ["submitted"],
  changes: ["submitted"],
  cancel: ["accepted", "in_progress", "changes_requested"],
  close: ["approved"],
};

export const canTransition = (action: keyof typeof TRANSITIONS, from: string) => (TRANSITIONS[action] as string[]).includes(from);

/** Who may perform what. The buyer offers, reviews and links; the supplier accepts and delivers; both may propose an amendment. */
export const ROLE_ACTIONS: Record<"buyer" | "supplier", (keyof typeof TRANSITIONS)[]> = {
  buyer: ["offer", "withdraw", "approve", "changes", "cancel", "close"],
  supplier: ["accept", "decline", "start", "submit", "cancel"],
};

export type PaymentStage = "agreement" | "funding" | "delivery" | "approval" | "payout" | "receipt";
export type PaymentProjection = {
  /** direct | protected | none (no linked contract) */
  mode: "direct" | "protected" | "none";
  live: boolean;
  stages: Record<PaymentStage, "done" | "pending" | "n/a">;
  /** A single honest sentence key for the UI. */
  headline: "no_contract" | "awaiting_signature" | "awaiting_funding" | "in_delivery" | "awaiting_review" | "approved_payout_initiated" | "approved_direct_pending" | "received" | "refunded" | "cancelled";
};

export type LinkedMilestone = { status: string; clientPaidDirect: boolean; agencyConfirmedPaid: boolean; releasedAt: Date | null };
export type LinkedContract = { status: string; paymentMode: "direct" | "protected"; paymentsLive: boolean; clientSignedAt: Date | null };

/**
 * What the money actually says, stage by stage, read from the authoritative
 * contract and milestone only. "Payout initiated" is never shown as received;
 * a direct payment is a recorded confirmation, not protection.
 */
export function paymentProjection(c: LinkedContract | null, m: LinkedMilestone | null, payoutInitiated: boolean): PaymentProjection {
  const na: PaymentProjection["stages"] = { agreement: "n/a", funding: "n/a", delivery: "n/a", approval: "n/a", payout: "n/a", receipt: "n/a" };
  if (!c) return { mode: "none", live: false, stages: na, headline: "no_contract" };
  const protectedMode = c.paymentMode === "protected";
  const signed = Boolean(c.clientSignedAt) && c.status !== "sent";
  const s: PaymentProjection["stages"] = { ...na, agreement: signed ? "done" : "pending" };
  if (c.status === "cancelled") return { mode: c.paymentMode, live: c.paymentsLive, stages: s, headline: "cancelled" };
  if (!m) return { mode: c.paymentMode, live: c.paymentsLive, stages: s, headline: signed ? "in_delivery" : "awaiting_signature" };
  const funded = ["funded", "submitted", "changes_requested", "approved", "released", "split"].includes(m.status);
  s.funding = protectedMode ? (funded ? "done" : "pending") : "n/a";
  s.delivery = ["submitted", "approved", "released", "split"].includes(m.status) ? "done" : "pending";
  s.approval = ["approved", "released", "split"].includes(m.status) ? "done" : "pending";
  if (protectedMode) {
    s.payout = m.status === "released" || m.status === "split" || payoutInitiated ? "done" : "pending";
    s.receipt = "pending"; // Sawwiq never marks a protected payout as received on its own.
  } else {
    s.payout = m.clientPaidDirect ? "done" : "pending";
    s.receipt = m.agencyConfirmedPaid ? "done" : "pending";
  }
  let headline: PaymentProjection["headline"] = "in_delivery";
  if (!signed) headline = "awaiting_signature";
  else if (m.status === "refunded") headline = "refunded";
  else if (protectedMode && !funded) headline = "awaiting_funding";
  else if (m.status === "submitted") headline = "awaiting_review";
  else if (s.approval === "done") headline = protectedMode ? "approved_payout_initiated" : m.agencyConfirmedPaid ? "received" : "approved_direct_pending";
  return { mode: c.paymentMode, live: c.paymentsLive, stages: s, headline };
}

export type Hold = { startsAt: Date; endsAt: Date; units: number; status: string };
export type CapacityWindow = { startsAt: Date; endsAt: Date; status: string; capacityUnits: number | null };

/**
 * Units still free for `interval`: the smallest declared capacity among the
 * available/limited windows that cover it, minus confirmed holds that
 * overlap. null = the provider declared no capacity there, so nothing can be
 * enforced (the UI says "capacity not declared", never "available").
 */
export function capacityLeft(windows: CapacityWindow[], holds: Hold[], interval: { start: Date; end: Date }): number | null {
  const covering = windows.filter((w) => w.status !== "busy" && w.capacityUnits !== null && w.startsAt <= interval.start && w.endsAt >= interval.end);
  if (!covering.length) return null;
  const declared = Math.min(...covering.map((w) => w.capacityUnits as number));
  const used = holds.filter((h) => h.status === "confirmed" && h.startsAt < interval.end && interval.start < h.endsAt).reduce((n, h) => n + h.units, 0);
  return Math.max(0, declared - used);
}

/** The supplier's projection of the workspace: no parent contract, no private notes. */
export const SUPPLIER_ORDER_FIELDS = ["id", "buyerAgencyId", "supplierAgencyId", "inquiryId", "contractId", "milestoneId", "mode", "title", "status", "currentVersion", "createdAt", "updatedAt"] as const;
