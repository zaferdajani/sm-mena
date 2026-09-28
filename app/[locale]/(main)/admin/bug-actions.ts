"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { audit } from "@/lib/data/agencies";
import { ERROR_STATUSES, SUPPORT_STATUSES, resolveStaleErrors, setErrorStatus, setSupportStatus } from "@/lib/data/bugs";

export async function updateErrorAction(formData: FormData) {
  const admin = await requireStaff("bugs.manage");
  const data = z
    .object({ id: z.coerce.number().int().positive(), status: z.enum(ERROR_STATUSES), notes: z.string().max(2000).optional(), commit: z.string().max(80).optional() })
    .parse(Object.fromEntries(formData));
  await setErrorStatus(data.id, admin.id, data);
  await audit(admin.id, `bug.${data.status}`, "error_event", String(data.id));
  revalidatePath("/[locale]/admin", "layout");
}

/** Closes every unresolved error not seen for the chosen number of hours (Admin → Bugs). */
export async function resolveStaleErrorsAction(formData: FormData) {
  const admin = await requireStaff("bugs.manage");
  const data = z
    .object({ hours: z.coerce.number().int().min(1).max(24 * 90), notes: z.string().trim().min(3).max(2000), commit: z.string().trim().max(80).optional() })
    .parse(Object.fromEntries(formData));
  const closed = await resolveStaleErrors(admin.id, data);
  await audit(admin.id, "bug.resolve_stale", "error_event", undefined, { hours: data.hours, closed, commit: data.commit || null });
  revalidatePath("/[locale]/admin", "layout");
}

export async function updateSupportAction(formData: FormData) {
  const admin = await requireStaff("support.manage");
  const data = z.object({ id: z.string().uuid(), status: z.enum(SUPPORT_STATUSES), note: z.string().max(2000).optional() }).parse(Object.fromEntries(formData));
  await setSupportStatus(data.id, admin.id, data.status, data.note);
  await audit(admin.id, `support.${data.status}`, "support_request", data.id);
  revalidatePath("/[locale]/admin", "layout");
}
