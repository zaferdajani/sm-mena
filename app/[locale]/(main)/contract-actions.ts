"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { MAX_REVISION_ROUNDS } from "@/lib/contracts/rules";
import { acceptCancellation, declineCancellation, proposeCancellation, withdrawCancellation } from "@/lib/data/contract-cancel";
import { acceptDecision, addEvidence, appealDispute } from "@/lib/data/contract-disputes";
import { answerContractRequest, requestContractFromPartner } from "@/lib/data/contract-requests";
import {
  approveMilestone,
  askExtraRound,
  cancelContract,
  clientBasePath,
  createContract,
  decideChange,
  getContractByToken,
  getContractForAgency,
  getContractForClientAgency,
  grantExtraRound,
  markDirectPayment,
  openDispute,
  NDA_YEARS,
  postUpdate,
  REPORTING_CADENCES,
  requestAmendment,
  requestChange,
  requestChanges,
  setCheck,
  signAsClient,
  startMilestoneFunding,
  submitMilestone,
  withdrawChange,
  type ContractError,
  type ContractView,
} from "@/lib/data/contracts";
import { normalizeLines } from "@/lib/deliverables";
import { PLATFORMS } from "@/lib/labels";
import { parseSignatureDataUrl } from "@/lib/pdf/signature-image";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getVisitorId } from "@/lib/visitor";

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
  revisionRounds: z.number().int().min(0).max(MAX_REVISION_ROUNDS).default(2),
  clientAgencyId: z.string().uuid().nullish(),
  contractRequestId: z.string().uuid().nullish(),
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
    return { error: path === "client" ? "client" : path === "title" ? "title" : path === "agree" ? "agree" : path === "revisionRounds" ? "rounds" : "invalid" };
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

/** Agency: give the client one more round of changes on a milestone, free. */
export async function agencyGrantRoundAction(formData: FormData) {
  const v = await agencyContract(formData);
  await grantExtraRound(v, String(formData.get("milestoneId") ?? ""));
  refresh();
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
  const d = disputeSchema.safeParse(Object.fromEntries(formData));
  if (!d.success) return { error: "note" };
  const r = await openDispute(v, "agency", d.data.note, d.data.milestoneId || null);
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

/**
 * The client's side of a contract: the private link (token), or — for partner
 * contracts — the buying agency signed in to its studio (contractId + as=buyer).
 * `base` is where the client's pages for this contract live.
 */
async function clientContract(formData: FormData): Promise<{ v: ContractView; token: string | null; base: string } | null> {
  const token = String(formData.get("token") ?? "");
  if (token) {
    if (!rateLimit(`contract-client:${await clientIp()}`, 120, 10 * 60 * 1000)) return null;
    const v = await getContractByToken(token);
    return v ? { v, token, base: clientBasePath(v, token) } : null;
  }
  if (formData.get("as") !== "buyer") return null;
  const { agency } = await requireAgency();
  const v = await getContractForClientAgency(agency.id, String(formData.get("contractId") ?? ""));
  return v ? { v, token: null, base: clientBasePath(v) } : null;
}

/** Either side, for the shared dispute and cancellation actions. */
async function partyContract(formData: FormData): Promise<{ v: ContractView; side: "agency" | "client" } | null> {
  if (formData.get("token") || formData.get("as") === "buyer") {
    const c = await clientContract(formData);
    return c ? { v: c.v, side: "client" } : null;
  }
  const { agency } = await requireAgency();
  const v = await getContractForAgency(agency.id, String(formData.get("contractId") ?? ""));
  return v ? { v, side: "agency" } : null;
}

const done = (r: { ok: true } | { error: string }): ActionState => ("error" in r ? { error: r.error } : { ok: true });

export async function clientSignAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!rateLimit(`sign:${ip}`, 10, 10 * 60 * 1000)) return { error: "rateLimited" };
  if (formData.get("agree") !== "on") return { error: "agree" };
  const c = await clientContract(formData);
  if (!c) return { error: "notFound" };
  const visitorId = c.token ? await getVisitorId({ create: true }) : null;
  const r = await signAsClient(c.v, String(formData.get("signer") ?? ""), ip, parseSignatureDataUrl(formData.get("signature")), visitorId);
  refresh();
  return done(r);
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
  const funding = await startMilestoneFunding(c.v, String(formData.get("milestoneId")), c.base);
  if (!funding) return redirect({ href: c.base, locale });
  return redirect({ href: funding.redirectPath, locale });
}

/**
 * Test checkout for milestone deposits (contracts sent in test mode only):
 * records the deposit through the same path a payment partner's verified
 * notification uses, so it is applied once however often it is clicked.
 */
export async function clientMockPayAction(formData: FormData) {
  const locale = await getLocale();
  const c = await clientContract(formData);
  if (!c || c.v.contract.paymentsLive) return;
  const m = c.v.milestones.find((x) => x.id === formData.get("milestoneId"));
  if (m && m.status === "pending") {
    const { applyProviderEvent } = await import("@/lib/data/payments");
    await applyProviderEvent("mock", { id: `evt_${crypto.randomUUID()}`, type: "payment.succeeded", paymentRef: `ms_${m.id}`, providerRef: `mock_${m.id.slice(0, 8)}`, amountFils: m.amountFils, currency: c.v.contract.currency });
  }
  refresh();
  return redirect({ href: `${c.base}?funded=1`, locale });
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

const disputeSchema = z.object({ note: z.string().trim().min(5).max(4000), milestoneId: z.union([z.literal(""), z.string().uuid()]).optional() });

export async function clientDisputeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const c = await clientContract(formData);
  if (!c) return { error: "notFound" };
  const d = disputeSchema.safeParse(Object.fromEntries(formData));
  if (!d.success) return { error: "note" };
  const r = await openDispute(c.v, "client", d.data.note, d.data.milestoneId || null);
  refresh();
  return done(r);
}

/** Client with no revision rounds left: ask the agency for one more. */
export async function clientAskRoundAction(formData: FormData) {
  const c = await clientContract(formData);
  if (c) await askExtraRound(c.v, String(formData.get("milestoneId") ?? ""));
  refresh();
}

// ── Disputes and mutual cancellation (either side) ──────────────────────

const evidenceSchema = z.object({ disputeId: z.string().uuid(), body: z.string().trim().min(3).max(4000), links: z.string().max(3000).default("") });

export async function evidenceAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const p = await partyContract(formData);
  if (!p) return { error: "notFound" };
  const d = evidenceSchema.safeParse(Object.fromEntries(formData));
  if (!d.success) return { error: "note" };
  const r = await addEvidence(p.v, p.side, d.data.disputeId, d.data.body, d.data.links);
  refresh();
  return done(r);
}

export async function appealAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const p = await partyContract(formData);
  if (!p) return { error: "notFound" };
  const d = z.object({ disputeId: z.string().uuid(), note: z.string().trim().min(10).max(4000) }).safeParse(Object.fromEntries(formData));
  if (!d.success) return { error: "note" };
  const r = await appealDispute(p.v, p.side, d.data.disputeId, d.data.note);
  refresh();
  return done(r);
}

export async function acceptDecisionAction(formData: FormData) {
  const p = await partyContract(formData);
  const id = z.string().uuid().safeParse(formData.get("disputeId"));
  if (p && id.success) await acceptDecision(p.v, p.side, id.data);
  refresh();
}

/**
 * Propose a mutual cancellation. For each held milestone the form sends
 * `release_<milestoneId>` (the amount to pay the agency, in the contract's
 * currency); the rest of what is held is refunded to the client.
 */
export async function proposeCancelAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const p = await partyContract(formData);
  if (!p) return { error: "notFound" };
  const note = z.string().max(1000).safeParse(formData.get("note") ?? "");
  if (!note.success) return { error: "invalid" };
  const splits: { milestoneId: string; releaseFils: number; refundFils: number }[] = [];
  for (const m of p.v.milestones) {
    const held = p.v.heldBy[m.id] ?? 0;
    if (held <= 0) continue;
    const raw = formData.get(`release_${m.id}`);
    const amount = z.coerce.number().min(0).max(held / 1000).safeParse(raw === null || raw === "" ? 0 : raw);
    if (!amount.success) return { error: "split" };
    const releaseFils = Math.min(held, fils(amount.data));
    splits.push({ milestoneId: m.id, releaseFils, refundFils: held - releaseFils });
  }
  const r = await proposeCancellation(p.v, p.side, note.data, splits);
  refresh();
  return done(r);
}

export async function answerCancelAction(formData: FormData) {
  const p = await partyContract(formData);
  const d = z.object({ proposalId: z.string().uuid(), answer: z.enum(["accept", "decline", "withdraw"]) }).safeParse(Object.fromEntries(formData));
  if (!p || !d.success) return;
  const fn = d.data.answer === "accept" ? acceptCancellation : d.data.answer === "decline" ? declineCancellation : withdrawCancellation;
  await fn(p.v, p.side, d.data.proposalId);
  refresh();
}

// ── Partner contracts (docs/30) ─────────────────────────────────────────

/** An agency asks an accepted partner to send it a contract for work. */
export async function requestPartnerContractAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const { agency } = await requireAgency();
  if (!rateLimit(`contract-request:${agency.id}`, 20, 60 * 60 * 1000)) return { error: "rateLimited" };
  const d = z
    .object({ toAgencyId: z.string().uuid(), title: z.string().trim().min(3).max(120), brief: z.string().trim().max(2000).default(""), budget: z.union([z.literal(""), z.coerce.number().min(0).max(10_000_000)]).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!d.success) return { error: "invalid" };
  const r = await requestContractFromPartner(agency, d.data.toAgencyId, { title: d.data.title, brief: d.data.brief, budgetFils: typeof d.data.budget === "number" ? fils(d.data.budget) : null });
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}

export async function answerContractRequestAction(formData: FormData) {
  const { agency } = await requireAgency();
  const d = z.object({ requestId: z.string().uuid(), answer: z.enum(["declined", "cancelled"]) }).safeParse(Object.fromEntries(formData));
  if (d.success) await answerContractRequest(agency.id, d.data.requestId, d.data.answer);
  refresh();
}

export async function clientDecideChangeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const c = await clientContract(formData);
  if (!c) return { error: "notFound" };
  const accept = formData.get("decision") === "accept";
  const r = await decideChange(c.v, String(formData.get("changeId") ?? ""), accept, String(formData.get("signer") ?? ""));
  refresh();
  return "error" in r ? { error: r.error } : { ok: true };
}
