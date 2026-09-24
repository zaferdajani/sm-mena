"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/guards";
import { getAgencyByHandle } from "@/lib/data/agencies";
import { PLAN_MONTHS, recordManualPayment, refundPayment } from "@/lib/data/payments";

export type ManualState = { error?: "agency" | "invalid"; ok?: boolean } | undefined;

export async function recordManualPaymentAction(_: ManualState, formData: FormData): Promise<ManualState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      handle: z.string().trim().min(2),
      plan: z.enum(["pro", "business"]),
      months: z.coerce.number().refine((m) => (PLAN_MONTHS as readonly number[]).includes(m)),
      method: z.enum(["cliq", "bank_transfer", "cash", "card"]),
      amount: z.coerce.number().positive().max(100_000),
      reference: z.string().max(100).optional(),
      note: z.string().max(500).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const agency = await getAgencyByHandle(parsed.data.handle.replace(/^@/, "").toLowerCase());
  if (!agency) return { error: "agency" };
  await recordManualPayment({ agencyId: agency.id, plan: parsed.data.plan, months: parsed.data.months, method: parsed.data.method, amountJod: parsed.data.amount, reference: parsed.data.reference, note: parsed.data.note }, admin.id);
  revalidatePath("/[locale]/admin", "layout");
  return { ok: true };
}

export async function refundPaymentAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = z.object({ id: z.string().uuid(), reason: z.string().trim().min(2).max(500), endPlan: z.literal("on").optional() }).parse(Object.fromEntries(formData));
  await refundPayment(data.id, admin.id, data.reason, data.endPlan === "on");
  revalidatePath("/[locale]/admin", "layout");
}
