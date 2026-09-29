"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { requireAgency } from "@/lib/auth/guards";
import { setPublication } from "@/lib/data/publication";
import { PROFILE_VISIBILITIES } from "@/lib/launch-phase";
import { redirect } from "@/i18n/navigation";

export async function savePublication(formData: FormData) {
  const { user, agency } = await requireAgency();
  const locale = await getLocale();
  const visibility = z.enum(PROFILE_VISIBILITIES).safeParse(formData.get("visibility"));
  if (!visibility.success || formData.get("acknowledge") !== "on") return redirect({ href: "/studio/publication?error=consent", locale });
  if (!(await setPublication(user.id, agency.id, visibility.data))) return redirect({ href: "/studio/publication?error=consent", locale });
  revalidatePath("/[locale]", "layout");
  redirect({ href: "/studio/publication?saved=1", locale });
}
