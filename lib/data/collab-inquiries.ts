import "server-only";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { getDb, type DB } from "@/lib/db";
import { agencies, collabNeeds, contracts, workInquiries, workInquiryRecipients, workQuotes, type Agency, type WorkInquiry, type WorkInquiryRecipient, type WorkQuote } from "@/lib/db/schema";
import { addDays } from "@/lib/collab/time";
import { SUPPLIER_FIELDS } from "@/lib/collab/types";
import type { InquiryInput, QuoteInput } from "@/lib/collab/schemas";
import { currencyOf } from "@/lib/countries";
import { arePartners } from "./contracts";
import { requestContractFromPartner } from "./contract-requests";
import { sendPartnerRequest } from "./partners";
import { blockedSet } from "./collab-blocks";
import { touchRoster } from "./collab-roster";
import { addNotifications } from "./notifications";
import { mediaUrl } from "@/lib/storage";
import { audit } from "./agencies";

// Structured work inquiries (docs/48 §inquiry). Buyer → chosen suppliers;
// suppliers reply with interest, a quote or a decline; the buyer compares its
// own quotes and accepting one hands over to the existing partner-contract
// request. No signature, no money, no terms live here.

type Tx = Pick<DB, "select" | "insert" | "update" | "delete">;
type Party = { id: string; handle: string; name: string; kind: "agency" | "freelancer"; city: string; avatarUrl: string | null };

const party = (a: { id: string; handle: string; name: string; kind: "agency" | "freelancer"; city: string; avatarKey: string | null }): Party => ({ id: a.id, handle: a.handle, name: a.name, kind: a.kind, city: a.city, avatarUrl: mediaUrl(a.avatarKey) });

/**
 * The fields a supplier receives. This one projection feeds both the buyer's
 * audience preview and the supplier's page, so what the buyer previews is
 * what the supplier gets: no parent contract, no other recipients, no budget
 * beyond what the buyer chose to state in the inquiry itself.
 */
export function supplierProjection(i: WorkInquiry) {
  return Object.fromEntries(SUPPLIER_FIELDS.map((k) => [k, i[k]])) as Pick<WorkInquiry, (typeof SUPPLIER_FIELDS)[number]>;
}
export type SupplierInquiry = ReturnType<typeof supplierProjection>;

export type CreateResult = { ok: true; id: string } | { error: "recipients" | "parentContract" | "need" };

/** Creates and sends in one step; every recipient is checked server-side. */
export async function sendInquiry(buyer: Agency, input: InquiryInput): Promise<CreateResult> {
  const db = await getDb();
  const blocked = await blockedSet(buyer.id);
  const asked = [...new Set(input.recipients)].filter((id) => id !== buyer.id);
  const ids = asked.filter((id) => !blocked.has(id));
  if (!ids.length || ids.length !== asked.length) return { error: "recipients" };
  const found = await db.select({ id: agencies.id, name: agencies.name, isDemo: agencies.isDemo }).from(agencies).where(and(inArray(agencies.id, ids), eq(agencies.status, "active")));
  const recipients = found.filter((a) => !a.isDemo || buyer.isDemo);
  if (recipients.length !== ids.length) return { error: "recipients" };
  if (input.parentContractId) {
    // Only the buyer's own contracts (as the provider or the buying agency) may be linked, and only privately.
    const [own] = await db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.id, input.parentContractId), sql`(${contracts.agencyId} = ${buyer.id} or ${contracts.clientAgencyId} = ${buyer.id})`));
    if (!own) return { error: "parentContract" };
  }
  if (input.needId) {
    const [own] = await db.select({ id: collabNeeds.id }).from(collabNeeds).where(and(eq(collabNeeds.id, input.needId), eq(collabNeeds.agencyId, buyer.id)));
    if (!own) return { error: "need" };
  }
  const now = new Date();
  const id = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(workInquiries)
      .values({
        buyerAgencyId: buyer.id,
        needId: input.needId || null,
        parentContractId: input.parentContractId || null,
        title: input.title,
        role: input.role,
        deliverables: input.deliverables,
        scope: input.scope,
        assetsNote: input.assetsNote,
        startsOn: input.startsOn || null,
        dueOn: input.dueOn || null,
        timezone: input.timezone,
        workMode: input.workMode,
        city: input.city || null,
        country: buyer.country,
        budgetFils: input.budget === "" ? null : input.budget,
        currency: currencyOf(buyer.country),
        privacyMode: input.privacyMode,
        responseBy: addDays(now, input.responseDays),
        status: "sent",
        sentAt: now,
        updatedAt: now,
      })
      .returning({ id: workInquiries.id });
    await tx.insert(workInquiryRecipients).values(recipients.map((r) => ({ inquiryId: row.id, supplierAgencyId: r.id })));
    await addNotifications(recipients.map((r) => ({ agencyId: r.id, kind: "inquiry_received" as const, href: `/studio/collab/work/${row.id}`, params: { name: buyer.name, title: input.title } })), tx);
    return row.id;
  });
  await audit(null, "collab.inquiry.sent", "work_inquiry", id, { recipients: recipients.length, mode: input.privacyMode });
  return { ok: true, id };
}

export type BuyerInquiry = WorkInquiry & { recipients: (WorkInquiryRecipient & { supplier: Party })[]; quotes: (WorkQuote & { supplier: Party })[] };

/** The buyer's full view of its own inquiry, including every quote. */
export async function inquiryForBuyer(buyerId: string, id: string): Promise<BuyerInquiry | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [i] = await db.select().from(workInquiries).where(and(eq(workInquiries.id, id), eq(workInquiries.buyerAgencyId, buyerId)));
  if (!i) return null;
  const [recipients, quotes] = await Promise.all([
    db.select({ r: workInquiryRecipients, a: agencies }).from(workInquiryRecipients).innerJoin(agencies, eq(workInquiryRecipients.supplierAgencyId, agencies.id)).where(eq(workInquiryRecipients.inquiryId, i.id)).orderBy(workInquiryRecipients.createdAt),
    db.select({ q: workQuotes, a: agencies }).from(workQuotes).innerJoin(agencies, eq(workQuotes.supplierAgencyId, agencies.id)).where(eq(workQuotes.inquiryId, i.id)).orderBy(desc(workQuotes.createdAt)),
  ]);
  return { ...i, recipients: recipients.map((x) => ({ ...x.r, supplier: party(x.a) })), quotes: quotes.map((x) => ({ ...x.q, supplier: party(x.a) })) };
}

export async function listBuying(buyerId: string) {
  const db = await getDb();
  const rows = await db.select().from(workInquiries).where(eq(workInquiries.buyerAgencyId, buyerId)).orderBy(desc(workInquiries.createdAt)).limit(100);
  if (!rows.length) return [];
  const counts = await db
    .select({ inquiryId: workInquiryRecipients.inquiryId, status: workInquiryRecipients.status, n: sql<number>`count(*)::int` })
    .from(workInquiryRecipients)
    .where(inArray(workInquiryRecipients.inquiryId, rows.map((r) => r.id)))
    .groupBy(workInquiryRecipients.inquiryId, workInquiryRecipients.status);
  return rows.map((r) => ({ ...r, recipients: counts.filter((c) => c.inquiryId === r.id).reduce((n, c) => n + c.n, 0), quoted: counts.filter((c) => c.inquiryId === r.id && c.status === "quoted").reduce((n, c) => n + c.n, 0) }));
}

export type SupplierView = { inquiry: SupplierInquiry; buyer: Party; me: WorkInquiryRecipient; myQuotes: WorkQuote[] };

/** The supplier's view: the shared projection, the buyer, its own row and its own quotes. Nothing about other suppliers. */
export async function inquiryForSupplier(supplierId: string, id: string): Promise<SupplierView | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ i: workInquiries, r: workInquiryRecipients, a: agencies })
    .from(workInquiryRecipients)
    .innerJoin(workInquiries, eq(workInquiryRecipients.inquiryId, workInquiries.id))
    .innerJoin(agencies, eq(workInquiries.buyerAgencyId, agencies.id))
    .where(and(eq(workInquiryRecipients.inquiryId, id), eq(workInquiryRecipients.supplierAgencyId, supplierId)));
  if (!row) return null;
  const myQuotes = await db.select().from(workQuotes).where(and(eq(workQuotes.inquiryId, id), eq(workQuotes.supplierAgencyId, supplierId))).orderBy(desc(workQuotes.version));
  return { inquiry: supplierProjection(row.i), buyer: party(row.a), me: row.r, myQuotes };
}

export async function listSupplying(supplierId: string) {
  const db = await getDb();
  const rows = await db
    .select({ i: workInquiries, r: workInquiryRecipients, a: agencies })
    .from(workInquiryRecipients)
    .innerJoin(workInquiries, eq(workInquiryRecipients.inquiryId, workInquiries.id))
    .innerJoin(agencies, eq(workInquiries.buyerAgencyId, agencies.id))
    .where(eq(workInquiryRecipients.supplierAgencyId, supplierId))
    .orderBy(desc(workInquiries.createdAt))
    .limit(100);
  return rows.map((x) => ({ inquiry: supplierProjection(x.i), me: x.r, buyer: party(x.a) }));
}

export async function markViewed(supplierId: string, id: string) {
  const db = await getDb();
  await db.update(workInquiryRecipients).set({ status: "viewed", viewedAt: new Date() }).where(and(eq(workInquiryRecipients.inquiryId, id), eq(workInquiryRecipients.supplierAgencyId, supplierId), eq(workInquiryRecipients.status, "sent")));
}

export type ReplyError = "notFound" | "closed" | "expired";
/** Counters per supplier and inquiry; beyond this the conversation belongs in a contract, not in quotes. */
const MAX_QUOTE_VERSIONS = 20;

type Open = { error: ReplyError; row?: undefined } | { error?: undefined; row: { i: WorkInquiry; r: WorkInquiryRecipient } };

async function openRecipient(tx: Tx, supplierId: string, id: string, now = new Date()): Promise<Open> {
  const [row] = await tx
    .select({ i: workInquiries, r: workInquiryRecipients })
    .from(workInquiryRecipients)
    .innerJoin(workInquiries, eq(workInquiryRecipients.inquiryId, workInquiries.id))
    .where(and(eq(workInquiryRecipients.inquiryId, id), eq(workInquiryRecipients.supplierAgencyId, supplierId)));
  if (!row) return { error: "notFound" };
  if (!["sent", "replied"].includes(row.i.status) || !["sent", "viewed", "quoted"].includes(row.r.status)) return { error: "closed" };
  if (row.i.responseBy && row.i.responseBy <= now) return { error: "expired" };
  return { row };
}

/** A supplier quotes (or counters its own earlier quote: a new version, the old one superseded). */
export async function submitQuote(supplier: Agency, id: string, input: QuoteInput): Promise<{ ok: true; version: number } | { error: ReplyError }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const open = await openRecipient(tx, supplier.id, id);
    if (open.error) return { error: open.error };
    const [last] = await tx.select({ v: sql<number>`coalesce(max(${workQuotes.version}), 0)::int` }).from(workQuotes).where(and(eq(workQuotes.inquiryId, id), eq(workQuotes.supplierAgencyId, supplier.id)));
    const version = (last?.v ?? 0) + 1;
    if (version > MAX_QUOTE_VERSIONS) return { error: "closed" as const };
    await tx.update(workQuotes).set({ status: "superseded" }).where(and(eq(workQuotes.inquiryId, id), eq(workQuotes.supplierAgencyId, supplier.id), eq(workQuotes.status, "open")));
    await tx.insert(workQuotes).values({ inquiryId: id, supplierAgencyId: supplier.id, version, amountFils: input.amount, currency: input.currency, startsOn: input.startsOn || null, dueOn: input.dueOn || null, scopeNote: input.scopeNote, exclusions: input.exclusions });
    await tx.update(workInquiryRecipients).set({ status: "quoted" }).where(eq(workInquiryRecipients.id, open.row.r.id));
    await tx.update(workInquiries).set({ status: "replied", updatedAt: new Date() }).where(and(eq(workInquiries.id, id), eq(workInquiries.status, "sent")));
    await addNotifications([{ agencyId: open.row.i.buyerAgencyId, kind: "inquiry_quoted", href: `/studio/collab/work/${id}`, params: { name: supplier.name, title: open.row.i.title } }], tx);
    return { ok: true as const, version };
  });
}

export async function declineInquiry(supplier: Agency, id: string): Promise<{ ok: true } | { error: ReplyError }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const open = await openRecipient(tx, supplier.id, id);
    if (open.error) return { error: open.error };
    await tx.update(workInquiryRecipients).set({ status: "declined" }).where(eq(workInquiryRecipients.id, open.row.r.id));
    await tx.update(workQuotes).set({ status: "withdrawn" }).where(and(eq(workQuotes.inquiryId, id), eq(workQuotes.supplierAgencyId, supplier.id), eq(workQuotes.status, "open")));
    // Every recipient declined: the inquiry itself is declined.
    const [left] = await tx.select({ n: sql<number>`count(*)::int` }).from(workInquiryRecipients).where(and(eq(workInquiryRecipients.inquiryId, id), ne(workInquiryRecipients.status, "declined")));
    if (!left?.n) await tx.update(workInquiries).set({ status: "declined", updatedAt: new Date() }).where(and(eq(workInquiries.id, id), inArray(workInquiries.status, ["sent", "replied"])));
    await addNotifications([{ agencyId: open.row.i.buyerAgencyId, kind: "inquiry_declined", href: `/studio/collab/work/${id}`, params: { name: supplier.name, title: open.row.i.title } }], tx);
    return { ok: true as const };
  });
}

export async function withdrawInquiry(buyerId: string, id: string) {
  const db = await getDb();
  const rows = await db
    .update(workInquiries)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(and(eq(workInquiries.id, id), eq(workInquiries.buyerAgencyId, buyerId), inArray(workInquiries.status, ["sent", "replied"])))
    .returning({ id: workInquiries.id });
  if (rows.length) await db.update(workInquiryRecipients).set({ status: "withdrawn" }).where(and(eq(workInquiryRecipients.inquiryId, id), inArray(workInquiryRecipients.status, ["sent", "viewed", "quoted"])));
  return rows.length > 0;
}

export type AcceptOutcome = { ok: true; handoff: "contract_request" | "partner_request" | "already_partners_request_failed" } | { error: "notFound" | "closed" };

/**
 * The buyer accepts one quote. In one transaction the inquiry converts, the
 * other suppliers are told they were passed over, and the winning quote is
 * frozen as accepted. Then the existing handoff: accepted partners get a
 * contract request (the supplier writes the contract); others get a
 * partnership request first. Retrying returns the recorded outcome.
 */
export type BriefLabels = { excluded: string };

export async function acceptQuote(buyer: Agency, inquiryId: string, quoteId: string, labels: BriefLabels): Promise<AcceptOutcome> {
  const db = await getDb();
  type Claim = { error: "notFound" | "closed"; inquiry?: undefined } | { error?: undefined; inquiry: WorkInquiry; quote: WorkQuote | null };
  const result: Claim = await db.transaction(async (tx): Promise<Claim> => {
    const [i] = await tx.select().from(workInquiries).where(and(eq(workInquiries.id, inquiryId), eq(workInquiries.buyerAgencyId, buyer.id)));
    if (!i) return { error: "notFound" };
    if (i.status === "converted") return i.acceptedQuoteId === quoteId ? { inquiry: i, quote: null } : { error: "closed" };
    if (!["sent", "replied"].includes(i.status)) return { error: "closed" };
    const [q] = await tx.select().from(workQuotes).where(and(eq(workQuotes.id, quoteId), eq(workQuotes.inquiryId, inquiryId), eq(workQuotes.status, "open")));
    if (!q) return { error: "notFound" };
    const [claimed] = await tx
      .update(workInquiries)
      .set({ status: "converted", acceptedQuoteId: q.id, updatedAt: new Date() })
      .where(and(eq(workInquiries.id, inquiryId), inArray(workInquiries.status, ["sent", "replied"])))
      .returning();
    if (!claimed) return { error: "closed" };
    await tx.update(workQuotes).set({ status: "accepted" }).where(eq(workQuotes.id, q.id));
    await tx.update(workQuotes).set({ status: "declined" }).where(and(eq(workQuotes.inquiryId, inquiryId), ne(workQuotes.id, q.id), eq(workQuotes.status, "open")));
    await tx.update(workInquiryRecipients).set({ status: "accepted" }).where(and(eq(workInquiryRecipients.inquiryId, inquiryId), eq(workInquiryRecipients.supplierAgencyId, q.supplierAgencyId)));
    await tx.update(workInquiryRecipients).set({ status: "passed" }).where(and(eq(workInquiryRecipients.inquiryId, inquiryId), ne(workInquiryRecipients.supplierAgencyId, q.supplierAgencyId), inArray(workInquiryRecipients.status, ["sent", "viewed", "quoted"])));
    await addNotifications([{ agencyId: q.supplierAgencyId, kind: "quote_accepted", href: `/studio/collab/work/${inquiryId}`, params: { name: buyer.name, title: i.title } }], tx);
    return { inquiry: claimed, quote: q };
  });
  if (result.error) return { error: result.error };
  const supplierId = result.quote ? result.quote.supplierAgencyId : (await db.select({ s: workQuotes.supplierAgencyId }).from(workQuotes).where(eq(workQuotes.id, quoteId)))[0]?.s;
  if (!supplierId) return { error: "notFound" };
  if (result.inquiry.contractRequestId) return { ok: true, handoff: "contract_request" };
  return handoffAfterAccept(buyer, result.inquiry, supplierId, labels);
}

/** Hands an accepted inquiry to the signed-contract path; safe to call again once partners. */
export async function handoffAfterAccept(buyer: Agency, inquiry: WorkInquiry, supplierId: string, labels: BriefLabels): Promise<AcceptOutcome> {
  const db = await getDb();
  if (inquiry.contractRequestId) return { ok: true, handoff: "contract_request" };
  const quote = inquiry.acceptedQuoteId ? (await db.select().from(workQuotes).where(eq(workQuotes.id, inquiry.acceptedQuoteId)))[0] : null;
  if (await arePartners(buyer.id, supplierId)) {
    // contract_requests has no currency column and is read in the buyer's currency: a quote in another
    // currency stays in the brief text instead of being mislabelled as a budget figure.
    const sameCurrency = quote && quote.currency === currencyOf(buyer.country);
    const r = await requestContractFromPartner(buyer, supplierId, { title: inquiry.title, brief: briefFor(inquiry, quote ?? null, labels), budgetFils: sameCurrency ? quote.amountFils : inquiry.budgetFils });
    if ("ok" in r) {
      await db.update(workInquiries).set({ contractRequestId: r.id, updatedAt: new Date() }).where(eq(workInquiries.id, inquiry.id));
      // The engagement is real once the contract is asked for: "Rehire" starts from here.
      await touchRoster(buyer.id, supplierId);
      await audit(null, "collab.inquiry.converted", "work_inquiry", inquiry.id, { contractRequestId: r.id });
      return { ok: true, handoff: "contract_request" };
    }
    return { ok: true, handoff: "already_partners_request_failed" };
  }
  await sendPartnerRequest(buyer, supplierId, inquiry.role ? [inquiry.role] : [], `${inquiry.title}`);
  return { ok: true, handoff: "partner_request" };
}

function briefFor(i: WorkInquiry, q: WorkQuote | null, labels: BriefLabels) {
  const lines = [i.scope, i.deliverables.length ? i.deliverables.map((d) => `${d.key} × ${d.quantity}${d.platform ? ` (${d.platform})` : ""}`).join("\n") : "", i.startsOn || i.dueOn ? `${i.startsOn ?? ""} → ${i.dueOn ?? ""}` : "", q ? `${(q.amountFils / 1000).toString()} ${q.currency}` : "", q?.scopeNote ?? "", q?.exclusions ? `${labels.excluded}: ${q.exclusions}` : ""].filter(Boolean);
  return lines.join("\n\n").slice(0, 2000);
}

/** Daily job: inquiries past their response deadline expire for everyone still waiting. */
export async function expireInquiries(now = new Date()) {
  const db = await getDb();
  const rows = await db
    .update(workInquiries)
    .set({ status: "expired", updatedAt: now })
    .where(and(inArray(workInquiries.status, ["sent", "replied"]), sql`${workInquiries.responseBy} <= ${now}`))
    .returning({ id: workInquiries.id });
  if (rows.length) await db.update(workInquiryRecipients).set({ status: "expired" }).where(and(inArray(workInquiryRecipients.inquiryId, rows.map((r) => r.id)), inArray(workInquiryRecipients.status, ["sent", "viewed", "quoted"])));
  return rows.length;
}

/** Badge: inquiries waiting for this supplier's answer. */
export async function openInquiryCount(supplierId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(workInquiryRecipients)
    .innerJoin(workInquiries, eq(workInquiryRecipients.inquiryId, workInquiries.id))
    .where(and(eq(workInquiryRecipients.supplierAgencyId, supplierId), inArray(workInquiryRecipients.status, ["sent", "viewed"]), inArray(workInquiries.status, ["sent", "replied"])));
  return row?.n ?? 0;
}
