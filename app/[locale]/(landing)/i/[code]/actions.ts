"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { claimPioneer, markWatched } from "@/lib/data/pioneers";

/** A provider who already has a page claims the letter's seal for it (docs/57). */
export async function claimForMyPageAction(code: string) {
  const { user, agency } = await requireAgency();
  const r = await claimPioneer(agency.id, code, user.id);
  const locale = await getLocale();
  return redirect({ href: r.ok ? `/a/${agency.handle}?pioneer=1` : `/i/${code}`, locale });
}

/** The introduction played to its end on the letter's page. */
export async function markWatchedAction(code: string) {
  await markWatched(code);
}
