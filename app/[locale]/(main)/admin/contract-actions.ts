"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { audit } from "@/lib/data/agencies";
import { decideDispute } from "@/lib/data/contract-disputes";
import { closeDispute, resolveMilestone } from "@/lib/data/contracts";

export type AdminState = { ok?: boolean; error?: string } | undefined;
const refresh = () => revalidatePath("/[locale]", "layout");
const fils = (amount: number) => Math.round(amount * 1000);

/** Immediately final release or refund of one held milestone (audited). */
export async function resolveMilestoneAction(formData: FormData) {
  const admin = await requireStaff("escrow.resolve");
  const d = z
    .object({ contractId: z.string().uuid(), milestoneId: z.string().uuid(), decision: z.enum(["release", "refund"]), note: z.string().trim().min(3).max(500) })
    .parse(Object.fromEntries(formData));
  const r = await resolveMilestone(d.contractId, d.milestoneId, d.decision, d.note);
  if ("ok" in r) await audit(admin.id, `escrow.${d.decision}`, "milestone", d.milestoneId, { contractId: d.contractId, note: d.note });
  refresh();
}

const decisionSchema = z
  .object({
    disputeId: z.string().uuid(),
    decision: z.enum(["release", "refund", "split"]),
    held: z.coerce.number().int().min(0),
    release: z.union([z.literal(""), z.coerce.number().min(0).max(10_000_000)]).optional(),
    refund: z.union([z.literal(""), z.coerce.number().min(0).max(10_000_000)]).optional(),
    reason: z.string().trim().min(10).max(4000),
  })
  .transform((d) => {
    if (d.decision === "release") return { ...d, releaseFils: d.held, refundFils: 0 };
    if (d.decision === "refund") return { ...d, releaseFils: 0, refundFils: d.held };
    return { ...d, releaseFils: fils(Number(d.release || 0)), refundFils: fils(Number(d.refund || 0)) };
  });

/**
 * Decide a milestone dispute: release all, refund all, or split (the two parts
 * must add up to what is held), with a reason both parties see. The first
 * decision can be appealed once within 7 days; a decision on an appeal is
 * final and moves the money. Audited.
 */
export async function decideDisputeAction(_: AdminState, formData: FormData): Promise<AdminState> {
  const admin = await requireStaff("escrow.resolve");
  const d = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!d.success) return { error: d.error.issues[0]?.path[0] === "reason" ? "reason" : "invalid" };
  const r = await decideDispute(admin.id, d.data.disputeId, { releaseFils: d.data.releaseFils, refundFils: d.data.refundFils, reason: d.data.reason });
  if ("error" in r) return { error: r.error };
  await audit(admin.id, "escrow.dispute_decision", "dispute", d.data.disputeId, { decision: d.data.decision, releaseFils: d.data.releaseFils, refundFils: d.data.refundFils, reason: d.data.reason });
  refresh();
  return { ok: true };
}

export async function closeDisputeAction(formData: FormData) {
  const admin = await requireStaff("escrow.resolve");
  const d = z.object({ contractId: z.string().uuid(), note: z.string().trim().min(3).max(500) }).parse(Object.fromEntries(formData));
  await closeDispute(d.contractId, d.note);
  await audit(admin.id, "escrow.dispute_closed", "contract", d.contractId, { note: d.note });
  refresh();
}
