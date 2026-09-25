import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { checkSplit, defaultCancellationSplit, isHeld } from "@/lib/contracts/rules";
import { getDb } from "@/lib/db";
import { cancellationProposals, contracts, milestones } from "@/lib/db/schema";
import { notifyContract } from "./contract-notify";
import { logEvent, type ContractView } from "./contracts";
import { isUniqueViolation, settleMilestone } from "./escrow";

// Mutual cancellation while money is held (docs/14): one side proposes how
// each held milestone is settled; the other accepts (money moves once, the
// rest of the contract is cancelled) or declines (either may then open a
// dispute). Nothing held → the plain cancel in lib/data/contracts.ts.

type Side = "agency" | "client";
type Result = { ok: true } | { error: string };
export type CancelSplit = { milestoneId: string; releaseFils: number; refundFils: number };

/** Checks a proposed split covers exactly the held milestones, each adding up to what is held. */
export function validateCancelSplits(v: Pick<ContractView, "milestones" | "heldBy">, splits: CancelSplit[]): string | null {
  const held = v.milestones.filter((m) => isHeld(m.status) && (v.heldBy[m.id] ?? 0) > 0);
  if (!held.length) return "nothingHeld";
  if (splits.length !== held.length || new Set(splits.map((s) => s.milestoneId)).size !== splits.length) return "split";
  for (const m of held) {
    const s = splits.find((x) => x.milestoneId === m.id);
    if (!s || checkSplit(s, v.heldBy[m.id] ?? 0)) return "split";
  }
  return null;
}

export async function proposeCancellation(v: ContractView, by: Side, note: string, splits?: CancelSplit[] | null): Promise<Result> {
  if (v.contract.status !== "active" || v.contract.paymentMode !== "protected") return { error: "locked" };
  const proposal = splits?.length ? splits : defaultCancellationSplit(v.milestones.map((m) => ({ ...m, amountFils: v.heldBy[m.id] ?? 0 })));
  const error = validateCancelSplits(v, proposal);
  if (error) return { error };
  const db = await getDb();
  try {
    await db.insert(cancellationProposals).values({ contractId: v.contract.id, proposedBy: by, note: note.trim().slice(0, 1000), splits: proposal });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "exists" };
    throw e;
  }
  await logEvent(v.contract.id, by, "cancel_proposed", note.trim().slice(0, 500) || null);
  await notifyContract(v.contract, "cancel_proposed", by === "agency" ? "client" : "agency");
  return { ok: true };
}

const pendingOf = (v: ContractView, id: string) => v.cancellations.find((p) => p.id === id && p.status === "pending") ?? null;

/** The side that did not propose accepts: each held milestone is settled as proposed and the contract ends. */
export async function acceptCancellation(v: ContractView, by: Side, proposalId: string): Promise<Result> {
  const p = pendingOf(v, proposalId);
  if (!p || p.proposedBy === by || v.contract.status !== "active") return { error: "locked" };
  // The held amounts may have changed since (a delivery approved meanwhile): re-check.
  if (validateCancelSplits(v, p.splits)) return { error: "stale" };
  const db = await getDb();
  const [claimed] = await db
    .update(cancellationProposals)
    .set({ status: "accepted", decidedAt: new Date() })
    .where(and(eq(cancellationProposals.id, p.id), eq(cancellationProposals.status, "pending")))
    .returning({ id: cancellationProposals.id });
  if (!claimed) return { error: "locked" };
  for (const s of p.splits) await settleMilestone(v.contract, s.milestoneId, { releaseFils: s.releaseFils, refundFils: s.refundFils }, { note: "mutual cancellation" });
  await db.update(milestones).set({ status: "cancelled" }).where(and(eq(milestones.contractId, v.contract.id), inArray(milestones.status, ["pending", "funded", "submitted", "changes_requested"])));
  await db.update(contracts).set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(and(eq(contracts.id, v.contract.id), eq(contracts.status, "active")));
  await logEvent(v.contract.id, by, "cancel_accepted", null);
  await notifyContract(v.contract, "cancel_accepted", by === "agency" ? "client" : "agency");
  return { ok: true };
}

export async function declineCancellation(v: ContractView, by: Side, proposalId: string): Promise<Result> {
  const p = pendingOf(v, proposalId);
  if (!p || p.proposedBy === by) return { error: "locked" };
  const db = await getDb();
  const [row] = await db
    .update(cancellationProposals)
    .set({ status: "declined", decidedAt: new Date() })
    .where(and(eq(cancellationProposals.id, p.id), eq(cancellationProposals.status, "pending")))
    .returning({ id: cancellationProposals.id });
  if (!row) return { error: "locked" };
  await logEvent(v.contract.id, by, "cancel_declined", null);
  await notifyContract(v.contract, "cancel_declined", by === "agency" ? "client" : "agency");
  return { ok: true };
}

export async function withdrawCancellation(v: ContractView, by: Side, proposalId: string): Promise<Result> {
  const p = pendingOf(v, proposalId);
  if (!p || p.proposedBy !== by) return { error: "locked" };
  const db = await getDb();
  await db.update(cancellationProposals).set({ status: "withdrawn", decidedAt: new Date() }).where(and(eq(cancellationProposals.id, p.id), eq(cancellationProposals.status, "pending")));
  await logEvent(v.contract.id, by, "cancel_withdrawn", null);
  return { ok: true };
}
