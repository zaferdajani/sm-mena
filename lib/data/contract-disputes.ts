import "server-only";
import { and, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { appealDeadline, canAppeal, checkSplit, cleanLinks, decisionFinal, isHeld, splitKind, type Split } from "@/lib/contracts/rules";
import { getDb } from "@/lib/db";
import { contracts, disputeEvidence, milestoneDisputes, type MilestoneDispute } from "@/lib/db/schema";
import { notifyContract } from "./contract-notify";
import { completeIfDone, getContractById, logEvent, reopenIfNoDisputes, type ContractView } from "./contracts";
import { isUniqueViolation, settleMilestone } from "./escrow";

// Milestone disputes (docs/14): a statement, evidence from both sides, an
// admin decision (release, refund or split) with written reasons, one appeal
// within 7 days, then a final decision. Money moves only on a final decision,
// through settleMilestone (guarded, idempotent, fee only on the paid part).

type Side = "agency" | "client";
type Result = { ok: true } | { error: string };

const OPEN = ["open", "decided", "appealed"] as const;

/** Either side: open a dispute on one milestone whose money is held. */
export async function openMilestoneDispute(v: ContractView, by: Side, milestoneId: string, statement: string): Promise<Result> {
  if (!["active", "disputed"].includes(v.contract.status) || v.contract.paymentMode !== "protected") return { error: "locked" };
  const text = statement.trim().slice(0, 4000);
  if (text.length < 5) return { error: "note" };
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || !isHeld(m.status) || (v.heldBy[m.id] ?? 0) <= 0) return { error: "notHeld" };
  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(milestoneDisputes).values({ contractId: v.contract.id, milestoneId, openedBy: by, statement: text });
      await tx.update(contracts).set({ status: "disputed", updatedAt: new Date() }).where(and(eq(contracts.id, v.contract.id), eq(contracts.status, "active")));
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "exists" };
    throw e;
  }
  await logEvent(v.contract.id, by, "dispute", `${m.title}: ${text}`);
  await notifyContract(v.contract, "dispute_opened", by === "agency" ? "client" : "agency", { milestone: m.title });
  return { ok: true };
}

const disputeOf = (v: ContractView, id: string) => v.disputes.find((d) => d.id === id) ?? null;
const titleOf = (v: ContractView, d: MilestoneDispute) => v.milestones.find((m) => m.id === d.milestoneId)?.title ?? "";

/** Either side (or an admin): add a statement and links while the dispute is not final. */
export async function addEvidence(v: ContractView, side: Side | "admin", disputeId: string, body: string, links: string | string[] = []): Promise<Result> {
  const d = disputeOf(v, disputeId);
  if (!d || !(OPEN as readonly string[]).includes(d.status)) return { error: "locked" };
  const text = body.trim().slice(0, 4000);
  if (text.length < 3) return { error: "note" };
  const db = await getDb();
  const count = await db.select({ n: sql<number>`count(*)::int` }).from(disputeEvidence).where(and(eq(disputeEvidence.disputeId, d.id), eq(disputeEvidence.side, side)));
  if ((count[0]?.n ?? 0) >= 30) return { error: "tooMany" };
  await db.insert(disputeEvidence).values({ disputeId: d.id, side, body: text, links: cleanLinks(links) });
  await logEvent(v.contract.id, side, "evidence", titleOf(v, d));
  if (side !== "admin") await notifyContract(v.contract, "dispute_evidence", side === "agency" ? "client" : "agency", { milestone: titleOf(v, d) });
  return { ok: true };
}

export type Decision = Split & { reason: string };

/**
 * Admin: decide a dispute. On an open dispute this is the first decision:
 * nothing moves yet, and either side may appeal once within 7 days. On an
 * appealed dispute it is final and the money moves now.
 */
export async function decideDispute(adminId: string, disputeId: string, d: Decision): Promise<Result> {
  const db = await getDb();
  const [row] = await db.select().from(milestoneDisputes).where(eq(milestoneDisputes.id, disputeId));
  if (!row) return { error: "notFound" };
  if (row.status !== "open" && row.status !== "appealed") return { error: "locked" };
  const v = await getContractById(row.contractId);
  if (!v) return { error: "notFound" };
  const reason = d.reason.trim().slice(0, 4000);
  if (reason.length < 10) return { error: "reason" };
  const held = v.heldBy[row.milestoneId] ?? 0;
  if (checkSplit(d, held)) return { error: "sum" };
  const decision = splitKind(d);
  const now = new Date();
  const title = v.milestones.find((m) => m.id === row.milestoneId)?.title ?? "";
  if (row.status === "open") {
    const [done] = await db
      .update(milestoneDisputes)
      .set({ status: "decided", decision, releaseFils: d.releaseFils, refundFils: d.refundFils, reason, decidedBy: adminId, decidedAt: now, appealDeadline: appealDeadline(now), updatedAt: now })
      .where(and(eq(milestoneDisputes.id, row.id), eq(milestoneDisputes.status, "open")))
      .returning();
    if (!done) return { error: "locked" };
    await logEvent(v.contract.id, "admin", "dispute_decided", `${title}: ${reason}`);
    await notifyContract(v.contract, "dispute_decided", "both", { milestone: title, date: done.appealDeadline });
    return { ok: true };
  }
  if (row.status === "appealed") {
    const [done] = await db
      .update(milestoneDisputes)
      .set({
        status: "final",
        decision,
        releaseFils: d.releaseFils,
        refundFils: d.refundFils,
        reason,
        decidedBy: adminId,
        decidedAt: now,
        finalAt: now,
        updatedAt: now,
        firstDecision: { decision: row.decision ?? "", releaseFils: row.releaseFils ?? 0, refundFils: row.refundFils ?? 0, reason: row.reason ?? "", decidedAt: row.decidedAt?.toISOString() ?? "" },
      })
      .where(and(eq(milestoneDisputes.id, row.id), eq(milestoneDisputes.status, "appealed")))
      .returning();
    if (!done) return { error: "locked" };
    return execute(v, done, "dispute_final_on_appeal");
  }
  return { error: "locked" };
}

/** Either side: appeal the first decision, once, within the appeal window. */
export async function appealDispute(v: ContractView, by: Side, disputeId: string, note: string, now = new Date()): Promise<Result> {
  const d = disputeOf(v, disputeId);
  if (!d || !canAppeal(d, now)) return { error: "locked" };
  const text = note.trim().slice(0, 4000);
  if (text.length < 10) return { error: "note" };
  const db = await getDb();
  const [row] = await db
    .update(milestoneDisputes)
    .set({ status: "appealed", appealedBy: by, appealNote: text, appealedAt: now, updatedAt: now })
    .where(and(eq(milestoneDisputes.id, d.id), eq(milestoneDisputes.status, "decided"), isNull(milestoneDisputes.appealedAt)))
    .returning({ id: milestoneDisputes.id });
  if (!row) return { error: "locked" };
  await logEvent(v.contract.id, by, "dispute_appealed", `${titleOf(v, d)}: ${text}`);
  await notifyContract(v.contract, "dispute_appealed", by === "agency" ? "client" : "agency", { milestone: titleOf(v, d) });
  return { ok: true };
}

/** Either side: accept the first decision. When both accept, it is final now. */
export async function acceptDecision(v: ContractView, by: Side, disputeId: string): Promise<Result> {
  const d = disputeOf(v, disputeId);
  if (!d || d.status !== "decided") return { error: "locked" };
  const db = await getDb();
  const col = by === "agency" ? milestoneDisputes.agencyAcceptedAt : milestoneDisputes.clientAcceptedAt;
  const [row] = await db
    .update(milestoneDisputes)
    .set(by === "agency" ? { agencyAcceptedAt: new Date(), updatedAt: new Date() } : { clientAcceptedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(milestoneDisputes.id, d.id), eq(milestoneDisputes.status, "decided"), isNull(col)))
    .returning();
  if (!row) return { error: "locked" };
  await logEvent(v.contract.id, by, "decision_accepted", titleOf(v, d));
  if (decisionFinal(row)) return finalizeDecided(row.id);
  return { ok: true };
}

/** A first decision whose appeal window closed (or both accepted): make it final and move the money. */
export async function finalizeDecided(disputeId: string, now = new Date()): Promise<Result> {
  const db = await getDb();
  const [row] = await db.select().from(milestoneDisputes).where(eq(milestoneDisputes.id, disputeId));
  if (!row || !decisionFinal(row, now)) return { error: "locked" };
  const [done] = await db
    .update(milestoneDisputes)
    .set({ status: "final", finalAt: now, updatedAt: now })
    .where(and(eq(milestoneDisputes.id, row.id), eq(milestoneDisputes.status, "decided")))
    .returning();
  if (!done) return { error: "locked" };
  const v = await getContractById(done.contractId);
  if (!v) return { error: "notFound" };
  return execute(v, done, "dispute_final");
}

/** Moves the money of a final decision once, then lets the contract carry on or complete. */
async function execute(v: ContractView, d: MilestoneDispute, event: string): Promise<Result> {
  const title = titleOf(v, d);
  const split = { releaseFils: d.releaseFils ?? 0, refundFils: d.refundFils ?? 0 };
  const r = await settleMilestone(v.contract, d.milestoneId, split, { note: d.reason, approvedBy: split.releaseFils > 0 ? "admin" : null });
  if (r === "mismatch") return { error: "sum" };
  await logEvent(v.contract.id, "admin", event, `${title}: ${d.reason ?? ""}`);
  await notifyContract(v.contract, "dispute_final", "both", { milestone: title });
  await reopenIfNoDisputes(v.contract.id);
  await completeIfDone(v.contract.id);
  return { ok: true };
}

/** Job: every first decision past its appeal window becomes final (idempotent). */
export async function finalizeDueDecisions(now = new Date()) {
  const db = await getDb();
  const due = await db
    .select({ id: milestoneDisputes.id })
    .from(milestoneDisputes)
    .where(and(eq(milestoneDisputes.status, "decided"), lte(milestoneDisputes.appealDeadline, now)));
  let n = 0;
  for (const d of due) if ("ok" in (await finalizeDecided(d.id, now))) n++;
  return n;
}

/** Disputes an admin needs to act on (open or appealed), oldest first. */
export async function disputesNeedingDecision() {
  const db = await getDb();
  return db.select().from(milestoneDisputes).where(inArray(milestoneDisputes.status, ["open", "appealed"])).orderBy(milestoneDisputes.createdAt);
}
