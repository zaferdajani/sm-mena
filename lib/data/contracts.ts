import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  agencies,
  contractChanges,
  contractEvents,
  contracts,
  escrowLedger,
  milestoneChecks,
  milestones,
  type Contract,
  type ContractChange,
  type DeliverableLine,
  type Milestone,
  type MilestoneCheck,
} from "@/lib/db/schema";
import { open, seal } from "@/lib/auth/secret-box";
import { isTestPayments, paymentProvider } from "@/lib/payments/provider";
import { hashToken } from "./reviews";

// Contracts between a client and an agency, split into milestones.
//
// Two payment modes:
//  - protected: the client pays each milestone into Sawwiq before work on it
//    starts; the money is released to the agency only when the client confirms
//    every item on the milestone's checklist. Disputes go to an admin.
//  - direct: the client pays the agency however they agree. Sawwiq keeps the
//    contract, checklist and confirmations, but guarantees nothing about money.
//
// A contract can't change after it is sent: both signatures cover the same
// terms hash (sha256 of the canonical terms). To change it, cancel and resend.

// v2 adds targets (KPIs), the reporting rhythm, the client-paid ad budget and
// two fixed clauses: the client owns every account and file, and nothing costs
// more than signed unless the client approves a change request. v1 contracts
// keep their original fingerprint.
export const TERMS_VERSION = 2;
export const MAX_KPIS = 6;
export const REPORTING_CADENCES = ["weekly", "biweekly", "monthly"] as const;
export type ReportingCadence = (typeof REPORTING_CADENCES)[number];
export const CADENCE_DAYS: Record<ReportingCadence, number> = { weekly: 7, biweekly: 14, monthly: 31 };
export const MAX_MILESTONES = 12;
export const feePercent = () => Math.min(30, Math.max(0, Number(process.env.PLATFORM_FEE_PERCENT) || 0));

export type MilestoneInput = { title: string; dueDate: string; amountFils: number; checks: string[] };
export type ContractInput = {
  title: string;
  summary: string;
  items: DeliverableLine[];
  specialRequests: { text: string; milestone: number }[]; // milestone = index into milestones
  startDate: string;
  endDate: string;
  paymentMode: "protected" | "direct";
  nda: boolean;
  ndaExtra?: string | null;
  client: { name: string; phone: string; email?: string | null };
  milestones: MilestoneInput[];
  kpis?: { label: string; target: string }[];
  reportingCadence?: ReportingCadence | null;
  mediaBudgetJod?: number | null;
  signerName: string;
  locale: string;
  requestId?: string | null;
  proposalId?: string | null;
  packageId?: string | null;
};

export type ContractError =
  | "noMilestones"
  | "tooManyMilestones"
  | "dates"
  | "milestoneDate"
  | "amounts"
  | "emptyChecklist"
  | "kpis"
  | "signer";

const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));

/** Checks a contract draft. Pure, so the form can show the same errors. */
export function validateContract(input: Pick<ContractInput, "startDate" | "endDate" | "milestones" | "signerName" | "kpis">): ContractError | null {
  if (!input.milestones.length) return "noMilestones";
  if (input.milestones.length > MAX_MILESTONES) return "tooManyMilestones";
  if (!isDate(input.startDate) || !isDate(input.endDate) || input.endDate < input.startDate) return "dates";
  for (const m of input.milestones) {
    if (!isDate(m.dueDate) || m.dueDate < input.startDate || m.dueDate > input.endDate) return "milestoneDate";
    if (!Number.isInteger(m.amountFils) || m.amountFils < 0) return "amounts";
    if (!m.checks.some((c) => c.trim())) return "emptyChecklist";
  }
  if (input.milestones.reduce((s, m) => s + m.amountFils, 0) <= 0) return "amounts";
  if ((input.kpis?.length ?? 0) > MAX_KPIS || input.kpis?.some((k) => !k.label.trim() || !k.target.trim())) return "kpis";
  if (input.signerName.trim().length < 3) return "signer";
  return null;
}

/** Everything both parties agree to, in a stable order. Its hash is what gets signed. */
export function canonicalTerms(
  c: Omit<ContractInput, "signerName" | "locale" | "requestId" | "proposalId" | "packageId"> & { number: string; agencyId: string; feePercent: number; version?: number },
) {
  const version = c.version ?? TERMS_VERSION;
  return JSON.stringify({
    v: version,
    number: c.number,
    agencyId: c.agencyId,
    title: c.title.trim(),
    summary: c.summary.trim(),
    items: c.items.map((i) => [i.key, i.quantity, i.platform ?? null]),
    period: [c.startDate, c.endDate],
    paymentMode: c.paymentMode,
    feePercent: c.feePercent,
    nda: c.nda ? c.ndaExtra?.trim() || true : false,
    client: [c.client.name.trim(), c.client.phone.trim(), c.client.email?.trim() || null],
    milestones: c.milestones.map((m, i) => ({
      title: m.title.trim(),
      due: m.dueDate,
      amount: m.amountFils,
      checks: [...m.checks.map((t) => t.trim()).filter(Boolean), ...c.specialRequests.filter((r) => r.milestone === i).map((r) => `★ ${r.text.trim()}`)],
    })),
    ...(version >= 2
      ? {
          kpis: (c.kpis ?? []).map((k) => [k.label.trim(), k.target.trim()]),
          reporting: c.reportingCadence ?? null,
          mediaBudgetJod: c.mediaBudgetJod ?? null,
          clauses: ["client-owns-accounts-and-files", "no-extra-charges-without-approved-change"],
        }
      : {}),
  });
}
export const hashTerms = (canonical: string) => createHash("sha256").update(canonical).digest("hex");

function contractNumber() {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = randomBytes(6);
  return `SW-${new Date().getUTCFullYear()}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

async function logEvent(contractId: string, actor: "agency" | "client" | "admin" | "system", type: string, note?: string | null) {
  const db = await getDb();
  await db.insert(contractEvents).values({ contractId, actor, type, note: note?.slice(0, 2000) ?? null });
}

/** Trims and caps every field once, so what is hashed is exactly what is stored. */
function clean(input: ContractInput): ContractInput {
  const cut = (v: string, n: number) => v.trim().slice(0, n);
  const ms = input.milestones.map((m) => ({ ...m, title: cut(m.title, 120), checks: m.checks.map((c) => cut(c, 300)).filter(Boolean) }));
  return {
    ...input,
    title: cut(input.title, 120),
    summary: cut(input.summary, 2000),
    ndaExtra: input.nda ? (input.ndaExtra ? cut(input.ndaExtra, 2000) || null : null) : null,
    client: { name: cut(input.client.name, 80), phone: cut(input.client.phone, 20), email: input.client.email ? cut(input.client.email, 200) || null : null },
    milestones: ms,
    specialRequests: input.specialRequests.map((r) => ({ text: cut(r.text, 300), milestone: Math.min(Math.max(0, r.milestone), Math.max(0, ms.length - 1)) })).filter((r) => r.text),
    kpis: (input.kpis ?? []).map((k) => ({ label: cut(k.label, 120), target: cut(k.target, 120) })).filter((k) => k.label || k.target),
    reportingCadence: input.reportingCadence && (REPORTING_CADENCES as readonly string[]).includes(input.reportingCadence) ? input.reportingCadence : null,
    mediaBudgetJod: input.mediaBudgetJod && input.mediaBudgetJod > 0 ? Math.round(input.mediaBudgetJod) : null,
    signerName: cut(input.signerName, 80),
  };
}

export async function createContract(agencyId: string, raw: ContractInput): Promise<{ error: ContractError } | { contract: Contract; token: string }> {
  const input = clean(raw);
  const error = validateContract(input);
  if (error) return { error };
  const db = await getDb();
  const number = contractNumber();
  const token = randomBytes(18).toString("base64url");
  const fee = input.paymentMode === "protected" ? feePercent() : 0;
  const specialRequests = input.specialRequests;
  const terms = canonicalTerms({ ...input, specialRequests, number, agencyId, feePercent: fee });
  const totalFils = input.milestones.reduce((s, m) => s + m.amountFils, 0);

  const contract = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(contracts)
      .values({
        number,
        agencyId,
        requestId: input.requestId ?? null,
        proposalId: input.proposalId ?? null,
        packageId: input.packageId ?? null,
        locale: input.locale === "en" ? "en" : "ar",
        title: input.title,
        summary: input.summary,
        items: input.items,
        specialRequests: specialRequests.map((r) => r.text),
        startDate: input.startDate,
        endDate: input.endDate,
        totalFils,
        feePercent: fee,
        paymentMode: input.paymentMode,
        nda: input.nda,
        ndaExtra: input.ndaExtra,
        termsVersion: TERMS_VERSION,
        kpis: input.kpis ?? [],
        reportingCadence: input.reportingCadence ?? null,
        mediaBudgetJod: input.mediaBudgetJod ?? null,
        clientName: input.client.name,
        clientPhone: input.client.phone,
        clientEmail: input.client.email,
        clientTokenHash: hashToken(token),
        clientTokenEnc: seal(token),
        termsHash: hashTerms(terms),
        agencySignerName: input.signerName,
        agencySignedAt: new Date(),
      })
      .returning();
    for (const [i, m] of input.milestones.entries()) {
      const [ms] = await tx
        .insert(milestones)
        .values({ contractId: row.id, position: i, title: m.title, dueDate: m.dueDate, amountFils: m.amountFils })
        .returning();
      const checks = [
        ...m.checks.map((text) => ({ text, source: "deliverable" })),
        ...specialRequests.filter((r) => r.milestone === i).map((r) => ({ text: r.text, source: "special_request" })),
      ];
      await tx.insert(milestoneChecks).values(checks.map((c, position) => ({ milestoneId: ms.id, position, ...c })));
    }
    await tx.insert(contractEvents).values({ contractId: row.id, actor: "agency", type: "signed", note: input.signerName });
    return row;
  });
  return { contract, token };
}

export type ContractView = {
  contract: Contract;
  agency: { id: string; name: string; handle: string; whatsapp: string | null };
  milestones: (Milestone & { checks: MilestoneCheck[] })[];
  events: (typeof contractEvents.$inferSelect)[];
  money: { deposited: number; released: number; refunded: number; fees: number; held: number };
  changes: ContractChange[];
  /** The agency's latest progress update and whether it is late for the agreed rhythm. */
  reporting: { lastUpdateAt: Date | null; overdue: boolean; dueEveryDays: number | null };
};

/** Late when no update within the agreed rhythm (plus two days' grace) while the contract runs. */
export function reportingState(c: Pick<Contract, "reportingCadence" | "status" | "clientSignedAt">, lastUpdateAt: Date | null, now = new Date()) {
  const every = c.reportingCadence && c.reportingCadence in CADENCE_DAYS ? CADENCE_DAYS[c.reportingCadence as ReportingCadence] : null;
  const since = lastUpdateAt ?? c.clientSignedAt;
  const overdue = Boolean(every && c.status === "active" && since && now.getTime() - since.getTime() > (every + 2) * 86_400_000);
  return { lastUpdateAt, overdue, dueEveryDays: every };
}

async function view(contract: Contract): Promise<ContractView> {
  const db = await getDb();
  const [agency] = await db.select({ id: agencies.id, name: agencies.name, handle: agencies.handle, whatsapp: agencies.whatsapp }).from(agencies).where(eq(agencies.id, contract.agencyId));
  const ms = await db.select().from(milestones).where(eq(milestones.contractId, contract.id)).orderBy(asc(milestones.position));
  const checks = ms.length ? await db.select().from(milestoneChecks).where(inArray(milestoneChecks.milestoneId, ms.map((m) => m.id))).orderBy(asc(milestoneChecks.position)) : [];
  const evs = await db.select().from(contractEvents).where(eq(contractEvents.contractId, contract.id)).orderBy(desc(contractEvents.createdAt)).limit(100);
  const ledger = await db
    .select({ type: escrowLedger.type, n: sql<number>`coalesce(sum(${escrowLedger.amountFils}), 0)::int` })
    .from(escrowLedger)
    .where(and(eq(escrowLedger.contractId, contract.id), eq(escrowLedger.status, "succeeded")))
    .groupBy(escrowLedger.type);
  const sum = (t: string) => ledger.find((l) => l.type === t)?.n ?? 0;
  const money = { deposited: sum("deposit"), released: sum("release"), refunded: sum("refund"), fees: sum("fee") };
  const changes = await db.select().from(contractChanges).where(eq(contractChanges.contractId, contract.id)).orderBy(desc(contractChanges.createdAt));
  const [lastUpdate] = await db
    .select({ at: contractEvents.createdAt })
    .from(contractEvents)
    .where(and(eq(contractEvents.contractId, contract.id), eq(contractEvents.type, "update")))
    .orderBy(desc(contractEvents.createdAt))
    .limit(1);
  return {
    changes,
    reporting: reportingState(contract, lastUpdate?.at ?? null),
    contract,
    agency,
    milestones: ms.map((m) => ({ ...m, checks: checks.filter((c) => c.milestoneId === m.id) })),
    events: evs,
    money: { ...money, held: money.deposited - money.released - money.refunded - money.fees },
  };
}

export async function getContractByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const db = await getDb();
  const [c] = await db.select().from(contracts).where(eq(contracts.clientTokenHash, hashToken(token)));
  return c ? view(c) : null;
}

export async function getContractForAgency(agencyId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [c] = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.agencyId, agencyId)));
  return c ? view(c) : null;
}

export async function getContractById(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [c] = await db.select().from(contracts).where(eq(contracts.id, id));
  return c ? view(c) : null;
}

/** The client's private link token (for the agency to share again). */
export const clientToken = (c: Contract) => open(c.clientTokenEnc);

export async function contractsForRequest(requestId: string) {
  const db = await getDb();
  return db.select().from(contracts).where(eq(contracts.requestId, requestId)).orderBy(desc(contracts.createdAt));
}

export async function listAgencyContracts(agencyId: string) {
  const db = await getDb();
  return db.select().from(contracts).where(eq(contracts.agencyId, agencyId)).orderBy(desc(contracts.createdAt)).limit(100);
}

/** Recomputes the hash of what is stored, so a signature always covers the stored terms. */
function storedTermsHash(v: ContractView) {
  const c = v.contract;
  // Milestones added later by approved change requests are not part of the signed terms.
  const added = new Set(v.changes.map((ch) => ch.milestoneId).filter(Boolean));
  const signed = v.milestones.filter((m) => !added.has(m.id));
  const ms = signed.map((m) => ({
    title: m.title,
    dueDate: m.dueDate,
    amountFils: m.amountFils,
    checks: m.checks.filter((k) => k.source === "deliverable").map((k) => k.text),
  }));
  const specialRequests = signed.flatMap((m, i) => m.checks.filter((k) => k.source === "special_request").map((k) => ({ text: k.text, milestone: i })));
  return hashTerms(
    canonicalTerms({
      number: c.number,
      agencyId: c.agencyId,
      feePercent: c.feePercent,
      title: c.title,
      summary: c.summary,
      items: c.items,
      specialRequests,
      startDate: c.startDate,
      endDate: c.endDate,
      paymentMode: c.paymentMode,
      nda: c.nda,
      ndaExtra: c.ndaExtra,
      client: { name: c.clientName, phone: c.clientPhone, email: c.clientEmail },
      milestones: ms,
      version: c.termsVersion,
      kpis: c.kpis,
      reportingCadence: (c.reportingCadence as ReportingCadence | null) ?? null,
      mediaBudgetJod: c.mediaBudgetJod,
    }),
  );
}

type Result = { ok: true } | { error: string };

export async function clientSign(token: string, signerName: string, ip: string): Promise<Result> {
  const v = await getContractByToken(token);
  if (!v) return { error: "notFound" };
  if (v.contract.status !== "sent") return { error: "notSignable" };
  if (signerName.trim().length < 3) return { error: "signer" };
  if (storedTermsHash(v) !== v.contract.termsHash) return { error: "tampered" };
  const db = await getDb();
  await db
    .update(contracts)
    .set({ status: "active", clientSignerName: signerName.trim().slice(0, 80), clientSignedAt: new Date(), clientSignIpHash: createHash("sha256").update(`sawwiq-sign:${ip}`).digest("hex"), updatedAt: new Date() })
    .where(and(eq(contracts.id, v.contract.id), eq(contracts.status, "sent")));
  await logEvent(v.contract.id, "client", "signed", signerName.trim());
  return { ok: true };
}

/** The milestone the client can pay into next (protected mode): the first pending one, in order. */
export function nextFundable(v: ContractView) {
  if (v.contract.paymentMode !== "protected" || v.contract.status !== "active") return null;
  return v.milestones.find((m) => m.status === "pending") ?? null;
}

/** Starts the client's payment for a milestone. Returns where to send them. */
export async function startMilestoneFunding(token: string, milestoneId: string) {
  const v = await getContractByToken(token);
  const m = v && nextFundable(v);
  if (!v || !m || m.id !== milestoneId) return null;
  // The built-in test checkout for milestones lives next to the contract page.
  if (isTestPayments()) return { redirectPath: `/c/${token}/fund/${m.id}`, milestone: m, contract: v.contract };
  const checkout = await paymentProvider().createCheckout({ paymentRef: `ms_${m.id}`, amountFils: m.amountFils, description: `${v.contract.number} · ${m.title}`, returnPath: `/c/${token}` });
  return { redirectPath: checkout.redirectPath, milestone: m, contract: v.contract };
}

/** A verified deposit for a milestone (from the payment provider). Idempotent. */
export async function recordDeposit(milestoneId: string, amountFils: number, providerRef: string) {
  const db = await getDb();
  const [m] = await db.select().from(milestones).where(eq(milestones.id, milestoneId));
  if (!m) return "unknown_payment" as const;
  if (m.amountFils !== amountFils) return "amount_mismatch" as const;
  if (m.status !== "pending") return "duplicate" as const;
  await db.transaction(async (tx) => {
    await tx.insert(escrowLedger).values({ contractId: m.contractId, milestoneId, type: "deposit", amountFils, provider: paymentProvider().id, providerRef });
    await tx.update(milestones).set({ status: "funded", fundedAt: new Date() }).where(eq(milestones.id, milestoneId));
  });
  await logEvent(m.contractId, "client", "funded", m.title);
  return "ok" as const;
}

async function milestoneOf(contractId: string, milestoneId: string) {
  const db = await getDb();
  const [m] = await db.select().from(milestones).where(and(eq(milestones.id, milestoneId), eq(milestones.contractId, contractId)));
  return m ?? null;
}

/** Tick or untick a checklist item. The agency ticks "done"; the client ticks "confirmed". */
export async function setCheck(contractId: string, milestoneId: string, checkId: string, by: "agency" | "client", value: boolean): Promise<Result> {
  const m = await milestoneOf(contractId, milestoneId);
  if (!m) return { error: "notFound" };
  const editable = by === "agency" ? ["pending", "funded", "changes_requested"] : ["submitted"];
  if (!editable.includes(m.status)) return { error: "locked" };
  const db = await getDb();
  await db
    .update(milestoneChecks)
    .set(by === "agency" ? { doneByAgency: value } : { confirmedByClient: value })
    .where(and(eq(milestoneChecks.id, checkId), eq(milestoneChecks.milestoneId, milestoneId)));
  return { ok: true };
}

/** Agency: work on this milestone is done. Protected milestones must be funded first. */
export async function submitMilestone(v: ContractView, milestoneId: string, note: string): Promise<Result> {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || v.contract.status !== "active") return { error: "notFound" };
  const ready = v.contract.paymentMode === "protected" ? ["funded", "changes_requested"] : ["pending", "changes_requested"];
  if (!ready.includes(m.status)) return { error: m.status === "pending" ? "notFunded" : "locked" };
  if (m.checks.some((c) => !c.doneByAgency)) return { error: "checklist" };
  const db = await getDb();
  await db.update(milestones).set({ status: "submitted", submittedAt: new Date(), submissionNote: note.trim().slice(0, 2000) || null }).where(eq(milestones.id, m.id));
  await logEvent(v.contract.id, "agency", "submitted", `${m.title}${note.trim() ? `: ${note.trim()}` : ""}`);
  return { ok: true };
}

export async function requestChanges(v: ContractView, milestoneId: string, note: string): Promise<Result> {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || m.status !== "submitted") return { error: "locked" };
  if (note.trim().length < 3) return { error: "note" };
  const db = await getDb();
  await db.update(milestones).set({ status: "changes_requested", changesNote: note.trim().slice(0, 2000) }).where(eq(milestones.id, m.id));
  await db.update(milestoneChecks).set({ confirmedByClient: false }).where(eq(milestoneChecks.milestoneId, m.id));
  await logEvent(v.contract.id, "client", "changes_requested", `${m.title}: ${note.trim()}`);
  return { ok: true };
}

/** Pays out a funded milestone to the agency (less the platform fee, if any). */
async function release(contract: Contract, m: Milestone, actor: "client" | "admin", note?: string) {
  const db = await getDb();
  const fee = Math.round((m.amountFils * contract.feePercent) / 100);
  await db.transaction(async (tx) => {
    await tx.insert(escrowLedger).values({ contractId: contract.id, milestoneId: m.id, type: "release", amountFils: m.amountFils - fee, provider: paymentProvider().id, status: "succeeded", note: note ?? null });
    if (fee) await tx.insert(escrowLedger).values({ contractId: contract.id, milestoneId: m.id, type: "fee", amountFils: fee, provider: paymentProvider().id });
    await tx.update(milestones).set({ status: "released", approvedAt: m.approvedAt ?? new Date(), releasedAt: new Date() }).where(eq(milestones.id, m.id));
  });
  await logEvent(contract.id, actor, "released", m.title);
}

async function completeIfDone(contractId: string) {
  const db = await getDb();
  const ms = await db.select({ status: milestones.status }).from(milestones).where(eq(milestones.contractId, contractId));
  const finished = ms.every((m) => ["approved", "released", "refunded", "cancelled"].includes(m.status));
  if (finished && ms.some((m) => m.status === "approved" || m.status === "released")) {
    await db.update(contracts).set({ status: "completed", completedAt: new Date(), updatedAt: new Date() }).where(and(eq(contracts.id, contractId), inArray(contracts.status, ["active", "disputed"])));
    await logEvent(contractId, "system", "completed");
  }
}

/** Client confirms every checklist item: the milestone is approved and, if protected, paid out. */
export async function approveMilestone(v: ContractView, milestoneId: string): Promise<Result> {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || m.status !== "submitted" || v.contract.status !== "active") return { error: "locked" };
  if (m.checks.some((c) => !c.confirmedByClient)) return { error: "checklist" };
  const db = await getDb();
  await db.update(milestones).set({ status: "approved", approvedAt: new Date() }).where(eq(milestones.id, m.id));
  await logEvent(v.contract.id, "client", "approved", m.title);
  if (v.contract.paymentMode === "protected") await release(v.contract, { ...m, approvedAt: new Date() }, "client");
  await completeIfDone(v.contract.id);
  return { ok: true };
}

/** Direct mode bookkeeping: the client says it paid; the agency confirms it received the money. */
export async function markDirectPayment(v: ContractView, milestoneId: string, by: "client" | "agency"): Promise<Result> {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || v.contract.paymentMode !== "direct") return { error: "notFound" };
  const db = await getDb();
  await db.update(milestones).set(by === "client" ? { clientPaidDirect: true } : { agencyConfirmedPaid: true }).where(eq(milestones.id, m.id));
  await logEvent(v.contract.id, by, by === "client" ? "paid_direct" : "payment_received", m.title);
  return { ok: true };
}

/**
 * Either side can cancel before the client signs. After that, cancelling is
 * only possible while no money is held; otherwise open a dispute.
 */
export async function cancelContract(v: ContractView, by: "agency" | "client", reason: string): Promise<Result> {
  if (!["sent", "active"].includes(v.contract.status)) return { error: "locked" };
  if (v.money.held > 0) return { error: "moneyHeld" };
  const db = await getDb();
  await db.update(contracts).set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(eq(contracts.id, v.contract.id));
  await db.update(milestones).set({ status: "cancelled" }).where(and(eq(milestones.contractId, v.contract.id), inArray(milestones.status, ["pending", "changes_requested", "submitted"])));
  await logEvent(v.contract.id, by, "cancelled", reason.trim().slice(0, 500) || null);
  return { ok: true };
}

export async function openDispute(v: ContractView, by: "agency" | "client", note: string): Promise<Result> {
  if (v.contract.status !== "active") return { error: "locked" };
  if (note.trim().length < 5) return { error: "note" };
  const db = await getDb();
  await db.update(contracts).set({ status: "disputed", updatedAt: new Date() }).where(eq(contracts.id, v.contract.id));
  await logEvent(v.contract.id, by, "dispute", note.trim());
  return { ok: true };
}

/** Admin decision on a funded milestone in a dispute: pay the agency, or refund the client. */
export async function resolveMilestone(contractId: string, milestoneId: string, decision: "release" | "refund", note: string): Promise<Result> {
  const v = await getContractById(contractId);
  const m = v?.milestones.find((x) => x.id === milestoneId);
  if (!v || !m || !["funded", "submitted", "changes_requested", "approved"].includes(m.status)) return { error: "locked" };
  if (decision === "release") {
    await release(v.contract, m, "admin", note);
  } else {
    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.insert(escrowLedger).values({ contractId, milestoneId, type: "refund", amountFils: m.amountFils, provider: paymentProvider().id, note: note.slice(0, 500) });
      await tx.update(milestones).set({ status: "refunded" }).where(eq(milestones.id, milestoneId));
    });
    await logEvent(contractId, "admin", "refunded", `${m.title}: ${note}`);
  }
  await completeIfDone(contractId);
  return { ok: true };
}

/** Admin: end a dispute and let the contract continue. */
export async function closeDispute(contractId: string, note: string) {
  const db = await getDb();
  await db.update(contracts).set({ status: "active", updatedAt: new Date() }).where(and(eq(contracts.id, contractId), eq(contracts.status, "disputed")));
  await logEvent(contractId, "admin", "dispute_closed", note);
  await completeIfDone(contractId);
}

/** Protected-payment totals and open disputes for Admin → Payments. */
export async function escrowOverview() {
  const db = await getDb();
  const [totals, disputes, active] = await Promise.all([
    db
      .select({ type: escrowLedger.type, n: sql<number>`coalesce(sum(${escrowLedger.amountFils}), 0)::int` })
      .from(escrowLedger)
      .where(eq(escrowLedger.status, "succeeded"))
      .groupBy(escrowLedger.type),
    db.select().from(contracts).where(eq(contracts.status, "disputed")).orderBy(desc(contracts.updatedAt)),
    db
      .select({ mode: contracts.paymentMode, status: contracts.status, n: sql<number>`count(*)::int` })
      .from(contracts)
      .groupBy(contracts.paymentMode, contracts.status),
  ]);
  const sum = (t: string) => totals.find((x) => x.type === t)?.n ?? 0;
  const disputeViews = await Promise.all(disputes.map((c) => view(c)));
  return {
    deposited: sum("deposit"),
    released: sum("release"),
    refunded: sum("refund"),
    fees: sum("fee"),
    held: sum("deposit") - sum("release") - sum("refund") - sum("fee"),
    disputes: disputeViews,
    counts: active,
  };
}

/** Prefill for a contract from a quote the agency won (only its own, accepted quotes). */
export async function proposalForContract(agencyId: string, proposalId: string) {
  if (!/^[0-9a-f-]{36}$/.test(proposalId)) return null;
  const db = await getDb();
  const { proposals, projectRequests } = await import("@/lib/db/schema");
  const [row] = await db
    .select({ proposal: proposals, request: projectRequests })
    .from(proposals)
    .innerJoin(projectRequests, eq(projectRequests.id, proposals.requestId))
    .where(and(eq(proposals.id, proposalId), eq(proposals.agencyId, agencyId), eq(proposals.status, "accepted")));
  return row ?? null;
}

// ── Protections after signing (docs/20-client-voice.md) ─────────────────

export type ChangeInput = { title: string; reason: string; amountFils: number; dueDate: string; checks: string[] };

/** Agency: ask for extra work or money. Nothing changes until the client accepts. */
export async function requestChange(v: ContractView, raw: ChangeInput): Promise<Result> {
  if (v.contract.status !== "active") return { error: "locked" };
  const title = raw.title.trim().slice(0, 120);
  const reason = raw.reason.trim().slice(0, 1000);
  const checks = raw.checks.map((c) => c.trim().slice(0, 300)).filter(Boolean).slice(0, 20);
  if (title.length < 3 || reason.length < 5) return { error: "note" };
  if (!Number.isInteger(raw.amountFils) || raw.amountFils < 0 || raw.amountFils > 1_000_000_000) return { error: "amounts" };
  if (!isDate(raw.dueDate) || raw.dueDate < v.contract.startDate) return { error: "milestoneDate" };
  if (!checks.length) return { error: "emptyChecklist" };
  if (v.changes.filter((c) => c.status === "pending").length >= 3) return { error: "tooMany" };
  const db = await getDb();
  await db.insert(contractChanges).values({ contractId: v.contract.id, title, reason, amountFils: raw.amountFils, dueDate: raw.dueDate, checks });
  await logEvent(v.contract.id, "agency", "change_requested", `${title} (${raw.amountFils / 1000} JOD): ${reason}`);
  return { ok: true };
}

/** Agency: take back a change request the client hasn't answered. */
export async function withdrawChange(v: ContractView, changeId: string): Promise<Result> {
  const ch = v.changes.find((c) => c.id === changeId && c.status === "pending");
  if (!ch) return { error: "notFound" };
  const db = await getDb();
  await db.update(contractChanges).set({ status: "withdrawn", decidedAt: new Date() }).where(eq(contractChanges.id, ch.id));
  await logEvent(v.contract.id, "agency", "change_withdrawn", ch.title);
  return { ok: true };
}

/**
 * Client: accept (typed name, like a signature) or decline. Accepting adds the
 * work as a new milestone with its own checklist and amount, and raises the
 * contract total; declining leaves the contract exactly as signed.
 */
export async function decideChange(v: ContractView, changeId: string, accept: boolean, signerName: string): Promise<Result> {
  const ch = v.changes.find((c) => c.id === changeId && c.status === "pending");
  if (!ch || v.contract.status !== "active") return { error: "notFound" };
  const name = signerName.trim().slice(0, 80);
  if (accept && name.length < 3) return { error: "signer" };
  const db = await getDb();
  if (!accept) {
    await db.update(contractChanges).set({ status: "declined", decidedAt: new Date(), decidedBy: name || null }).where(eq(contractChanges.id, ch.id));
    await logEvent(v.contract.id, "client", "change_declined", ch.title);
    return { ok: true };
  }
  await db.transaction(async (tx) => {
    const [ms] = await tx
      .insert(milestones)
      .values({ contractId: v.contract.id, position: v.milestones.length, title: ch.title, dueDate: ch.dueDate, amountFils: ch.amountFils })
      .returning();
    await tx.insert(milestoneChecks).values(ch.checks.map((text, position) => ({ milestoneId: ms.id, position, text, source: "deliverable" })));
    await tx.update(contractChanges).set({ status: "accepted", decidedAt: new Date(), decidedBy: name, milestoneId: ms.id }).where(eq(contractChanges.id, ch.id));
    await tx
      .update(contracts)
      // The signed dates stay as signed; the new milestone carries its own due date.
      .set({ totalFils: sql`${contracts.totalFils} + ${ch.amountFils}`, updatedAt: new Date() })
      .where(eq(contracts.id, v.contract.id));
  });
  await logEvent(v.contract.id, "client", "change_accepted", `${ch.title} (${name})`);
  return { ok: true };
}

/** Agency: a progress update (what was done, numbers against the targets, what's next). */
export async function postUpdate(v: ContractView, text: string): Promise<Result> {
  if (!["active", "disputed"].includes(v.contract.status)) return { error: "locked" };
  const note = text.trim().slice(0, 2000);
  if (note.length < 10) return { error: "note" };
  await logEvent(v.contract.id, "agency", "update", note);
  return { ok: true };
}
