"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { deliverableLineSchema } from "@/lib/collab/schemas";
import { isDateString } from "@/lib/collab/time";
import { acceptWorkOrder, addAsset, addComment, answerVersion, closeWorkOrder, createWorkOrder, decideSubmission, declineWorkOrder, endWorkOrder, linkContract, offerWorkOrder, postMessage, proposeVersion, submitWork } from "@/lib/data/work-orders";
import { canUse } from "@/lib/feature-gate";
import { MAX_UPLOAD_BYTES } from "@/lib/images";
import { rateLimit } from "@/lib/rate-limit";

// Work-order actions (docs/49). Switch + session on every one; the data layer
// decides again who owns what; money and terms go through the contract code.

export type OrderState = { ok?: boolean; error?: string; effect?: string; id?: string } | undefined;
const refresh = () => revalidatePath("/[locale]", "layout");
const uuid = z.string().uuid();
const one = (fd: FormData, k: string) => String(fd.get(k) ?? "");

/** Both switches, a session, and one general limit on every write (the heavier ones add their own). */
async function gate(limitKey = "act", limit = 240) {
  if (!(await canUse("collaboration")) || !(await canUse("collaboration_delivery"))) return null;
  const s = await requireAgency();
  if (!rateLimit(`collab-order-${limitKey}:${s.agency.id}`, limit, 60 * 60 * 1000)) return { agency: s.agency, limited: true as const };
  return { agency: s.agency, limited: false as const };
}

const termsSchema = z.object({
  deliverables: z.array(deliverableLineSchema).max(20),
  scope: z.string().trim().max(3000),
  revisionAllowance: z.coerce.number().int().min(0).max(10),
  dueOn: z.union([z.literal(""), z.string().refine(isDateString)]),
  reviewDays: z.coerce.number().int().min(1).max(30),
  compensationNote: z.string().trim().max(300),
  permissionScope: z.string().trim().max(1000),
});

function readTerms(fd: FormData) {
  let deliverables: unknown = [];
  try {
    deliverables = JSON.parse(one(fd, "deliverables") || "[]");
  } catch {
    return null;
  }
  const d = termsSchema.safeParse({ ...Object.fromEntries(fd), deliverables });
  return d.success ? { ...d.data, dueOn: d.data.dueOn || null } : null;
}

export async function createOrderAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate("create", 20);
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const terms = readTerms(fd);
  const head = z.object({ supplierAgencyId: uuid, title: z.string().trim().min(3).max(120), mode: z.enum(["private", "disclosed"]), inquiryId: z.union([z.literal(""), uuid]), contractId: z.union([z.literal(""), uuid]), milestoneId: z.union([z.literal(""), uuid]), parentContractId: z.union([z.literal(""), uuid]) }).safeParse(Object.fromEntries(fd));
  if (!terms || !head.success) return { error: "invalid" };
  const r = await createWorkOrder(s.agency, { ...head.data, inquiryId: head.data.inquiryId || null, contractId: head.data.contractId || null, milestoneId: head.data.milestoneId || null, parentContractId: head.data.parentContractId || null, terms });
  if (!("ok" in r)) return { error: r.error };
  let offer = "";
  if (fd.get("offer") === "1") {
    const o = await offerWorkOrder(s.agency, r.id);
    if (!("ok" in o)) offer = `?offer=${o.error}`;
  }
  refresh();
  return redirect({ href: `/studio/collab/orders/${r.id}${offer}`, locale: await getLocale() });
}

export async function orderTransitionAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = z.object({ id: uuid, action: z.enum(["offer", "accept", "decline", "withdraw", "cancel", "close"]) }).safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const r =
    d.data.action === "offer" ? await offerWorkOrder(s.agency, d.data.id)
    : d.data.action === "accept" ? await acceptWorkOrder(s.agency, d.data.id)
    : d.data.action === "decline" ? await declineWorkOrder(s.agency, d.data.id)
    : d.data.action === "close" ? await closeWorkOrder(s.agency, d.data.id)
    : await endWorkOrder(s.agency, d.data.id, d.data.action);
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error };
}

export async function proposeVersionAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const id = uuid.safeParse(fd.get("id"));
  const terms = readTerms(fd);
  if (!id.success || !terms) return { error: "invalid" };
  const r = await proposeVersion(s.agency, id.data, terms);
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error };
}

export async function answerVersionAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = z.object({ id: uuid, version: z.coerce.number().int().min(1), answer: z.enum(["accept", "decline"]) }).safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const r = await answerVersion(s.agency, d.data.id, d.data.version, d.data.answer === "accept");
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error };
}

export async function linkContractAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = z.object({ id: uuid, contractId: uuid, milestoneId: z.union([z.literal(""), uuid]) }).safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const r = await linkContract(s.agency, d.data.id, d.data.contractId, d.data.milestoneId || null);
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error };
}

export async function postMessageAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate("msg", 120);
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = z.object({ id: uuid, scope: z.enum(["private", "shared"]), body: z.string().trim().min(1).max(2000) }).safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const r = await postMessage(s.agency, d.data.id, d.data.scope, d.data.body);
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error };
}

export async function uploadAssetAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate("upload", 60);
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const id = uuid.safeParse(fd.get("id"));
  const file = fd.get("file");
  if (!id.success || !(file instanceof File) || file.size === 0) return { error: "invalid" };
  if (file.size > MAX_UPLOAD_BYTES) return { error: "too_large" };
  const groupId = one(fd, "groupId") || null;
  const r = await addAsset(s.agency, id.data, { name: file.name, buffer: Buffer.from(await file.arrayBuffer()), groupId });
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error === "image" ? (r.detail ?? "unsupported") : r.detail === "max" ? "max_files" : r.error };
}

export async function commentAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = z.object({ assetId: uuid, body: z.string().trim().min(1).max(1000), x: z.union([z.literal(""), z.coerce.number().min(0).max(100)]), y: z.union([z.literal(""), z.coerce.number().min(0).max(100)]) }).safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const at = d.data.x !== "" && d.data.y !== "" ? { x: d.data.x, y: d.data.y } : null;
  const r = await addComment(s.agency, d.data.assetId, d.data.body, at);
  refresh();
  return "ok" in r ? { ok: true } : { error: r.error };
}

export async function submitWorkAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = z.object({ id: uuid, note: z.string().trim().max(2000) }).safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const r = await submitWork(s.agency, d.data.id, d.data.note);
  refresh();
  return "ok" in r ? { ok: true } : { error: r.detail === "rounds" ? "rounds" : r.error };
}

export async function decideAction(_: OrderState, fd: FormData): Promise<OrderState> {
  const s = await gate();
  if (!s) return { error: "unavailable" };
  if (s.limited) return { error: "rateLimited" };
  const d = z.object({ id: uuid, decision: z.enum(["approved", "changes_requested"]), note: z.string().trim().max(2000) }).safeParse(Object.fromEntries(fd));
  if (!d.success) return { error: "invalid" };
  const r = await decideSubmission(s.agency, d.data.id, d.data.decision, d.data.note);
  refresh();
  return "ok" in r ? { ok: true, effect: r.effect } : { error: r.error };
}
