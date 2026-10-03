"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getSessionUser } from "@/lib/auth/session";
import { respondToOwnerMatch } from "@/lib/data/owner-matching";
import { saveOwnerNeed } from "@/lib/data/owner-needs";
import { ownerNeedFromForm, ownerNeedSchema } from "@/lib/validation/owner-needs";

// A business owner's early registration (docs/58-owner-early-registration.md):
// one screen after the emailed-code sign-in, saved on the client account.

export type OwnerNeedValues = { city: string; businessType: string; services: string[]; timing: string; whatsapp: string; note: string };
export type OwnerNeedState = { error?: "signin" | "invalid" | "city" | "services"; values?: OwnerNeedValues } | undefined;

export async function saveOwnerNeedAction(_: OwnerNeedState, formData: FormData): Promise<OwnerNeedState> {
  const user = await getSessionUser();
  const locale = await getLocale();
  if (!user || user.role !== "client") return { error: "signin" };
  const raw = ownerNeedFromForm(formData);
  const parsed = ownerNeedSchema.safeParse(raw);
  if (!parsed.success) {
    const paths = parsed.error.issues.map((i) => String(i.path[0]));
    // React resets the form after an action; the typed values ride back as the next defaults.
    const values = { city: raw.city, businessType: raw.businessType, services: raw.services, timing: raw.timing, whatsapp: raw.whatsapp, note: raw.note };
    return { error: paths.includes("services") ? "services" : paths.includes("city") ? "city" : "invalid", values };
  }
  await saveOwnerNeed(user.id, parsed.data, locale);
  redirect(`/${locale}/owner/done`);
}

export type MatchAnswerState = { done?: "accepted" | "declined"; error?: "signin" | "notFound" | "notSent" } | undefined;

/** The owner's answer to one match (docs/59): acceptance is the consent that introduces the two sides. */
export async function answerOwnerMatchAction(_: MatchAnswerState, formData: FormData): Promise<MatchAnswerState> {
  const user = await getSessionUser();
  const locale = await getLocale();
  if (!user || user.role !== "client") return { error: "signin" };
  const matchId = String(formData.get("matchId") ?? "");
  const answer = formData.get("answer") === "decline" ? "decline" : "accept";
  if (!/^[0-9a-f-]{36}$/.test(matchId)) return { error: "notFound" };
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://sawwiq.org").replace(/\/$/, "");
  const result = await respondToOwnerMatch(user.id, matchId, answer, site, locale);
  if (result === "notFound" || result === "notSent") return { error: result };
  revalidatePath(`/${locale}/owner/matches`);
  return { done: result };
}
