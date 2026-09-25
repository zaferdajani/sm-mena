import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { currencyOf } from "@/lib/countries";
import { canRequestChanges, clampRounds, DEFAULT_REVISION_ROUNDS, isHeld, reviewDaysSetting, reviewDeadline, roundsState } from "@/lib/contracts/rules";
import { LEGAL_VERSION } from "@/lib/legal/jurisdictions";
import { getDb } from "@/lib/db";
import {
  agencies,
  cancellationProposals,
  contractChanges,
  contractEvents,
  contractRequests,
  contracts,
  disputeEvidence,
  escrowLedger,
  milestoneChecks,
  milestoneDisputes,
  milestones,
  partnerRequests,
  reviewRequests,
  type CancellationProposal,
  type Contract,
  type ContractChange,
  type DeliverableLine,
  type DisputeEvidence,
  type EscrowEntry,
  type Milestone,
  type MilestoneCheck,
  type MilestoneDispute,
} from "@/lib/db/schema";
import { seal, tryOpen } from "@/lib/auth/secret-box";
import { paymentProvider } from "@/lib/payments/provider";
import { protectedPaymentsLive } from "@/lib/payments/readiness";
import { notifyContract } from "./contract-notify";
import { isUniqueViolation, ledgerKey, settleMilestone } from "./escrow";
import { hashToken, INVITE_DAYS } from "./reviews";

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
//
// v3 (docs/22-legal-documents.md) adds the universal general conditions
// (lib/legal/clauses.ts, by version), the governing law and courts of the
// agency's country, both parties' legal identity, each side's special
// conditions, the NDA term, and a drawn signature from each signer.
//
// v4 (docs/14-contracts-and-milestones.md) adds the review period before a
// delivery counts as accepted, the revision rounds each milestone includes,
// whether protected payments were live or in test mode, and the buying
// agency for partner contracts.
export const TERMS_VERSION = 4;
export const MAX_KPIS = 6;
export const REPORTING_CADENCES = ["weekly", "biweekly", "monthly"] as const;
export type ReportingCadence = (typeof REPORTING_CADENCES)[number];
export const CADENCE_DAYS: Record<ReportingCadence, number> = { weekly: 7, biweekly: 14, monthly: 31 };
export const MAX_MILESTONES = 12;
/**
 * Sawwiq's fee for guaranteeing payment and delivery: 10% of every released
 * milestone by default (PLATFORM_FEE_PERCENT overrides it, 0–30).
 */
export const DEFAULT_FEE_PERCENT = 10;
export const feePercent = () => {
  const raw = process.env.PLATFORM_FEE_PERCENT?.trim();
  const n = raw ? Number(raw) : DEFAULT_FEE_PERCENT;
  return Number.isFinite(n) ? Math.min(30, Math.max(0, n)) : DEFAULT_FEE_PERCENT;
};
export const NDA_YEARS = [1, 2, 3, 5] as const;

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
  /** v3: legal identity and each side's special conditions. */
  agencyLegalName?: string | null;
  agencyRegNumber?: string | null;
  clientRegNumber?: string | null;
  agencyTerms?: string | null;
  clientTerms?: string | null;
  ndaYears?: number | null;
  /** v4: rounds of "request changes" each milestone includes (default 2). */
  revisionRounds?: number | null;
  /** v4: partner contracts — the agency buying the work (must be an accepted partner). */
  clientAgencyId?: string | null;
  /** The partner's contract request this answers, if any. */
  contractRequestId?: string | null;
  signerName: string;
  /** The agency signer's drawn signature (PNG). Required for new contracts. */
  signature?: Uint8Array | null;
  signIp?: string | null;
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
  | "signer"
  | "signature"
  | "partner";

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
  c: Omit<ContractInput, "signerName" | "locale" | "requestId" | "proposalId" | "packageId" | "signature" | "signIp" | "contractRequestId"> & {
    number: string;
    agencyId: string;
    feePercent: number;
    version?: number;
    /** v3: the law the contract is written against (the agency's country and city). */
    legal?: { version: string; jurisdiction: string; city: string } | null;
    /** v4: review period in days and whether protected payments were live. */
    reviewDays?: number;
    paymentsLive?: boolean;
  },
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
    ...(version >= 3
      ? {
          legal: c.legal ? [c.legal.version, c.legal.jurisdiction, c.legal.city] : null,
          parties: [c.agencyLegalName?.trim() || null, c.agencyRegNumber?.trim() || null, c.clientRegNumber?.trim() || null],
          agencyTerms: c.agencyTerms?.trim() || null,
          clientTerms: c.clientTerms?.trim() || null,
          ndaYears: c.nda ? (c.ndaYears ?? 2) : null,
        }
      : {}),
    ...(version >= 4
      ? {
          review: [c.reviewDays ?? 7, c.revisionRounds ?? DEFAULT_REVISION_ROUNDS],
          payments: c.paymentsLive ? "live" : "test",
          clientAgencyId: c.clientAgencyId ?? null,
        }
      : {}),
  });
}
export const hashTerms = (canonical: string) => createHash("sha256").update(canonical).digest("hex");
export const ipHash = (ip: string) => createHash("sha256").update(`sawwiq-sign:${ip}`).digest("hex");
const b64 = (bytes: Uint8Array | null | undefined) => (bytes?.length ? Buffer.from(bytes).toString("base64") : null);

function contractNumber() {
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  const bytes = randomBytes(6);
  return `SW-${new Date().getUTCFullYear()}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

export async function logEvent(contractId: string, actor: "agency" | "client" | "admin" | "system", type: string, note?: string | null) {
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
    agencyLegalName: input.agencyLegalName ? cut(input.agencyLegalName, 160) || null : null,
    agencyRegNumber: input.agencyRegNumber ? cut(input.agencyRegNumber, 60) || null : null,
    clientRegNumber: input.clientRegNumber ? cut(input.clientRegNumber, 60) || null : null,
    agencyTerms: input.agencyTerms ? cut(input.agencyTerms, 3000) || null : null,
    clientTerms: input.clientTerms ? cut(input.clientTerms, 3000) || null : null,
    ndaYears: input.nda ? ((NDA_YEARS as readonly number[]).includes(input.ndaYears ?? 0) ? input.ndaYears! : 2) : null,
    revisionRounds: clampRounds(input.revisionRounds ?? DEFAULT_REVISION_ROUNDS),
    clientAgencyId: input.clientAgencyId || null,
    // Every contract on Sawwiq is payment-protected (docs/22-legal-documents.md).
    paymentMode: "protected",
    signerName: cut(input.signerName, 80),
  };
}

export async function createContract(agencyId: string, raw: ContractInput): Promise<{ error: ContractError } | { contract: Contract; token: string }> {
  const input = clean(raw);
  const error = validateContract(input);
  if (error) return { error };
  if (!input.signature?.length) return { error: "signature" };
  const db = await getDb();
  if (input.clientAgencyId && !(await arePartners(agencyId, input.clientAgencyId))) return { error: "partner" };
  const number = contractNumber();
  const token = randomBytes(18).toString("base64url");
  const fee = feePercent();
  const specialRequests = input.specialRequests;
  const [{ country, city, name } = { country: "jo", city: "amman", name: "" }] = await db
    .select({ country: agencies.country, city: agencies.city, name: agencies.name })
    .from(agencies)
    .where(eq(agencies.id, agencyId));
  const legal = { version: LEGAL_VERSION, jurisdiction: country, city };
  input.agencyLegalName ??= name;
  const reviewDays = reviewDaysSetting();
  const paymentsLive = protectedPaymentsLive();
  const terms = canonicalTerms({ ...input, specialRequests, number, agencyId, feePercent: fee, legal, reviewDays, paymentsLive });
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
        currency: currencyOf(country),
        termsVersion: TERMS_VERSION,
        kpis: input.kpis ?? [],
        reportingCadence: input.reportingCadence ?? null,
        mediaBudgetJod: input.mediaBudgetJod ?? null,
        jurisdiction: legal.jurisdiction,
        jurisdictionCity: legal.city,
        legalVersion: legal.version,
        agencyLegalName: input.agencyLegalName,
        agencyRegNumber: input.agencyRegNumber,
        clientRegNumber: input.clientRegNumber,
        agencyTerms: input.agencyTerms,
        clientTerms: input.clientTerms,
        ndaYears: input.ndaYears,
        reviewDays,
        revisionRounds: input.revisionRounds ?? DEFAULT_REVISION_ROUNDS,
        paymentsLive,
        clientAgencyId: input.clientAgencyId ?? null,
        agencySignature: b64(input.signature),
        agencySignIpHash: input.signIp ? ipHash(input.signIp) : null,
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
    if (input.contractRequestId && input.clientAgencyId) {
      await tx
        .update(contractRequests)
        .set({ status: "contracted", contractId: row.id, respondedAt: new Date() })
        .where(and(eq(contractRequests.id, input.contractRequestId), eq(contractRequests.toAgencyId, agencyId), eq(contractRequests.fromAgencyId, input.clientAgencyId), eq(contractRequests.status, "pending")));
    }
    return row;
  });
  if (contract.clientAgencyId) await notifyContract(contract, "contract_received", "client");
  return { contract, token };
}

/** Two agencies may contract with each other once a partnership request between them was accepted. */
export async function arePartners(a: string, b: string) {
  if (a === b) return false;
  const db = await getDb();
  const [row] = await db
    .select({ id: partnerRequests.id })
    .from(partnerRequests)
    .where(and(eq(partnerRequests.status, "accepted"), or(and(eq(partnerRequests.fromAgencyId, a), eq(partnerRequests.toAgencyId, b)), and(eq(partnerRequests.fromAgencyId, b), eq(partnerRequests.toAgencyId, a)))))
    .limit(1);
  return Boolean(row);
}

export type DisputeView = MilestoneDispute & { evidence: DisputeEvidence[] };
export type ContractView = {
  contract: Contract;
  agency: { id: string; name: string; handle: string; whatsapp: string | null };
  /** Partner contracts: the agency buying the work. */
  clientAgency: { id: string; name: string; handle: string } | null;
  milestones: (Milestone & { checks: MilestoneCheck[] })[];
  events: (typeof contractEvents.$inferSelect)[];
  money: { deposited: number; released: number; refunded: number; fees: number; held: number };
  /** Held per milestone (protected mode). */
  heldBy: Record<string, number>;
  /** Every money movement, oldest first (receipts). */
  ledger: EscrowEntry[];
  changes: ContractChange[];
  disputes: DisputeView[];
  cancellations: CancellationProposal[];
  /** After a completed, paid contract: the client's single-use review link, while unused. */
  reviewToken: string | null;
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

export async function view(contract: Contract): Promise<ContractView> {
  const db = await getDb();
  const [agency] = await db.select({ id: agencies.id, name: agencies.name, handle: agencies.handle, whatsapp: agencies.whatsapp }).from(agencies).where(eq(agencies.id, contract.agencyId));
  const [clientAgency] = contract.clientAgencyId
    ? await db.select({ id: agencies.id, name: agencies.name, handle: agencies.handle }).from(agencies).where(eq(agencies.id, contract.clientAgencyId))
    : [];
  const ms = await db.select().from(milestones).where(eq(milestones.contractId, contract.id)).orderBy(asc(milestones.position));
  const checks = ms.length ? await db.select().from(milestoneChecks).where(inArray(milestoneChecks.milestoneId, ms.map((m) => m.id))).orderBy(asc(milestoneChecks.position)) : [];
  const evs = await db.select().from(contractEvents).where(eq(contractEvents.contractId, contract.id)).orderBy(desc(contractEvents.createdAt)).limit(100);
  const ledger = await db
    .select()
    .from(escrowLedger)
    .where(and(eq(escrowLedger.contractId, contract.id), eq(escrowLedger.status, "succeeded")))
    .orderBy(asc(escrowLedger.id));
  const sum = (t: string) => ledger.filter((l) => l.type === t).reduce((s, l) => s + l.amountFils, 0);
  const money = { deposited: sum("deposit"), released: sum("release"), refunded: sum("refund"), fees: sum("fee") };
  const heldBy: Record<string, number> = {};
  for (const l of ledger) if (l.milestoneId) heldBy[l.milestoneId] = (heldBy[l.milestoneId] ?? 0) + (l.type === "deposit" ? l.amountFils : -l.amountFils);
  const disputeRows = await db.select().from(milestoneDisputes).where(eq(milestoneDisputes.contractId, contract.id)).orderBy(desc(milestoneDisputes.createdAt));
  const evidence = disputeRows.length ? await db.select().from(disputeEvidence).where(inArray(disputeEvidence.disputeId, disputeRows.map((d) => d.id))).orderBy(asc(disputeEvidence.createdAt)) : [];
  const cancellations = await db.select().from(cancellationProposals).where(eq(cancellationProposals.contractId, contract.id)).orderBy(desc(cancellationProposals.createdAt));
  const [invite] = contract.status === "completed" ? await db.select().from(reviewRequests).where(and(eq(reviewRequests.contractId, contract.id), isNull(reviewRequests.usedAt))) : [];
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
    clientAgency: clientAgency ?? null,
    milestones: ms.map((m) => ({ ...m, checks: checks.filter((c) => c.milestoneId === m.id) })),
    events: evs,
    money: { ...money, held: money.deposited - money.released - money.refunded - money.fees },
    heldBy,
    ledger,
    disputes: disputeRows.map((d) => ({ ...d, evidence: evidence.filter((e) => e.disputeId === d.id) })),
    cancellations,
    reviewToken: invite && invite.expiresAt > new Date() ? tryOpen(invite.tokenEnc) : null,
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

/** A partner contract, for the agency buying the work (it acts as the client). */
export async function getContractForClientAgency(agencyId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [c] = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.clientAgencyId, agencyId)));
  return c ? view(c) : null;
}

/** The client's private link for a contract, only on the device that signed it (notification links). */
export async function clientLinkForDevice(id: string, visitorId: string | null) {
  if (!visitorId || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [c] = await db.select().from(contracts).where(and(eq(contracts.id, id), eq(contracts.clientVisitorId, visitorId)));
  return c ? clientToken(c) : null;
}

export async function getContractById(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [c] = await db.select().from(contracts).where(eq(contracts.id, id));
  return c ? view(c) : null;
}

/** The client's private link token (for the agency to share again); null if it was sealed with an earlier key. */
export const clientToken = (c: Contract) => tryOpen(c.clientTokenEnc);

export async function contractsForRequest(requestId: string) {
  const db = await getDb();
  return db.select().from(contracts).where(eq(contracts.requestId, requestId)).orderBy(desc(contracts.createdAt));
}

export async function listAgencyContracts(agencyId: string) {
  const db = await getDb();
  return db.select().from(contracts).where(eq(contracts.agencyId, agencyId)).orderBy(desc(contracts.createdAt)).limit(100);
}

/** Partner contracts where this agency is the client ("Contracts you're buying"). */
export async function listBuyingContracts(agencyId: string) {
  const db = await getDb();
  return db
    .select({ contract: contracts, supplier: agencies.name })
    .from(contracts)
    .innerJoin(agencies, eq(agencies.id, contracts.agencyId))
    .where(eq(contracts.clientAgencyId, agencyId))
    .orderBy(desc(contracts.createdAt))
    .limit(100);
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
      legal: c.legalVersion && c.jurisdiction ? { version: c.legalVersion, jurisdiction: c.jurisdiction, city: c.jurisdictionCity ?? "" } : null,
      agencyLegalName: c.agencyLegalName,
      agencyRegNumber: c.agencyRegNumber,
      clientRegNumber: c.clientRegNumber,
      agencyTerms: c.agencyTerms,
      clientTerms: c.clientTerms,
      ndaYears: c.ndaYears,
      reviewDays: c.reviewDays,
      revisionRounds: c.revisionRounds,
      paymentsLive: c.paymentsLive,
      clientAgencyId: c.clientAgencyId,
    }),
  );
}

type Result = { ok: true } | { error: string };

/** Checks what is stored still matches what the agency signed (used before showing "signed" copies too). */
export const termsIntact = (v: ContractView) => storedTermsHash(v) === v.contract.termsHash;

export async function clientSign(token: string, signerName: string, ip: string, signature?: Uint8Array | null, visitorId?: string | null): Promise<Result> {
  const v = await getContractByToken(token);
  if (!v) return { error: "notFound" };
  return signAsClient(v, signerName, ip, signature, visitorId);
}

/** The client (private link, or the buying agency signed in) signs the exact terms the agency signed. */
export async function signAsClient(v: ContractView, signerName: string, ip: string, signature?: Uint8Array | null, visitorId?: string | null): Promise<Result> {
  if (v.contract.status !== "sent") return { error: "notSignable" };
  if (signerName.trim().length < 3) return { error: "signer" };
  // Contracts with the universal conditions need a drawn signature as well as the typed name.
  if (v.contract.termsVersion >= 3 && !signature?.length) return { error: "signature" };
  if (!termsIntact(v)) return { error: "tampered" };
  const db = await getDb();
  const [signed] = await db
    .update(contracts)
    .set({
      status: "active",
      clientSignerName: signerName.trim().slice(0, 80),
      clientSignedAt: new Date(),
      clientSignIpHash: ipHash(ip),
      clientSignature: b64(signature),
      ...(visitorId && !v.contract.clientAgencyId ? { clientVisitorId: visitorId } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(contracts.id, v.contract.id), eq(contracts.status, "sent")))
    .returning();
  if (!signed) return { error: "notSignable" };
  await logEvent(v.contract.id, "client", "signed", signerName.trim());
  await notifyContract(signed, "contract_signed", "agency");
  return { ok: true };
}

/**
 * Client, before signing: ask the agency to change something. The sent
 * contract can't change (its fingerprint is signed), so the agency answers by
 * sending a revised contract; this only records the request for both sides.
 */
export async function requestAmendment(v: ContractView, note: string): Promise<Result> {
  if (v.contract.status !== "sent") return { error: "notSignable" };
  const text = note.trim().slice(0, 2000);
  if (text.length < 5) return { error: "note" };
  await logEvent(v.contract.id, "client", "amend_requested", text);
  return { ok: true };
}

/** The milestone the client can pay into next (protected mode): the first pending one, in order. */
export function nextFundable(v: ContractView) {
  if (v.contract.paymentMode !== "protected" || v.contract.status !== "active") return null;
  return v.milestones.find((m) => m.status === "pending") ?? null;
}

/** Where the client's pages for a contract live: the private link, or the buying agency's studio. */
export const clientBasePath = (v: Pick<ContractView, "contract">, token?: string | null) => (token ? `/c/${token}` : `/studio/contracts/${v.contract.id}`);

/**
 * Starts the client's payment for a milestone. Returns where to send them.
 * A contract sent while protected payments were in test mode always uses the
 * built-in test checkout (no real money), whatever provider is configured
 * later: that is what its terms say.
 */
export async function startMilestoneFunding(ref: string | ContractView, milestoneId: string, basePath?: string) {
  const v = typeof ref === "string" ? await getContractByToken(ref) : ref;
  const m = v && nextFundable(v);
  if (!v || !m || m.id !== milestoneId) return null;
  const base = basePath ?? (typeof ref === "string" ? `/c/${ref}` : clientBasePath(v));
  if (!v.contract.paymentsLive) return { redirectPath: `${base}/fund/${m.id}`, milestone: m, contract: v.contract };
  const checkout = await paymentProvider().createCheckout({ paymentRef: `ms_${m.id}`, amountFils: m.amountFils, currency: v.contract.currency, description: `${v.contract.number} · ${m.title}`, returnPath: base });
  return { redirectPath: checkout.redirectPath, milestone: m, contract: v.contract };
}

export type DepositResult = "ok" | "duplicate" | "unknown_payment" | "amount_mismatch" | "currency_mismatch" | "wrong_mode" | "refunded_late";

/**
 * A verified deposit for a milestone (from the payment provider's signed
 * notification, or the built-in test checkout). Applied at most once: the
 * milestone moves pending → funded in the same transaction as the ledger row,
 * guarded in SQL, and the ledger key "dep:<milestone>" is unique.
 */
export async function recordDeposit(milestoneId: string, amountFils: number, providerRef: string, opts: { provider?: string; currency?: string | null } = {}): Promise<DepositResult> {
  if (!/^[0-9a-f-]{36}$/.test(milestoneId)) return "unknown_payment";
  const db = await getDb();
  const [row] = await db.select({ m: milestones, c: contracts }).from(milestones).innerJoin(contracts, eq(contracts.id, milestones.contractId)).where(eq(milestones.id, milestoneId));
  if (!row) return "unknown_payment";
  const { m, c } = row;
  if (m.amountFils !== amountFils) return "amount_mismatch";
  if (opts.currency && opts.currency.toUpperCase() !== c.currency.toUpperCase()) return "currency_mismatch";
  const provider = opts.provider ?? paymentProvider().id;
  // Test contracts take only test money; live contracts only the real provider's.
  if (c.paymentMode !== "protected" || (c.paymentsLive ? provider === "mock" : provider !== "mock")) return "wrong_mode";
  // Money that arrives after the milestone or contract was cancelled goes straight back (docs/32).
  if ((c.status === "cancelled" || m.status === "cancelled") && m.status !== "funded") return refundLateDeposit(m, amountFils, providerRef, provider);
  if (m.status !== "pending" || c.status !== "active") return "duplicate";
  try {
    const applied = await db.transaction(async (tx) => {
      const [funded] = await tx
        .update(milestones)
        .set({ status: "funded", fundedAt: new Date() })
        .where(and(eq(milestones.id, milestoneId), eq(milestones.status, "pending")))
        .returning({ id: milestones.id });
      if (!funded) return false;
      await tx.insert(escrowLedger).values({ contractId: m.contractId, milestoneId, type: "deposit", amountFils, provider, providerRef, idemKey: ledgerKey("dep", milestoneId) });
      return true;
    });
    if (!applied) return "duplicate";
  } catch (e) {
    if (isUniqueViolation(e)) return "duplicate";
    throw e;
  }
  await logEvent(m.contractId, "client", "funded", m.title);
  await notifyContract(c, "contract_funded", "agency", { milestone: m.title });
  return "ok";
}

/**
 * A real payment that lands after cancellation: recorded (the partner holds
 * it) and refunded in full straight away, once. Same keys as any deposit and
 * refund, so a replayed notification changes nothing.
 */
async function refundLateDeposit(m: Milestone, amountFils: number, providerRef: string, provider: string): Promise<DepositResult> {
  const db = await getDb();
  try {
    await db.transaction(async (tx) => {
      const note = "arrived after cancellation; refunded in full";
      await tx.insert(escrowLedger).values({ contractId: m.contractId, milestoneId: m.id, type: "deposit", amountFils, provider, providerRef, note, idemKey: ledgerKey("dep", m.id) });
      await tx.insert(escrowLedger).values({ contractId: m.contractId, milestoneId: m.id, type: "refund", amountFils, provider, status: provider === "mock" ? "succeeded" : "pending", note, idemKey: ledgerKey("ref", m.id) });
    });
  } catch (e) {
    if (isUniqueViolation(e)) return "duplicate";
    throw e;
  }
  await logEvent(m.contractId, "system", "refunded", `${m.title}: payment arrived after cancellation and was refunded in full`);
  const { dispatchMoneyOut } = await import("./money-out");
  await dispatchMoneyOut({ milestoneId: m.id }).catch((e) => console.error("[money-out]", e));
  return "refunded_late";
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

/**
 * Agency: work on this milestone is done. Protected milestones must be funded
 * first. Starts the client's review period (terms v4: `reviewDays`); if it
 * ends with no answer, the milestone is accepted (lib/data/contract-jobs.ts).
 */
export async function submitMilestone(v: ContractView, milestoneId: string, note: string): Promise<Result> {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || v.contract.status !== "active") return { error: "notFound" };
  const ready = v.contract.paymentMode === "protected" ? ["funded", "changes_requested"] : ["pending", "changes_requested"];
  if (!ready.includes(m.status)) return { error: m.status === "pending" ? "notFunded" : "locked" };
  if (m.checks.some((c) => !c.doneByAgency)) return { error: "checklist" };
  const db = await getDb();
  const now = new Date();
  const dueAt = v.contract.termsVersion >= 4 ? reviewDeadline(now, v.contract.reviewDays) : null;
  const [done] = await db
    .update(milestones)
    .set({ status: "submitted", submittedAt: now, submissionNote: note.trim().slice(0, 2000) || null, reviewDueAt: dueAt, remindersSent: 0 })
    .where(and(eq(milestones.id, m.id), inArray(milestones.status, ready as never[])))
    .returning({ id: milestones.id });
  if (!done) return { error: "locked" };
  await logEvent(v.contract.id, "agency", "submitted", `${m.title}${note.trim() ? `: ${note.trim()}` : ""}`);
  await notifyContract(v.contract, "milestone_submitted", "client", { milestone: m.title, date: dueAt });
  return { ok: true };
}

/**
 * Client: send a delivery back with what must change. Each request uses one
 * of the milestone's revision rounds (terms v4); with none left the client
 * asks the agency for an extra round, accepts, or opens a dispute.
 */
export async function requestChanges(v: ContractView, milestoneId: string, note: string): Promise<Result> {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || m.status !== "submitted" || v.contract.status !== "active") return { error: "locked" };
  if (note.trim().length < 3) return { error: "note" };
  if (v.contract.termsVersion >= 4 && !canRequestChanges(v.contract, m)) return { error: "noRounds" };
  const db = await getDb();
  const done = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(milestones)
      .set({ status: "changes_requested", changesNote: note.trim().slice(0, 2000), changeRounds: sql`${milestones.changeRounds} + 1`, reviewDueAt: null, extraRoundAskedAt: null })
      // Same round count as read: two clicks can't use two rounds.
      .where(and(eq(milestones.id, m.id), eq(milestones.status, "submitted"), eq(milestones.changeRounds, m.changeRounds)))
      .returning({ id: milestones.id });
    if (!row) return false;
    await tx.update(milestoneChecks).set({ confirmedByClient: false }).where(eq(milestoneChecks.milestoneId, m.id));
    return true;
  });
  if (!done) return { error: "locked" };
  const round = roundsState(v.contract, { ...m, changeRounds: m.changeRounds + 1 });
  await logEvent(v.contract.id, "client", "changes_requested", `${m.title} (${round.used}/${round.included + round.extra}): ${note.trim()}`);
  await notifyContract(v.contract, "milestone_changes", "agency", { milestone: m.title });
  return { ok: true };
}

/** Client, with no revision rounds left: ask the agency for one more (free). */
export async function askExtraRound(v: ContractView, milestoneId: string): Promise<Result> {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || m.status !== "submitted" || v.contract.status !== "active") return { error: "locked" };
  if (canRequestChanges(v.contract, m)) return { error: "roundsLeft" };
  const db = await getDb();
  const [row] = await db
    .update(milestones)
    .set({ extraRoundAskedAt: new Date() })
    .where(and(eq(milestones.id, m.id), eq(milestones.status, "submitted"), isNull(milestones.extraRoundAskedAt)))
    .returning({ id: milestones.id });
  if (!row) return { error: "locked" };
  await logEvent(v.contract.id, "client", "extra_round_asked", m.title);
  await notifyContract(v.contract, "extra_round_asked", "agency", { milestone: m.title });
  return { ok: true };
}

/** Agency: grant the client one more round of changes on a milestone, free of charge. */
export async function grantExtraRound(v: ContractView, milestoneId: string): Promise<Result> {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || !["submitted", "changes_requested", "funded"].includes(m.status) || v.contract.status !== "active") return { error: "locked" };
  const db = await getDb();
  const [row] = await db
    .update(milestones)
    .set({ extraRounds: sql`${milestones.extraRounds} + 1`, extraRoundAskedAt: null })
    .where(and(eq(milestones.id, m.id), eq(milestones.extraRounds, m.extraRounds)))
    .returning({ id: milestones.id });
  if (!row) return { error: "locked" };
  await logEvent(v.contract.id, "agency", "extra_round_granted", m.title);
  await notifyContract(v.contract, "extra_round_granted", "client", { milestone: m.title });
  return { ok: true };
}

/**
 * Contract finished: every milestone settled and at least one paid out.
 * Guarded so it happens once; invites the client to review the agency.
 */
export async function completeIfDone(contractId: string) {
  const db = await getDb();
  const ms = await db.select({ status: milestones.status }).from(milestones).where(eq(milestones.contractId, contractId));
  const finished = ms.every((m) => ["approved", "released", "refunded", "cancelled", "split"].includes(m.status));
  if (!finished || !ms.some((m) => ["approved", "released", "split"].includes(m.status))) return false;
  const open = await db.select({ id: milestoneDisputes.id }).from(milestoneDisputes).where(and(eq(milestoneDisputes.contractId, contractId), inArray(milestoneDisputes.status, ["open", "decided", "appealed"])));
  if (open.length) return false;
  const [done] = await db
    .update(contracts)
    .set({ status: "completed", completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(contracts.id, contractId), inArray(contracts.status, ["active", "disputed"])))
    .returning();
  if (!done) return false;
  await logEvent(contractId, "system", "completed");
  await notifyContract(done, "contract_completed", "both");
  if (await createContractReviewInvite(done)) await notifyContract(done, "review_invite", "client");
  return true;
}

/**
 * After a contract completes: a single-use review link for its client. The
 * review counts as a "completed project (via Sawwiq)" only when the contract
 * ran with live protected payments and money was actually paid out to the
 * agency; a contract completed in test mode gets an ordinary invite. One
 * invite per contract (unique), so running this twice does nothing.
 */
export async function createContractReviewInvite(c: Pick<Contract, "id" | "agencyId" | "clientName" | "status">) {
  if (c.status !== "completed") return null;
  const db = await getDb();
  const token = randomBytes(18).toString("base64url");
  const [row] = await db
    .insert(reviewRequests)
    .values({ agencyId: c.agencyId, tokenHash: hashToken(token), tokenEnc: seal(token), clientName: c.clientName.slice(0, 80), contractId: c.id, expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) })
    .onConflictDoNothing()
    .returning();
  return row ? { token, request: row } : null;
}

/** Client confirms every checklist item: the milestone is approved and, if protected, paid out. */
export async function approveMilestone(v: ContractView, milestoneId: string): Promise<Result> {
  const m = v.milestones.find((x) => x.id === milestoneId);
  if (!m || m.status !== "submitted" || v.contract.status !== "active") return { error: "locked" };
  if (m.checks.some((c) => !c.confirmedByClient)) return { error: "checklist" };
  if (v.contract.paymentMode === "protected") {
    // Approve and pay out in one guarded step: a double click releases once.
    const r = await settleMilestone(v.contract, m.id, { releaseFils: v.heldBy[m.id] ?? m.amountFils, refundFils: 0 }, { from: ["submitted"], approvedBy: "client" });
    if (r !== "ok") return { error: "locked" };
    await logEvent(v.contract.id, "client", "approved", m.title);
    await logEvent(v.contract.id, "client", "released", m.title);
  } else {
    const db = await getDb();
    const [row] = await db
      .update(milestones)
      .set({ status: "approved", approvedAt: new Date(), approvedBy: "client" })
      .where(and(eq(milestones.id, m.id), eq(milestones.status, "submitted")))
      .returning({ id: milestones.id });
    if (!row) return { error: "locked" };
    await logEvent(v.contract.id, "client", "approved", m.title);
  }
  await notifyContract(v.contract, "milestone_approved", "agency", { milestone: m.title });
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
 * only possible while no money is held; otherwise a mutual cancellation
 * (lib/data/contract-cancel.ts) or a dispute.
 */
export async function cancelContract(v: ContractView, by: "agency" | "client", reason: string): Promise<Result> {
  if (!["sent", "active"].includes(v.contract.status)) return { error: "locked" };
  if (v.money.held > 0 || v.milestones.some((m) => isHeld(m.status) && v.contract.paymentMode === "protected")) return { error: "moneyHeld" };
  const db = await getDb();
  const [row] = await db
    .update(contracts)
    .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
    .where(and(eq(contracts.id, v.contract.id), inArray(contracts.status, ["sent", "active"])))
    .returning({ id: contracts.id });
  if (!row) return { error: "locked" };
  await db.update(milestones).set({ status: "cancelled" }).where(and(eq(milestones.contractId, v.contract.id), inArray(milestones.status, ["pending", "changes_requested", "submitted"])));
  await logEvent(v.contract.id, by, "cancelled", reason.trim().slice(0, 500) || null);
  return { ok: true };
}

/**
 * Report a problem. With a milestone whose money is held, this opens a
 * milestone dispute with evidence and a decision (lib/data/contract-disputes.ts);
 * without one, it flags the contract for Sawwiq's team.
 */
export async function openDispute(v: ContractView, by: "agency" | "client", note: string, milestoneId?: string | null): Promise<Result> {
  if (v.contract.status !== "active" && !(v.contract.status === "disputed" && milestoneId)) return { error: "locked" };
  if (note.trim().length < 5) return { error: "note" };
  const target = milestoneId ?? (v.contract.paymentMode === "protected" ? v.milestones.find((m) => isHeld(m.status))?.id : null);
  if (target) {
    const { openMilestoneDispute } = await import("./contract-disputes");
    return openMilestoneDispute(v, by, target, note);
  }
  const db = await getDb();
  await db.update(contracts).set({ status: "disputed", updatedAt: new Date() }).where(and(eq(contracts.id, v.contract.id), eq(contracts.status, "active")));
  await logEvent(v.contract.id, by, "dispute", note.trim());
  await notifyContract(v.contract, "dispute_opened", by === "agency" ? "client" : "agency", {});
  return { ok: true };
}

/**
 * Admin, immediately final: pay the agency, or refund the client, for one held
 * milestone (used to settle a dispute outright). The dispute flow with one
 * appeal is decideDispute in lib/data/contract-disputes.ts.
 */
export async function resolveMilestone(contractId: string, milestoneId: string, decision: "release" | "refund", note: string): Promise<Result> {
  const v = await getContractById(contractId);
  const m = v?.milestones.find((x) => x.id === milestoneId);
  if (!v || !m || !isHeld(m.status)) return { error: "locked" };
  const held = v.heldBy[m.id] ?? 0;
  const r = await settleMilestone(v.contract, m.id, decision === "release" ? { releaseFils: held, refundFils: 0 } : { releaseFils: 0, refundFils: held }, { note, approvedBy: decision === "release" ? "admin" : null });
  if (r !== "ok") return { error: r === "mismatch" ? "amounts" : "locked" };
  const db = await getDb();
  await db
    .update(milestoneDisputes)
    .set({ status: "final", decision, releaseFils: decision === "release" ? held : 0, refundFils: decision === "refund" ? held : 0, reason: note.slice(0, 2000), decidedAt: new Date(), finalAt: new Date(), updatedAt: new Date() })
    .where(and(eq(milestoneDisputes.milestoneId, m.id), inArray(milestoneDisputes.status, ["open", "decided", "appealed"])));
  await logEvent(contractId, "admin", decision === "release" ? "released" : "refunded", `${m.title}: ${note}`);
  await notifyContract(v.contract, "dispute_final", "both", { milestone: m.title });
  await reopenIfNoDisputes(contractId);
  await completeIfDone(contractId);
  return { ok: true };
}

/** A disputed contract carries on once no milestone dispute is open. */
export async function reopenIfNoDisputes(contractId: string) {
  const db = await getDb();
  const open = await db.select({ id: milestoneDisputes.id }).from(milestoneDisputes).where(and(eq(milestoneDisputes.contractId, contractId), inArray(milestoneDisputes.status, ["open", "decided", "appealed"])));
  if (open.length) return false;
  const rows = await db.update(contracts).set({ status: "active", updatedAt: new Date() }).where(and(eq(contracts.id, contractId), eq(contracts.status, "disputed"))).returning({ id: contracts.id });
  return rows.length > 0;
}

/** Admin: end a dispute without a money decision and let the contract continue. */
export async function closeDispute(contractId: string, note: string) {
  const db = await getDb();
  await db
    .update(milestoneDisputes)
    .set({ status: "closed", reason: note.slice(0, 2000), updatedAt: new Date() })
    .where(and(eq(milestoneDisputes.contractId, contractId), eq(milestoneDisputes.status, "open")));
  await reopenIfNoDisputes(contractId);
  await logEvent(contractId, "admin", "dispute_closed", note);
  await completeIfDone(contractId);
}

/** Protected-payment totals and open disputes for Admin → Payments. */
export async function escrowOverview() {
  const db = await getDb();
  const [totals, disputed, active, stuck] = await Promise.all([
    // Real money only: test-mode entries are listed separately (docs/32).
    db
      .select({ type: escrowLedger.type, n: sql<number>`coalesce(sum(${escrowLedger.amountFils}), 0)::int` })
      .from(escrowLedger)
      .where(and(eq(escrowLedger.status, "succeeded"), eq(escrowLedger.test, false)))
      .groupBy(escrowLedger.type),
    db
      .select()
      .from(contracts)
      .where(or(eq(contracts.status, "disputed"), inArray(contracts.id, db.select({ id: milestoneDisputes.contractId }).from(milestoneDisputes).where(inArray(milestoneDisputes.status, ["open", "decided", "appealed"])))))
      .orderBy(desc(contracts.updatedAt)),
    db
      .select({ mode: contracts.paymentMode, status: contracts.status, n: sql<number>`count(*)::int` })
      .from(contracts)
      .groupBy(contracts.paymentMode, contracts.status),
    // Payouts and refunds the partner hasn't completed: failed, or pending for more than 3 days.
    db
      .select({ id: escrowLedger.id, type: escrowLedger.type, status: escrowLedger.status, amountFils: escrowLedger.amountFils, note: escrowLedger.note, createdAt: escrowLedger.createdAt, number: contracts.number, currency: contracts.currency })
      .from(escrowLedger)
      .innerJoin(contracts, eq(contracts.id, escrowLedger.contractId))
      .where(
        and(
          inArray(escrowLedger.type, ["release", "refund"]),
          or(eq(escrowLedger.status, "failed"), and(eq(escrowLedger.status, "pending"), sql`${escrowLedger.createdAt} < now() - interval '3 days'`)),
        ),
      )
      .orderBy(desc(escrowLedger.id))
      .limit(100),
  ]);
  const sum = (t: string) => totals.find((x) => x.type === t)?.n ?? 0;
  const disputeViews = await Promise.all(disputed.map((c) => view(c)));
  return {
    deposited: sum("deposit"),
    released: sum("release"),
    refunded: sum("refund"),
    fees: sum("fee"),
    held: sum("deposit") - sum("release") - sum("refund") - sum("fee"),
    disputes: disputeViews,
    counts: active,
    stuck,
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
