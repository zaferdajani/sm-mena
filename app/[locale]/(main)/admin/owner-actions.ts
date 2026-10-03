"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { requireStaff } from "@/lib/auth/guards";
import { audit } from "@/lib/data/agencies";
import { computeOwnerMatches, sendOwnerMatchEmails } from "@/lib/data/owner-matching";

// Admin → Business owners (docs/59): recompute suggestions, and send the match emails when discovery is open.

export type OwnerAdminState = { computed?: { owners: number; matched: number; suggestions: number }; sent?: { attempted: number; sent: number; skipped: "closed" | null } } | undefined;

export async function computeOwnerMatchesAction(): Promise<OwnerAdminState> {
  const staff = await requireStaff("owners.manage");
  const r = await computeOwnerMatches();
  await audit(staff.id, "owners.matches_computed", "owner_matches", r.batchId, { owners: r.owners, matched: r.matched, suggestions: r.suggestions });
  revalidatePath(`/${await getLocale()}/admin/owners`);
  return { computed: { owners: r.owners, matched: r.matched, suggestions: r.suggestions } };
}

export async function sendOwnerMatchEmailsAction(): Promise<OwnerAdminState> {
  const staff = await requireStaff("owners.manage");
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://sawwiq.org").replace(/\/$/, "");
  const r = await sendOwnerMatchEmails(site);
  await audit(staff.id, "owners.matches_sent", "owner_matches", undefined, { attempted: r.attempted, sent: r.sent, skipped: r.skipped ?? "" });
  revalidatePath(`/${await getLocale()}/admin/owners`);
  return { sent: r };
}
