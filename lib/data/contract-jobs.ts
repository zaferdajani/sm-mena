import "server-only";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { daysLeft, reminderDue } from "@/lib/contracts/rules";
import { getDb } from "@/lib/db";
import { auditLogs, contracts, milestones } from "@/lib/db/schema";
import { finalizeDueDecisions } from "./contract-disputes";
import { notifyContract } from "./contract-notify";
import { completeIfDone, getContractById, logEvent } from "./contracts";
import { settleMilestone } from "./escrow";

// The daily milestone job (app/api/cron/milestones, vercel.json). Idempotent
// and catch-up safe: it looks at everything due, not only what became due
// since the last run, and every step is a guarded state change, so running it
// twice (or late) sends no reminder twice and releases nothing twice.
//
//  1. Reminders: two days and one day before a delivery's review deadline.
//  2. Deemed acceptance: a delivery whose deadline passed with no change
//     request or dispute is accepted and, in protected mode, paid out. Each
//     one is written to the audit log as a system decision under the terms.
//  3. Dispute decisions whose 7-day appeal window closed become final.

export type JobReport = { reminders: number; autoApproved: number; finalized: number };

export async function runMilestoneJobs(now = new Date()): Promise<JobReport> {
  const db = await getDb();
  const submitted = await db
    .select({ m: milestones, c: contracts })
    .from(milestones)
    .innerJoin(contracts, eq(contracts.id, milestones.contractId))
    .where(and(eq(milestones.status, "submitted"), eq(contracts.status, "active"), isNotNull(milestones.reviewDueAt)));

  let reminders = 0;
  let autoApproved = 0;
  for (const { m, c } of submitted) {
    const dueAt = m.reviewDueAt!;
    if (dueAt <= now) {
      if (await autoApprove(c.id, m.id, now)) autoApproved++;
      continue;
    }
    const stage = reminderDue(dueAt, m.remindersSent, now);
    if (!stage) continue;
    const [claimed] = await db
      .update(milestones)
      .set({ remindersSent: stage })
      .where(and(eq(milestones.id, m.id), eq(milestones.status, "submitted"), eq(milestones.reviewDueAt, dueAt), eq(milestones.remindersSent, m.remindersSent)))
      .returning({ id: milestones.id });
    if (!claimed) continue;
    await notifyContract(c, "review_reminder", "both", { milestone: m.title, date: dueAt, days: daysLeft(dueAt, now) });
    reminders++;
  }
  const finalized = await finalizeDueDecisions(now);
  return { reminders, autoApproved, finalized };
}

/** Deemed acceptance of one overdue delivery (guarded: only from "submitted", past its deadline). */
export async function autoApprove(contractId: string, milestoneId: string, now = new Date()) {
  const v = await getContractById(contractId);
  const m = v?.milestones.find((x) => x.id === milestoneId);
  if (!v || !m || v.contract.status !== "active" || m.status !== "submitted" || !m.reviewDueAt || m.reviewDueAt > now) return false;
  const db = await getDb();
  if (v.contract.paymentMode === "protected") {
    const r = await settleMilestone(v.contract, m.id, { releaseFils: v.heldBy[m.id] ?? 0, refundFils: 0 }, { from: ["submitted"], approvedBy: "deadline", note: "review period ended" });
    if (r !== "ok") return false;
  } else {
    const [row] = await db
      .update(milestones)
      .set({ status: "approved", approvedAt: now, approvedBy: "deadline" })
      .where(and(eq(milestones.id, m.id), eq(milestones.status, "submitted"), lte(milestones.reviewDueAt, now)))
      .returning({ id: milestones.id });
    if (!row) return false;
  }
  await logEvent(v.contract.id, "system", "auto_approved", m.title);
  await db.insert(auditLogs).values({ actorUserId: null, action: "escrow.auto_release", entity: "milestone", entityId: m.id, meta: { contractId: v.contract.id, reviewDueAt: m.reviewDueAt.toISOString(), heldFils: v.heldBy[m.id] ?? 0 } });
  await notifyContract(v.contract, "milestone_auto_approved", "both", { milestone: m.title });
  await completeIfDone(v.contract.id);
  return true;
}
