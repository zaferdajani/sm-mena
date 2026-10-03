"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { saveOwnerNeed } from "@/lib/data/owner-needs";
import { ownerNeedFromForm, ownerNeedSchema } from "@/lib/validation/owner-needs";

// A business owner's early registration (docs/58-owner-early-registration.md):
// one screen after the emailed-code sign-in, saved on the client account.

export type OwnerNeedState = { error?: "signin" | "invalid" | "city" | "services" } | undefined;

export async function saveOwnerNeedAction(_: OwnerNeedState, formData: FormData): Promise<OwnerNeedState> {
  const user = await getSessionUser();
  const locale = await getLocale();
  if (!user || user.role !== "client") return { error: "signin" };
  const parsed = ownerNeedSchema.safeParse(ownerNeedFromForm(formData));
  if (!parsed.success) {
    const paths = parsed.error.issues.map((i) => String(i.path[0]));
    return { error: paths.includes("services") ? "services" : paths.includes("city") ? "city" : "invalid" };
  }
  await saveOwnerNeed(user.id, parsed.data, locale);
  redirect(`/${locale}/owner/done`);
}
