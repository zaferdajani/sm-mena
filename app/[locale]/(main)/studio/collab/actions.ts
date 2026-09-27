"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { availabilitySchema, collabProfileSchema, inquirySchema, inviteSchema, needSchema, quoteSchema, rosterSchema } from "@/lib/collab/schemas";
import { INQUIRY_LIMIT, INVITE_LIMIT } from "@/lib/collab/types";
import { currencyOf } from "@/lib/countries";
import { addWindow, reconfirmWindows, removeWindow } from "@/lib/data/collab-availability";
import { blockProvider, unblockProvider } from "@/lib/data/collab-blocks";
import { acceptQuote, declineInquiry, handoffAfterAccept, inquiryForBuyer, markViewed, sendInquiry, submitQuote, withdrawInquiry } from "@/lib/data/collab-inquiries";
import { acceptInvite, createInvite, declineInvite, revokeInvite } from "@/lib/data/collab-invites";
import { markNeedFilled, publishNeed, replyToNeed, withdrawNeed, withdrawReply } from "@/lib/data/collab-needs";
import { saveCollabProfile } from "@/lib/data/collab-profile";
import { removeRosterEntry, saveRosterEntry } from "@/lib/data/collab-roster";
import { canUse } from "@/lib/feature-gate";
import { rateLimit } from "@/lib/rate-limit";

// Collaboration V2 actions (docs/48). Every one checks the switch and the
// signed-in agency on the server; ids come from the form and are validated,
// and the data layer decides again who owns what.

export type CollabState = { ok?: boolean; error?: string; id?: string; link?: string } | undefined;
const refresh = () => revalidatePath("/[locale]", "layout");
const uuid = z.string().uuid();
const all = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);
const one = (fd: FormData, k: string) => String(fd.get(k) ?? "");

async function gate() {
  if (!(await canUse("collaboration"))) return null;
  return requireAgency();
}

export async function saveCollabProfileAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  const d = collabProfileSchema.safeParse({ modes: all(fd, "modes"), workModes: all(fd, "workModes"), openToWork: one(fd, "openToWork") || "unknown" });
  if (!d.success) return { error: "invalid" };
  await saveCollabProfile(s.agency.id, { modes: d.data.modes, workModes: d.data.workModes, openToWork: d.data.openToWork === "unknown" ? null : d.data.openToWork === "yes" });
  refresh();
  return { ok: true };
}

export async function addWindowAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  const d = availabilitySchema.safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const units = d.data.capacityUnits === "" ? null : d.data.capacityUnits;
  await addWindow(s.agency.id, { from: d.data.from, to: d.data.to, timezone: d.data.timezone, status: d.data.status, capacityUnits: units, capacityUnit: units === null || d.data.capacityUnit === "" ? null : d.data.capacityUnit, visibility: d.data.visibility, note: d.data.note });
  refresh();
  return { ok: true };
}

export async function removeWindowAction(fd: FormData) {
  const s = await gate();
  const id = uuid.safeParse(fd.get("id"));
  if (s && id.success) await removeWindow(s.agency.id, id.data);
  refresh();
}

export async function reconfirmAction() {
  const s = await gate();
  if (s) await reconfirmWindows(s.agency.id);
  refresh();
}

export async function publishNeedAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (!rateLimit(`collab-need:${s.agency.id}`, 10, 60 * 60 * 1000)) return { error: "rateLimited" };
  const d = needSchema.safeParse({ ...Object.fromEntries(fd), roles: all(fd, "roles"), services: all(fd, "services"), languages: all(fd, "languages"), modes: all(fd, "modes"), country: s.agency.country });
  if (!d.success) return { error: "invalid" };
  const need = await publishNeed(s.agency, d.data);
  refresh();
  return { ok: true, id: need.id };
}

export async function withdrawNeedAction(fd: FormData) {
  const s = await gate();
  const id = uuid.safeParse(fd.get("id"));
  if (s && id.success) {
    if (fd.get("filled") === "1") await markNeedFilled(s.agency.id, id.data);
    else await withdrawNeed(s.agency.id, id.data);
  }
  refresh();
}

export async function replyNeedAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  const id = uuid.safeParse(fd.get("needId"));
  if (!id.success) return { error: "invalid" };
  if (!rateLimit(`collab-reply:${s.agency.id}`, 20, 60 * 60 * 1000)) return { error: "rateLimited" };
  const r = await replyToNeed(s.agency, id.data, one(fd, "note"));
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error };
}

export async function withdrawReplyAction(fd: FormData) {
  const s = await gate();
  const id = uuid.safeParse(fd.get("needId"));
  if (s && id.success) await withdrawReply(s.agency, id.data);
  refresh();
}

export async function saveRosterAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  const d = rosterSchema.safeParse({ ...Object.fromEntries(fd), tags: one(fd, "tags").split(/[,،]/).map((t) => t.trim()).filter(Boolean).slice(0, 8) });
  if (!d.success) return { error: "invalid" };
  const row = await saveRosterEntry(s.agency.id, { providerAgencyId: d.data.providerAgencyId, groupName: d.data.groupName, tags: d.data.tags, notes: d.data.notes, rateFils: d.data.rate === "" ? null : d.data.rate, rateUnit: d.data.rateUnit || null, rateCurrency: currencyOf(s.agency.country) });
  refresh();
  return row ? { ok: true } : { error: "invalid" };
}

export async function removeRosterAction(fd: FormData) {
  const s = await gate();
  const id = uuid.safeParse(fd.get("providerAgencyId"));
  if (s && id.success) await removeRosterEntry(s.agency.id, id.data);
  refresh();
}

export async function createInviteAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (!rateLimit(`collab-invite:${s.agency.id}`, INVITE_LIMIT, 60 * 60 * 1000)) return { error: "rateLimited" };
  const d = inviteSchema.safeParse({ label: one(fd, "label"), roles: all(fd, "roles") });
  if (!d.success) return { error: "invalid" };
  const { token } = await createInvite(s.agency, d.data);
  const locale = await getLocale();
  refresh();
  // The only time the token leaves the server: in the link the sender copies.
  return { ok: true, link: `/${locale}/invite/${token}` };
}

export async function revokeInviteAction(fd: FormData) {
  const s = await gate();
  const id = uuid.safeParse(fd.get("id"));
  if (s && id.success) await revokeInvite(s.agency.id, id.data);
  refresh();
}

const token = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/);

export async function answerInviteAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  const t = token.safeParse(fd.get("token"));
  if (!t.success) return { error: "notFound" };
  if (fd.get("answer") === "decline") {
    await declineInvite(s.agency, t.data);
    refresh();
    return { ok: true };
  }
  const r = await acceptInvite(s.agency, t.data);
  refresh();
  if ("ok" in r) return redirect({ href: "/studio/collab/network?invited=1", locale: await getLocale() });
  return { error: r.error };
}

export async function blockAction(fd: FormData) {
  const s = await gate();
  const id = uuid.safeParse(fd.get("agencyId"));
  if (s && id.success) {
    if (fd.get("undo") === "1") await unblockProvider(s.agency.id, id.data);
    else await blockProvider(s.agency.id, id.data);
  }
  refresh();
}

export async function sendInquiryAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (!rateLimit(`collab-inquiry:${s.agency.id}`, INQUIRY_LIMIT, 60 * 60 * 1000)) return { error: "rateLimited" };
  let deliverables: unknown = [];
  try {
    deliverables = JSON.parse(one(fd, "deliverables") || "[]");
  } catch {
    return { error: "invalid" };
  }
  const d = inquirySchema.safeParse({ ...Object.fromEntries(fd), deliverables, recipients: all(fd, "recipients") });
  if (!d.success) return { error: "invalid" };
  const r = await sendInquiry(s.agency, d.data);
  if (!("ok" in r)) return { error: r.error };
  refresh();
  return redirect({ href: `/studio/collab/work/${r.id}?sent=1`, locale: await getLocale() });
}

export async function viewedInquiryAction(id: string) {
  const s = await gate();
  const v = uuid.safeParse(id);
  if (s && v.success) await markViewed(s.agency.id, v.data);
}

export async function submitQuoteAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  const id = uuid.safeParse(fd.get("inquiryId"));
  const d = quoteSchema.safeParse({ ...Object.fromEntries(fd), currency: currencyOf(s.agency.country) });
  if (!id.success || !d.success) return { error: "invalid" };
  const r = await submitQuote(s.agency, id.data, d.data);
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error };
}

export async function declineInquiryAction(fd: FormData) {
  const s = await gate();
  const id = uuid.safeParse(fd.get("inquiryId"));
  if (s && id.success) await declineInquiry(s.agency, id.data);
  refresh();
}

export async function withdrawInquiryAction(fd: FormData) {
  const s = await gate();
  const id = uuid.safeParse(fd.get("inquiryId"));
  if (s && id.success) await withdrawInquiry(s.agency.id, id.data);
  refresh();
}

export async function acceptQuoteAction(_: CollabState, fd: FormData): Promise<CollabState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  const d = z.object({ inquiryId: uuid, quoteId: uuid }).safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const r = await acceptQuote(s.agency, d.data.inquiryId, d.data.quoteId);
  refresh();
  return "ok" in r ? { ok: true, id: r.handoff } : { error: r.error };
}

/** Partnership accepted after the quote: ask the supplier for the contract now. */
export async function retryHandoffAction(fd: FormData) {
  const s = await gate();
  const id = uuid.safeParse(fd.get("inquiryId"));
  if (!s || !id.success) return;
  const i = await inquiryForBuyer(s.agency.id, id.data);
  const winner = i?.quotes.find((q) => q.status === "accepted");
  if (i && winner && i.status === "converted") await handoffAfterAccept(s.agency, i, winner.supplierAgencyId);
  refresh();
}
