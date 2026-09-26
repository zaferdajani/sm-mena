"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgency } from "@/lib/auth/guards";
import { shareInputSchema } from "@/lib/contracts/shares";
import { getContractById, logEvent, setCheck, submitMilestone } from "@/lib/data/contracts";
import { answerShare, cancelShare, markSharePaid, partnerWork, proposeShare } from "@/lib/data/milestone-shares";
import { addNotifications } from "@/lib/data/notifications";
import { canUse } from "@/lib/feature-gate";
import { rateLimit } from "@/lib/rate-limit";

// Partners on client milestones (docs/40-collaboration.md).

export type ShareState = { error?: string; ok?: boolean } | undefined;
const refresh = () => revalidatePath("/[locale]", "layout");
const id = z.string().uuid();

/** Agency: offer an accepted partner a share of one milestone. */
export async function proposeShareAction(_: ShareState, formData: FormData): Promise<ShareState> {
  const { agency } = await requireAgency();
  if (!(await canUse("partners"))) return { error: "notFound" };
  if (!rateLimit(`share:${agency.id}`, 30, 60 * 60 * 1000)) return { error: "rateLimited" };
  const ids = z.object({ contractId: id, milestoneId: id, partnerId: id }).safeParse(Object.fromEntries(formData));
  const input = shareInputSchema.safeParse(Object.fromEntries(formData));
  if (!ids.success || !input.success) return { error: "invalid" };
  const r = await proposeShare(agency, ids.data.contractId, ids.data.milestoneId, ids.data.partnerId, input.data);
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function cancelShareAction(formData: FormData) {
  const { agency } = await requireAgency();
  const shareId = id.safeParse(formData.get("shareId"));
  if (shareId.success) await cancelShare(agency.id, shareId.data);
  refresh();
}

/** Partner: accept or decline a proposed share. */
export async function answerShareAction(formData: FormData) {
  const { agency } = await requireAgency();
  const shareId = id.safeParse(formData.get("shareId"));
  if (shareId.success) await answerShare(agency, shareId.data, formData.get("answer") === "accept");
  refresh();
}

/** The partner's own milestone: only through an accepted share. */
async function partnerMilestone(formData: FormData) {
  const { agency } = await requireAgency();
  const shareId = id.safeParse(formData.get("shareId"));
  if (!shareId.success) return null;
  const work = await partnerWork(agency.id, shareId.data);
  return work ? { agency, work } : null;
}

/** Partner: tick a checklist item of the milestone it delivers. */
export async function partnerTickAction(formData: FormData) {
  const p = await partnerMilestone(formData);
  const checkId = id.safeParse(formData.get("checkId"));
  if (p && checkId.success) await setCheck(p.work.contract.id, p.work.milestone.id, checkId.data, "agency", formData.get("value") === "1");
  refresh();
}

/**
 * Partner: hand the milestone to the client for review, without waiting for
 * the agency. The client's confirmation, or the end of the review period,
 * pays the partner's share (settleMilestone).
 */
export async function partnerSubmitAction(_: ShareState, formData: FormData): Promise<ShareState> {
  const p = await partnerMilestone(formData);
  if (!p) return { error: "notFound" };
  const v = await getContractById(p.work.contract.id);
  if (!v) return { error: "notFound" };
  const note = String(formData.get("note") ?? "").slice(0, 2000);
  const r = await submitMilestone(v, p.work.milestone.id, note);
  if ("error" in r) return { error: r.error };
  await logEvent(v.contract.id, "agency", "partner_submitted", `${p.work.milestone.title} · ${p.agency.name}`);
  await addNotifications([{ agencyId: p.work.agency.id, kind: "share_submitted", href: `/studio/contracts/${v.contract.id}`, params: { name: p.agency.name, milestone: p.work.milestone.title } }]);
  refresh();
  return { ok: true };
}

/** Direct payment mode: the agency marks the partner's share paid, the partner marks it received. */
export async function sharePaidAction(formData: FormData) {
  const { agency } = await requireAgency();
  const shareId = id.safeParse(formData.get("shareId"));
  if (shareId.success) await markSharePaid(shareId.data, formData.get("as") === "partner" ? { partnerAgencyId: agency.id } : { agencyId: agency.id });
  refresh();
}
