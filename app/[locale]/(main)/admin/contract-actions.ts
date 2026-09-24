"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { audit } from "@/lib/data/agencies";
import { closeDispute, resolveMilestone } from "@/lib/data/contracts";

export async function resolveMilestoneAction(formData: FormData) {
  const admin = await requireAdmin();
  const d = z
    .object({ contractId: z.string().uuid(), milestoneId: z.string().uuid(), decision: z.enum(["release", "refund"]), note: z.string().trim().min(3).max(500) })
    .parse(Object.fromEntries(formData));
  await resolveMilestone(d.contractId, d.milestoneId, d.decision, d.note);
  await audit(admin.id, `escrow.${d.decision}`, "milestone", d.milestoneId, { contractId: d.contractId, note: d.note });
  revalidatePath("/[locale]", "layout");
}

export async function closeDisputeAction(formData: FormData) {
  const admin = await requireAdmin();
  const d = z.object({ contractId: z.string().uuid(), note: z.string().trim().min(3).max(500) }).parse(Object.fromEntries(formData));
  await closeDispute(d.contractId, d.note);
  await audit(admin.id, "escrow.dispute_closed", "contract", d.contractId, { note: d.note });
  revalidatePath("/[locale]", "layout");
}
