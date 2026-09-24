"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import {
  approveMilestone,
  cancelContract,
  clientSign,
  createContract,
  decideChange,
  getContractByToken,
  getContractForAgency,
  markDirectPayment,
  openDispute,
  NDA_YEARS,
  postUpdate,
  REPORTING_CADENCES,
  requestAmendment,
  requestChange,
  requestChanges,
  setCheck,
  startMilestoneFunding,
  submitMilestone,
  withdrawChange,
  type ContractError,
} from "@/lib/data/contracts";
import { normalizeLines } from "@/lib/deliverables";
import { PLATFORMS } from "@/lib/labels";
import { isTestPayments } from "@/lib/payments/provider";
import { parseSignatureDataUrl } from "@/lib/pdf/signature-image";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

export type ActionState = { error?: string; ok?: boolean } | undefined;
const refresh = () => revalidatePath("/[locale]", "layout");
const fils = (jod: number) => Math.round(jod * 1000);

// ── Agency ──────────────────────────────────────────────────────────────

const draftSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().max(2000).default(""),
  items: z.array(z.object({ key: z.string(), quantity: z.number(), platform: z.string().nullish() })).max(30),
  specialRequests: z.array(z.object({ text: z.string().max(300), milestone: z.number().int().min(0) })).max(20),
  startDate: z.string(),
  endDate: z.string(),
  // Every contract is payment-protected; the field is kept for old clients of this action.
  paymentMode: z.enum(["protected", "direct"]).default("protected"),
  nda: z.boolean(),
  ndaExtra: z.string().max(2000).nullish(),
  client: z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(20), email: z.union([z.literal(""), z.string().email().max(200)]).nullish() }),
  milestones: z.array(z.object({ title: z.string().trim().min(1).max(120), dueDate: z.string(), amountJod: z.number().min(0).max(1_000_000), checks: z.array(z.string().max(300)).max(30) })).max(12),
  kpis: z.array(z.object({ label: z.string().max(120), target: z.string().max(120) })).max(6).default([]),
  reportingCadence: z.enum(REPORTING_CADENCES).nullish(),
  mediaBudgetJod: z.number().min(0).max(10_000_000).nullish(),
  agencyLegalName: z.string().max(160).nullish(),
  agencyRegNumber: z.string().max(60).nullish(),
  clientRegNumber: z.string().max(60).nullish(),
  agencyTerms: z.string().max(3000).nullish(),
  clientTerms: z.string().max(3000).nullish(),
  ndaYears: z.number().int().refine((n) => (NDA_YEARS as readonly number[]).includes(n)).nullish(),
  signerName: z.string().max(80),
  agree: z.literal(true),
  requestId: z.string().uuid().nullish(),
  proposalId: z.string().uuid().nullish(),
  packageId: z.string().uuid().nullish(),
});

export async function createContractAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { agency } = await requireAgency();
  const locale = await getLocale();
  if (!rateLimit(`contract:${agency.id}`, 20, 60 * 60 * 1000)) return { error: "invalid" };
  let json: unknown;
  try {
    json = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "invalid" };
  }
  const parsed = draftSchema.safeParse(json);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    return { error: path === "client" ? "client" : path === "title" ? "title" : path === "agree" ? "agree" : "invalid" };
  }
  const d = parsed.data;
  const result = await createContract(agency.id, {
    ...d,
    items: normalizeLines(d.items, PLATFORMS),
    client: { ...d.client, email: d.client.email || null },
    milestones: d.milestones.map((m) => ({ title: m.title, dueDate: m.dueDate, amountFils: fils(m.amountJod), checks: m.checks })),
    signature: parseSignatureDataUrl(formData.get("signature")),
    signIp: await clientIp(),
    locale,
  });
  if ("error" in result) return { error: result.error satisfies ContractError };
  refresh();
  return redirect({ href: `/studio/contracts/${result.contract.id}?sent=1`, locale });
}

async function agencyContract(formData: FormData) {
  const { agency } = await requireAgency();
  const v = await getContractForAgency(agency.id, String(formData.get("contractId") ?? ""));
  if (!v) throw new Error("not found");
  return v;
}

export async function agencyTickAction(formData: FormData) {
  const v = await agencyContract(formData);
  await setCheck(v.contract.id, String(formData.get("milestoneId")), String(formData.get("checkId")), "agency", formData.get("value") === "1");
  refresh();
}

export async function agencySubmitAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const v = await agencyContract(formData);
  const r = await submitMilestone(v, String(formData.get("milestoneId")), String(formData.get("note") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function agencyReceivedAction(formData: FormData) {
  const v = await agencyContract(formData);
  await markDirectPayment(v, String(formData.get("milestoneId")), "agency");
  refresh();
}

export async function agencyCancelAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const v = await agencyContract(formData);
  const r = await cancelContract(v, "agency", String(formData.get("reason") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function agencyDisputeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const v = await agencyContract(formData);
  const r = await openDispute(v, "agency", String(formData.get("note") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

/** Extra work or money after signing: only a request, until the client accepts it. */
export async function agencyChangeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const v = await agencyContract(formData);
  const parsed = z
    .object({ title: z.string().max(120), reason: z.string().max(1000), amount: z.coerce.number().min(0).max(1_000_000), dueDate: z.string().max(10), checks: z.string().max(6000) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  const r = await requestChange(v, { title: d.title, reason: d.reason, amountFils: fils(d.amount), dueDate: d.dueDate, checks: d.checks.split("\n") });
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function agencyWithdrawChangeAction(formData: FormData) {
  const v = await agencyContract(formData);
  await withdrawChange(v, String(formData.get("changeId") ?? ""));
  refresh();
}

/** A progress update the client sees on the contract (the agreed reporting rhythm). */
export async function agencyUpdateAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const v = await agencyContract(formData);
  const r = await postUpdate(v, String(formData.get("text") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

// ── Client (private link, no account) ───────────────────────────────────

async function clientContract(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!rateLimit(`contract-client:${await clientIp()}`, 120, 10 * 60 * 1000)) return null;
  const v = await getContractByToken(token);
  return v ? { v, token } : null;
}

export async function clientSignAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const ip = await clientIp();
  if (!rateLimit(`sign:${ip}`, 10, 10 * 60 * 1000)) return { error: "rateLimited" };
  if (formData.get("agree") !== "on") return { error: "agree" };
  const r = await clientSign(token, String(formData.get("signer") ?? ""), ip, parseSignatureDataUrl(formData.get("signature")));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

/** Before signing: ask the agency to change something (it answers with a revised contract). */
export async function clientAmendAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const c = await clientContract(formData);
  if (!c) return { error: "notFound" };
  const r = await requestAmendment(c.v, String(formData.get("note") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function clientDeclineAction(formData: FormData) {
  const c = await clientContract(formData);
  if (c) await cancelContract(c.v, "client", String(formData.get("reason") ?? ""));
  refresh();
}

export async function clientFundAction(formData: FormData) {
  const locale = await getLocale();
  const c = await clientContract(formData);
  if (!c) return;
  const funding = await startMilestoneFunding(c.token, String(formData.get("milestoneId")));
  if (!funding) return redirect({ href: `/c/${c.token}`, locale });
  return redirect({ href: funding.redirectPath, locale });
}

/** Test checkout for milestone deposits: records the deposit through the same path a gateway uses. */
export async function clientMockPayAction(formData: FormData) {
  const locale = await getLocale();
  const c = await clientContract(formData);
  if (!c || !isTestPayments()) return;
  const m = c.v.milestones.find((x) => x.id === formData.get("milestoneId"));
  if (m && m.status === "pending") {
    const { applyProviderEvent } = await import("@/lib/data/payments");
    await applyProviderEvent("mock", { id: `evt_${crypto.randomUUID()}`, type: "payment.succeeded", paymentRef: `ms_${m.id}`, providerRef: `mock_${m.id.slice(0, 8)}`, amountFils: m.amountFils });
  }
  refresh();
  return redirect({ href: `/c/${c.token}?funded=1`, locale });
}

export async function clientTickAction(formData: FormData) {
  const c = await clientContract(formData);
  if (c) await setCheck(c.v.contract.id, String(formData.get("milestoneId")), String(formData.get("checkId")), "client", formData.get("value") === "1");
  refresh();
}

export async function clientApproveAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const c = await clientContract(formData);
  if (!c) return { error: "notFound" };
  const r = await approveMilestone(c.v, String(formData.get("milestoneId")));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function clientChangesAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const c = await clientContract(formData);
  if (!c) return { error: "notFound" };
  const r = await requestChanges(c.v, String(formData.get("milestoneId")), String(formData.get("note") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function clientPaidDirectAction(formData: FormData) {
  const c = await clientContract(formData);
  if (c) await markDirectPayment(c.v, String(formData.get("milestoneId")), "client");
  refresh();
}

export async function clientDisputeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const c = await clientContract(formData);
  if (!c) return { error: "notFound" };
  const r = await openDispute(c.v, "client", String(formData.get("note") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function clientDecideChangeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const c = await clientContract(formData);
  if (!c) return { error: "notFound" };
  const accept = formData.get("decision") === "accept";
  const r = await decideChange(c.v, String(formData.get("changeId") ?? ""), accept, String(formData.get("signer") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}
