import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { getDb, type DB } from "@/lib/db";
import {
  agencies, contracts, escrowLedger, milestoneShares, milestones, workInquiries, workOrderAssets, workOrderComments, workOrderMessages, workOrderSubmissions, workOrderVersions, workOrders, workQuotes,
  type Agency, type WorkOrder, type WorkOrderAsset, type WorkOrderComment, type WorkOrderMessage, type WorkOrderSubmission, type WorkOrderVersion,
} from "@/lib/db/schema";
import { canTransition, paymentProjection, SUPPLIER_ORDER_FIELDS, TRANSITIONS, versionHash, type PaymentProjection, type VersionTerms } from "@/lib/collab/work-orders";
import { rangeIn } from "@/lib/collab/time";
import { countryOf } from "@/lib/countries";
import { canUse } from "@/lib/feature-gate";
import { ImageError, processImage, STORED_EXT, STORED_TYPE } from "@/lib/images";
import { storage } from "@/lib/storage";
import { audit } from "./agencies";
import { confirmHold, holdFor, holdTentative, releaseHold } from "./capacity";
import { approveMilestone, getContractForClientAgency, requestChanges, setCheck } from "./contracts";
import { addNotifications } from "./notifications";
import { openInquiryCount } from "./collab-inquiries";
import { touchRoster } from "./collab-roster";

// Work orders (docs/49-work-orders.md). Buyer and supplier agree a versioned
// scope, exchange files and messages in a shared thread, and the buyer
// reviews. Every step that touches money or signed terms goes through the
// existing contract functions with the buyer's own contract view.

type Tx = Pick<DB, "select" | "insert" | "update" | "delete" | "execute">;
export type Role = "buyer" | "supplier";
export type OrderError = "notFound" | "locked" | "invalid" | "contract" | "capacity" | "expired" | "image";
type Res<T = object> = ({ ok: true } & T) | { error: OrderError; detail?: string };

const zoneOf = (country: string | null | undefined) => countryOf(country).timeZones[0] ?? "Asia/Amman";
const party = (a: { id: string; name: string; handle: string; kind: "agency" | "freelancer" }) => ({ id: a.id, name: a.name, handle: a.handle, kind: a.kind });

async function orderFor(tx: Tx, agencyId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [o] = await tx.select().from(workOrders).where(and(eq(workOrders.id, id), or(eq(workOrders.buyerAgencyId, agencyId), eq(workOrders.supplierAgencyId, agencyId))));
  if (!o) return null;
  const role: Role = o.buyerAgencyId === agencyId ? "buyer" : "supplier";
  // A draft is the buyer's alone until it is offered.
  if (role === "supplier" && o.status === "draft") return null;
  return { o, role };
}

async function bump(tx: Tx, id: string, status: string, from: string[]) {
  const rows = await tx.update(workOrders).set({ status, updatedAt: new Date() }).where(and(eq(workOrders.id, id), inArray(workOrders.status, from))).returning({ id: workOrders.id });
  return rows.length > 0;
}

/** A contract between exactly these two, supplier as agency, buyer as client, and not cancelled. */
async function contractBetween(tx: Tx, contractId: string, supplierId: string, buyerId: string) {
  const [c] = await tx.select().from(contracts).where(and(eq(contracts.id, contractId), eq(contracts.agencyId, supplierId), eq(contracts.clientAgencyId, buyerId)));
  return c && ["sent", "active"].includes(c.status) ? c : null;
}

export type CreateInput = { supplierAgencyId: string; title: string; mode: "private" | "disclosed"; inquiryId?: string | null; contractId?: string | null; milestoneId?: string | null; parentContractId?: string | null; terms: VersionTerms };

/**
 * The buyer drafts a work order for a supplier it has an accepted inquiry or a
 * contract with. Anyone else: not allowed. The first version is proposed by the buyer.
 */
export async function createWorkOrder(buyer: Agency, input: CreateInput): Promise<Res<{ id: string }>> {
  if (input.supplierAgencyId === buyer.id) return { error: "invalid" };
  const db = await getDb();
  const [supplier] = await db.select({ id: agencies.id, isDemo: agencies.isDemo, status: agencies.status }).from(agencies).where(eq(agencies.id, input.supplierAgencyId));
  if (!supplier || supplier.status !== "active" || (supplier.isDemo && !buyer.isDemo)) return { error: "notFound" };
  let linkedInquiry: string | null = null;
  if (input.inquiryId) {
    const [i] = await db.select().from(workInquiries).where(and(eq(workInquiries.id, input.inquiryId), eq(workInquiries.buyerAgencyId, buyer.id), eq(workInquiries.status, "converted")));
    if (!i || !i.acceptedQuoteId) return { error: "notFound" };
    const [q] = await db.select({ s: workQuotes.supplierAgencyId }).from(workQuotes).where(eq(workQuotes.id, i.acceptedQuoteId));
    if (q?.s !== input.supplierAgencyId) return { error: "invalid" };
    linkedInquiry = i.id;
  }
  let contractId: string | null = null;
  let milestoneId: string | null = null;
  if (input.contractId) {
    const c = await contractBetween(db, input.contractId, input.supplierAgencyId, buyer.id);
    if (!c) return { error: "contract" };
    contractId = c.id;
    if (input.milestoneId) {
      const [m] = await db.select({ id: milestones.id }).from(milestones).where(and(eq(milestones.id, input.milestoneId), eq(milestones.contractId, c.id)));
      if (!m) return { error: "contract" };
      milestoneId = m.id;
    }
  }
  if (!linkedInquiry && !contractId) return { error: "invalid" };
  if (input.parentContractId) {
    const [own] = await db.select({ id: contracts.id }).from(contracts).where(and(eq(contracts.id, input.parentContractId), sql`(${contracts.agencyId} = ${buyer.id} or ${contracts.clientAgencyId} = ${buyer.id})`));
    if (!own) return { error: "invalid" };
  }
  const id = await db.transaction(async (tx) => {
    const [o] = await tx.insert(workOrders).values({ buyerAgencyId: buyer.id, supplierAgencyId: input.supplierAgencyId, inquiryId: linkedInquiry, contractId, milestoneId, parentContractId: input.parentContractId || null, mode: input.mode, title: input.title.trim().slice(0, 120), status: "draft" }).returning({ id: workOrders.id });
    await tx.insert(workOrderVersions).values({ workOrderId: o.id, version: 1, ...input.terms, proposedBy: "buyer" });
    return o.id;
  });
  return { ok: true, id };
}

/** Buyer sends the draft to the supplier; a tentative capacity hold covers the delivery dates when known. */
export async function offerWorkOrder(buyer: Agency, id: string): Promise<Res> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const f = await orderFor(tx, buyer.id, id);
    if (!f || f.role !== "buyer") return { error: "notFound" as const };
    if (!(await bump(tx, id, "offered", ["draft"]))) return { error: "locked" as const };
    const [v] = await tx.select().from(workOrderVersions).where(and(eq(workOrderVersions.workOrderId, id), eq(workOrderVersions.version, f.o.currentVersion)));
    const [supplier] = await tx.select({ country: agencies.country }).from(agencies).where(eq(agencies.id, f.o.supplierAgencyId));
    const interval = v?.dueOn ? rangeIn(v.dueOn, v.dueOn, zoneOf(supplier?.country)) : null;
    await holdTentative(tx, f.o.supplierAgencyId, id, interval);
    await addNotifications([{ agencyId: f.o.supplierAgencyId, kind: "work_order_offered", href: `/studio/collab/orders/${id}`, params: { name: buyer.name, title: f.o.title } }], tx);
    return { ok: true as const };
  });
}

/**
 * Supplier accepts the current proposed version: the version is frozen with
 * its hash, the capacity hold is confirmed under the provider lock, and the
 * work order becomes accepted. Retrying returns the recorded outcome.
 */
async function acceptInTransaction(supplier: Agency, id: string): Promise<Res<{ capacityLeft: number | null; buyerId: string }>> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // The provider lock first, so two acceptances (or a double click) read the status one after the other.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${supplier.id}))`);
    const f = await orderFor(tx, supplier.id, id);
    if (!f || f.role !== "supplier") return { error: "notFound" as const };
    if (f.o.status === "accepted") return { ok: true as const, capacityLeft: null, buyerId: f.o.buyerAgencyId };
    if (!canTransition("accept", f.o.status)) return { error: "locked" as const };
    // Only what the buyer proposed can be accepted by the supplier: nobody freezes their own terms.
    const [v] = await tx.select().from(workOrderVersions).where(and(eq(workOrderVersions.workOrderId, id), eq(workOrderVersions.version, f.o.currentVersion), eq(workOrderVersions.status, "proposed"), eq(workOrderVersions.proposedBy, "buyer")));
    if (!v) return { error: "locked" as const };
    const interval = v.dueOn ? rangeIn(v.dueOn, v.dueOn, zoneOf(supplier.country)) : null;
    const hold = await confirmHold(tx, supplier.id, id, interval);
    if (!hold.ok) return { error: "capacity" as const };
    const hash = versionHash(id, v.version, v);
    await tx.update(workOrderVersions).set({ status: "accepted", acceptedAt: new Date(), termsHash: hash }).where(eq(workOrderVersions.id, v.id));
    if (!(await bump(tx, id, "accepted", ["offered"]))) return { error: "locked" as const };
    await addNotifications([{ agencyId: f.o.buyerAgencyId, kind: "work_order_accepted", href: `/studio/collab/orders/${id}`, params: { name: supplier.name, title: f.o.title } }], tx);
    return { ok: true as const, capacityLeft: hold.left, buyerId: f.o.buyerAgencyId };
  });
}

export async function acceptWorkOrder(supplier: Agency, id: string): Promise<Res<{ capacityLeft: number | null }>> {
  const r = await acceptInTransaction(supplier, id);
  // Outside the transaction (PGlite has one connection): the buyer's roster remembers the engagement.
  if ("ok" in r) await touchRoster(r.buyerId, supplier.id);
  return "ok" in r ? { ok: true, capacityLeft: r.capacityLeft } : r;
}

export async function declineWorkOrder(supplier: Agency, id: string): Promise<Res> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const f = await orderFor(tx, supplier.id, id);
    if (!f || f.role !== "supplier") return { error: "notFound" as const };
    if (!(await bump(tx, id, "declined", ["offered"]))) return { error: "locked" as const };
    await tx.update(workOrderVersions).set({ status: "declined" }).where(and(eq(workOrderVersions.workOrderId, id), eq(workOrderVersions.status, "proposed")));
    await releaseHold(tx, id);
    await addNotifications([{ agencyId: f.o.buyerAgencyId, kind: "work_order_declined", href: `/studio/collab/orders/${id}`, params: { name: supplier.name, title: f.o.title } }], tx);
    return { ok: true as const };
  });
}

/** Buyer withdraws before acceptance; either side cancels after it (the contract's own cancellation rules stay separate). */
export async function endWorkOrder(me: Agency, id: string, how: "withdraw" | "cancel"): Promise<Res> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const f = await orderFor(tx, me.id, id);
    if (!f) return { error: "notFound" as const };
    if (how === "withdraw" && f.role !== "buyer") return { error: "notFound" as const };
    const to = how === "withdraw" ? "withdrawn" : "cancelled";
    if (!canTransition(how, f.o.status) || !(await bump(tx, id, to, TRANSITIONS[how]))) return { error: "locked" as const };
    await releaseHold(tx, id);
    const other = f.role === "buyer" ? f.o.supplierAgencyId : f.o.buyerAgencyId;
    if (f.o.status !== "draft") await addNotifications([{ agencyId: other, kind: "work_order_cancelled", href: `/studio/collab/orders/${id}`, params: { name: me.name, title: f.o.title } }], tx);
    return { ok: true as const };
  });
}

/**
 * An amendment: either side proposes a new version; the other accepts it (or
 * declines, leaving the accepted one in force). Before acceptance of v1 the
 * buyer may simply replace the proposal.
 */
export async function proposeVersion(me: Agency, id: string, terms: VersionTerms): Promise<Res<{ version: number }>> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${id}))`);
    const f = await orderFor(tx, me.id, id);
    if (!f) return { error: "notFound" as const };
    if (["approved", "closed", "declined", "withdrawn", "cancelled"].includes(f.o.status)) return { error: "locked" as const };
    const beforeAcceptance = ["draft", "offered"].includes(f.o.status);
    // Until v1 is accepted the offer is the buyer's to write; the supplier accepts or declines it.
    if (beforeAcceptance && f.role !== "buyer") return { error: "locked" as const };
    const [last] = await tx.select({ v: sql<number>`max(${workOrderVersions.version})::int` }).from(workOrderVersions).where(eq(workOrderVersions.workOrderId, id));
    const version = (last?.v ?? 0) + 1;
    await tx.update(workOrderVersions).set({ status: "superseded" }).where(and(eq(workOrderVersions.workOrderId, id), eq(workOrderVersions.status, "proposed")));
    await tx.insert(workOrderVersions).values({ workOrderId: id, version, ...terms, proposedBy: f.role });
    // Before anything was accepted the current version is the proposal itself, and an offered order's hold follows the new due date.
    if (beforeAcceptance) {
      await tx.update(workOrders).set({ currentVersion: version, updatedAt: new Date() }).where(eq(workOrders.id, id));
      if (f.o.status === "offered") {
        await releaseHold(tx, id);
        const [supplier] = await tx.select({ country: agencies.country }).from(agencies).where(eq(agencies.id, f.o.supplierAgencyId));
        await holdTentative(tx, f.o.supplierAgencyId, id, terms.dueOn ? rangeIn(terms.dueOn, terms.dueOn, zoneOf(supplier?.country)) : null);
      }
    } else {
      const other = f.role === "buyer" ? f.o.supplierAgencyId : f.o.buyerAgencyId;
      await addNotifications([{ agencyId: other, kind: "work_order_amendment", href: `/studio/collab/orders/${id}`, params: { name: me.name, title: f.o.title } }], tx);
    }
    return { ok: true as const, version };
  });
}

/** The other side accepts a proposed amendment: it becomes the current, frozen version; the old one is superseded. */
class CapacityRefused extends Error {}
export async function answerVersion(me: Agency, id: string, version: number, accept: boolean): Promise<Res> {
  const db = await getDb();
  try {
    return await answerInTransaction(db, me, id, version, accept);
  } catch (e) {
    if (e instanceof CapacityRefused) return { error: "capacity" };
    throw e;
  }
}

async function answerInTransaction(db: DB, me: Agency, id: string, version: number, accept: boolean): Promise<Res> {
  return db.transaction(async (tx) => {
    const f = await orderFor(tx, me.id, id);
    if (!f) return { error: "notFound" as const };
    const [v] = await tx.select().from(workOrderVersions).where(and(eq(workOrderVersions.workOrderId, id), eq(workOrderVersions.version, version), eq(workOrderVersions.status, "proposed")));
    if (!v || v.proposedBy === f.role) return { error: "locked" as const };
    if (!accept) {
      await tx.update(workOrderVersions).set({ status: "declined" }).where(eq(workOrderVersions.id, v.id));
      return { ok: true as const };
    }
    if (!["accepted", "in_progress", "submitted", "changes_requested"].includes(f.o.status)) return { error: "locked" as const };
    // A new due date moves the capacity hold, under the provider lock; no room there refuses the amendment.
    const [current] = await tx.select({ dueOn: workOrderVersions.dueOn }).from(workOrderVersions).where(and(eq(workOrderVersions.workOrderId, id), eq(workOrderVersions.status, "accepted")));
    if ((current?.dueOn ?? null) !== (v.dueOn ?? null)) {
      const [sup] = await tx.select({ country: agencies.country }).from(agencies).where(eq(agencies.id, f.o.supplierAgencyId));
      await releaseHold(tx, id);
      const hold = await confirmHold(tx, f.o.supplierAgencyId, id, v.dueOn ? rangeIn(v.dueOn, v.dueOn, zoneOf(sup?.country)) : null);
      if (!hold.ok) throw new CapacityRefused();
    }
    await tx.update(workOrderVersions).set({ status: "superseded" }).where(and(eq(workOrderVersions.workOrderId, id), eq(workOrderVersions.status, "accepted")));
    await tx.update(workOrderVersions).set({ status: "accepted", acceptedAt: new Date(), termsHash: versionHash(id, v.version, v) }).where(eq(workOrderVersions.id, v.id));
    await tx.update(workOrders).set({ currentVersion: v.version, updatedAt: new Date() }).where(eq(workOrders.id, id));
    const other = f.role === "buyer" ? f.o.supplierAgencyId : f.o.buyerAgencyId;
    await addNotifications([{ agencyId: other, kind: "work_order_amendment_accepted", href: `/studio/collab/orders/${id}`, params: { name: me.name, title: f.o.title } }], tx);
    return { ok: true as const };
  });
}

/** Buyer links the signed contract (and optionally a milestone) once it exists. Only a contract between these two. */
export async function linkContract(buyer: Agency, id: string, contractId: string, milestoneId: string | null): Promise<Res> {
  const db = await getDb();
  const f = await orderFor(db, buyer.id, id);
  if (!f || f.role !== "buyer") return { error: "notFound" };
  // Once linked, or once the order is over, the reference the rounds were judged against stays.
  if (f.o.contractId || ["approved", "closed", "declined", "withdrawn", "cancelled"].includes(f.o.status)) return { error: "locked" };
  const c = await contractBetween(db, contractId, f.o.supplierAgencyId, buyer.id);
  if (!c) return { error: "contract" };
  let m: string | null = null;
  if (milestoneId) {
    const [row] = await db.select({ id: milestones.id }).from(milestones).where(and(eq(milestones.id, milestoneId), eq(milestones.contractId, c.id)));
    if (!row) return { error: "contract" };
    m = row.id;
  }
  await db.update(workOrders).set({ contractId: c.id, milestoneId: m, updatedAt: new Date() }).where(eq(workOrders.id, id));
  return { ok: true };
}

/** Messages: private ones exist only for the buyer; shared ones for both. The scope is fixed at write time. */
export async function postMessage(me: Agency, id: string, scope: "private" | "shared", body: string): Promise<Res> {
  const db = await getDb();
  const f = await orderFor(db, me.id, id);
  if (!f) return { error: "notFound" };
  if (scope === "private" && f.role !== "buyer") return { error: "notFound" };
  const text = body.trim().slice(0, 2000);
  if (!text) return { error: "invalid" };
  await db.insert(workOrderMessages).values({ workOrderId: id, authorAgencyId: me.id, scope, body: text });
  if (scope === "shared") {
    const other = f.role === "buyer" ? f.o.supplierAgencyId : f.o.buyerAgencyId;
    await addNotifications([{ agencyId: other, kind: "work_order_message", href: `/studio/collab/orders/${id}`, params: { name: me.name, title: f.o.title } }]);
  }
  return { ok: true };
}

const MAX_ASSETS = 60;

/** An image in the workspace through the existing pipeline, stored under an unguessable key and served only by the authenticated route. */
export async function addAsset(me: Agency, id: string, input: { name: string; buffer: Buffer; groupId?: string | null }): Promise<Res<{ assetId: string; version: number }>> {
  const db = await getDb();
  const f = await orderFor(db, me.id, id);
  if (!f) return { error: "notFound" };
  if (["declined", "withdrawn", "cancelled", "closed"].includes(f.o.status)) return { error: "locked" };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(workOrderAssets).where(eq(workOrderAssets.workOrderId, id));
  if (n >= MAX_ASSETS) return { error: "locked", detail: "max" };
  let image;
  try {
    image = await processImage(input.buffer);
  } catch (e) {
    return { error: "image", detail: e instanceof ImageError ? e.code : "unsupported" };
  }
  const format = image.fullFormat ?? "webp";
  const fileId = randomUUID();
  const key = `collab/${id}/${fileId}.${STORED_EXT[format]}`;
  const thumbKey = `collab/${id}/${fileId}-t.webp`;
  await storage().put(key, image.full, STORED_TYPE[format]);
  await storage().put(thumbKey, image.thumb, "image/webp");
  return db.transaction(async (tx) => {
    let groupId = input.groupId && /^[0-9a-f-]{36}$/.test(input.groupId) ? input.groupId : null;
    let version = 1;
    if (groupId) {
      const [prev] = await tx.select({ v: sql<number>`max(${workOrderAssets.version})::int`, wo: sql<string>`min(${workOrderAssets.workOrderId}::text)` }).from(workOrderAssets).where(eq(workOrderAssets.groupId, groupId));
      if (!prev?.v || prev.wo !== id) groupId = null;
      else {
        version = prev.v + 1;
        await tx.update(workOrderAssets).set({ status: "superseded" }).where(and(eq(workOrderAssets.groupId, groupId), eq(workOrderAssets.status, "current")));
      }
    }
    const [row] = await tx
      .insert(workOrderAssets)
      .values({ workOrderId: id, groupId: groupId ?? undefined, version, uploadedByAgencyId: me.id, name: input.name.trim().slice(0, 120) || "file", storageKey: key, thumbKey, width: image.width, height: image.height, bytes: image.full.byteLength })
      .returning({ id: workOrderAssets.id });
    if (f.o.status === "accepted") await bump(tx, id, "in_progress", ["accepted"]);
    return { ok: true as const, assetId: row.id, version };
  });
}

export async function addComment(me: Agency, assetId: string, body: string, at: { x: number; y: number } | null): Promise<Res> {
  if (!/^[0-9a-f-]{36}$/.test(assetId)) return { error: "notFound" };
  const db = await getDb();
  const [a] = await db.select({ workOrderId: workOrderAssets.workOrderId }).from(workOrderAssets).where(eq(workOrderAssets.id, assetId));
  const f = a ? await orderFor(db, me.id, a.workOrderId) : null;
  if (!f) return { error: "notFound" };
  const text = body.trim().slice(0, 1000);
  if (!text) return { error: "invalid" };
  await db.insert(workOrderComments).values({ assetId, authorAgencyId: me.id, body: text, x: at ? Math.min(100, Math.max(0, at.x)) : null, y: at ? Math.min(100, Math.max(0, at.y)) : null });
  const other = f.role === "buyer" ? f.o.supplierAgencyId : f.o.buyerAgencyId;
  await addNotifications([{ agencyId: other, kind: "work_order_message", href: `/studio/collab/orders/${f.o.id}`, params: { name: me.name, title: f.o.title } }]);
  return { ok: true };
}

/** The asset bytes, only for a party to its work order (the API route). */
export async function assetForDownload(agencyId: string, assetId: string, thumb: boolean) {
  if (!/^[0-9a-f-]{36}$/.test(assetId)) return null;
  const db = await getDb();
  const [a] = await db.select().from(workOrderAssets).where(eq(workOrderAssets.id, assetId));
  if (!a) return null;
  const f = await orderFor(db, agencyId, a.workOrderId);
  if (!f) return null;
  const key = thumb ? a.thumbKey : a.storageKey;
  const body = await storage().get(key);
  return body ? { body, key, name: a.name } : null;
}

/** Supplier hands the work over. Private mode: to the buyer's review. Disclosed mode: the existing share submit is the hand-over; here it only records the round. */
export async function submitWork(supplier: Agency, id: string, note: string): Promise<Res<{ round: number }>> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${id}))`);
    const f = await orderFor(tx, supplier.id, id);
    if (!f || f.role !== "supplier") return { error: "notFound" as const };
    if (!canTransition("submit", f.o.status)) return { error: "locked" as const };
    const [v] = await tx.select().from(workOrderVersions).where(and(eq(workOrderVersions.workOrderId, id), eq(workOrderVersions.status, "accepted")));
    const [last] = await tx.select({ r: sql<number>`coalesce(max(${workOrderSubmissions.round}), 0)::int` }).from(workOrderSubmissions).where(eq(workOrderSubmissions.workOrderId, id));
    const round = (last?.r ?? 0) + 1;
    if (v && round > v.revisionAllowance + 1) return { error: "locked" as const, detail: "rounds" };
    await tx.insert(workOrderSubmissions).values({ workOrderId: id, round, note: note.trim().slice(0, 2000) });
    if (!(await bump(tx, id, "submitted", ["accepted", "in_progress", "changes_requested"]))) return { error: "locked" as const };
    await addNotifications([{ agencyId: f.o.buyerAgencyId, kind: "work_order_submitted", href: `/studio/collab/orders/${id}`, params: { name: supplier.name, title: f.o.title } }], tx);
    return { ok: true as const, round };
  });
}

export type DecisionEffect = "milestone_approved" | "milestone_changes_requested" | "milestone_not_submitted" | "milestone_locked" | "no_milestone" | "disclosed_client_reviews";

/**
 * Buyer decides on the latest submission. Private mode with a linked
 * milestone: approval confirms every checklist item and approves that
 * milestone through the buyer's contract view (the existing guarded path,
 * which is what pays a protected milestone out); changes use the contract's
 * revision round. The buyer's own client contract is never touched.
 * Disclosed mode: the end client reviews through the share; here the buyer
 * only records its own answer.
 */
export async function decideSubmission(buyer: Agency, id: string, decision: "approved" | "changes_requested", note: string): Promise<Res<{ effect: DecisionEffect }>> {
  const db = await getDb();
  const f = await orderFor(db, buyer.id, id);
  if (!f || f.role !== "buyer") return { error: "notFound" };
  if (!canTransition(decision === "approved" ? "approve" : "changes", f.o.status)) return { error: "locked" };
  if (decision === "changes_requested" && note.trim().length < 3) return { error: "invalid" };
  const to = decision === "approved" ? "approved" : "changes_requested";
  // Claim the decision first (status-conditioned, so a concurrent decision loses), then touch the contract, then record what happened.
  const round = await db.transaction(async (tx) => {
    if (!(await bump(tx, id, to, ["submitted"]))) return null;
    const [last] = await tx.select({ r: sql<number>`coalesce(max(${workOrderSubmissions.round}), 0)::int` }).from(workOrderSubmissions).where(eq(workOrderSubmissions.workOrderId, id));
    await tx.update(workOrderSubmissions).set({ decision, decisionNote: note.trim().slice(0, 2000) || null, decidedAt: new Date() }).where(and(eq(workOrderSubmissions.workOrderId, id), eq(workOrderSubmissions.round, last?.r ?? 0)));
    if (decision === "approved") await releaseHold(tx, id);
    return last?.r ?? 0;
  });
  if (round === null) return { error: "locked" };
  let effect: DecisionEffect = f.o.mode === "disclosed" ? "disclosed_client_reviews" : "no_milestone";
  if (f.o.mode === "private" && f.o.contractId && f.o.milestoneId) {
    const v = await getContractForClientAgency(buyer.id, f.o.contractId);
    const m = v?.milestones.find((x) => x.id === f.o.milestoneId);
    if (!v || !m) effect = "milestone_locked";
    else if (m.status !== "submitted") effect = "milestone_not_submitted";
    else if (decision === "approved") {
      for (const c of m.checks) if (!c.confirmedByClient) await setCheck(v.contract.id, m.id, c.id, "client", true);
      const fresh = await getContractForClientAgency(buyer.id, f.o.contractId);
      const r = fresh ? await approveMilestone(fresh, m.id) : { error: "locked" };
      effect = "ok" in r ? "milestone_approved" : "milestone_locked";
    } else {
      const r = await requestChanges(v, m.id, note);
      effect = "ok" in r ? "milestone_changes_requested" : "milestone_locked";
    }
  }
  await db.update(workOrderSubmissions).set({ contractEffect: effect }).where(and(eq(workOrderSubmissions.workOrderId, id), eq(workOrderSubmissions.round, round)));
  await addNotifications([{ agencyId: f.o.supplierAgencyId, kind: decision === "approved" ? "work_order_approved" : "work_order_changes", href: `/studio/collab/orders/${id}`, params: { name: buyer.name, title: f.o.title } }]);
  await audit(buyer.ownerUserId ?? null, `collab.work_order.${decision}`, "work_order", id, { effect });
  return { ok: true, effect };
}

export async function closeWorkOrder(buyer: Agency, id: string): Promise<Res> {
  const db = await getDb();
  const f = await orderFor(db, buyer.id, id);
  if (!f || f.role !== "buyer") return { error: "notFound" };
  return (await bump(db, id, "closed", ["approved"])) ? { ok: true } : { error: "locked" };
}

// ---- reads ----------------------------------------------------------------

export type OrderRow = { order: Workspace["order"]; role: Role; other: ReturnType<typeof party>; version: WorkOrderVersion | null };

export async function listWorkOrders(agencyId: string): Promise<OrderRow[]> {
  const db = await getDb();
  const rows = await db.select().from(workOrders).where(or(eq(workOrders.buyerAgencyId, agencyId), eq(workOrders.supplierAgencyId, agencyId))).orderBy(desc(workOrders.updatedAt)).limit(100);
  if (!rows.length) return [];
  const ids = [...new Set(rows.flatMap((r) => [r.buyerAgencyId, r.supplierAgencyId]))];
  const people = new Map((await db.select({ id: agencies.id, name: agencies.name, handle: agencies.handle, kind: agencies.kind }).from(agencies).where(inArray(agencies.id, ids))).map((a) => [a.id, a]));
  const versions = await db.select().from(workOrderVersions).where(inArray(workOrderVersions.workOrderId, rows.map((r) => r.id)));
  return rows.flatMap((o) => {
    const role: Role = o.buyerAgencyId === agencyId ? "buyer" : "supplier";
    if (role === "supplier" && o.status === "draft") return [];
    const other = people.get(role === "buyer" ? o.supplierAgencyId : o.buyerAgencyId);
    const order = Object.fromEntries(SUPPLIER_ORDER_FIELDS.map((k) => [k, o[k]])) as Workspace["order"];
    if (role === "buyer") order.parentContractId = o.parentContractId;
    return other ? [{ order, role, other: party(other), version: versions.find((v) => v.workOrderId === o.id && v.version === o.currentVersion) ?? null }] : [];
  });
}

export type Workspace = {
  order: Pick<WorkOrder, (typeof SUPPLIER_ORDER_FIELDS)[number]> & { parentContractId?: string | null };
  role: Role;
  buyer: ReturnType<typeof party>;
  supplier: ReturnType<typeof party>;
  versions: (WorkOrderVersion & { intact: boolean })[];
  current: WorkOrderVersion | null;
  messages: (WorkOrderMessage & { authorName: string })[];
  assets: (WorkOrderAsset & { comments: (WorkOrderComment & { authorName: string })[] })[];
  submissions: WorkOrderSubmission[];
  contract: { id: string; number: string; title: string; status: string; paymentMode: "direct" | "protected"; paymentsLive: boolean; currency: string; milestone: { id: string; title: string; status: string; amountFils: number } | null } | null;
  linkable: { id: string; number: string; title: string; milestones: { id: string; title: string; status: string }[] }[];
  payment: PaymentProjection;
  hold: { status: string; startsAt: Date; endsAt: Date; units: number } | null;
  /** Disclosed mode: the share the supplier delivers through, if one exists. */
  share: { id: string; status: string } | null;
};

/**
 * The workspace as one party may see it. The supplier's copy has no parent
 * contract id and no private notes; both copies show the same shared thread,
 * files, versions and the payment projection of the linked contract.
 */
export async function workspaceFor(agencyId: string, id: string): Promise<Workspace | null> {
  const db = await getDb();
  const f = await orderFor(db, agencyId, id);
  if (!f) return null;
  const { o, role } = f;
  const people = new Map((await db.select({ id: agencies.id, name: agencies.name, handle: agencies.handle, kind: agencies.kind }).from(agencies).where(inArray(agencies.id, [o.buyerAgencyId, o.supplierAgencyId]))).map((a) => [a.id, a]));
  const versions = (await db.select().from(workOrderVersions).where(eq(workOrderVersions.workOrderId, id)).orderBy(asc(workOrderVersions.version))).map((v) => ({ ...v, intact: v.status !== "accepted" || v.termsHash === versionHash(id, v.version, v) }));
  const scopes = role === "buyer" ? ["private", "shared"] : ["shared"];
  const messageRows = await db.select().from(workOrderMessages).where(and(eq(workOrderMessages.workOrderId, id), inArray(workOrderMessages.scope, scopes))).orderBy(asc(workOrderMessages.createdAt)).limit(500);
  const assetRows = await db.select().from(workOrderAssets).where(eq(workOrderAssets.workOrderId, id)).orderBy(asc(workOrderAssets.createdAt));
  const commentRows = assetRows.length ? await db.select().from(workOrderComments).where(inArray(workOrderComments.assetId, assetRows.map((a) => a.id))).orderBy(asc(workOrderComments.createdAt)) : [];
  const submissions = await db.select().from(workOrderSubmissions).where(eq(workOrderSubmissions.workOrderId, id)).orderBy(asc(workOrderSubmissions.round));
  const name = (aid: string) => people.get(aid)?.name ?? "";
  let contract: Workspace["contract"] = null;
  let milestoneRow: { status: string; clientPaidDirect: boolean; agencyConfirmedPaid: boolean; releasedAt: Date | null } | null = null;
  let payoutInitiated = false;
  let signedAt: Date | null = null;
  if (o.contractId) {
    const [c] = await db.select().from(contracts).where(and(eq(contracts.id, o.contractId), eq(contracts.agencyId, o.supplierAgencyId), eq(contracts.clientAgencyId, o.buyerAgencyId)));
    if (c) {
      signedAt = c.clientSignedAt;
      const [m] = o.milestoneId ? await db.select().from(milestones).where(and(eq(milestones.id, o.milestoneId), eq(milestones.contractId, c.id))) : [];
      if (m) {
        milestoneRow = m;
        const [rel] = await db.select({ id: escrowLedger.id }).from(escrowLedger).where(and(eq(escrowLedger.milestoneId, m.id), eq(escrowLedger.type, "release"), ne(escrowLedger.status, "failed"))).limit(1);
        payoutInitiated = Boolean(rel);
      }
      contract = { id: c.id, number: c.number, title: c.title, status: c.status, paymentMode: c.paymentMode, paymentsLive: c.paymentsLive, currency: c.currency, milestone: m ? { id: m.id, title: m.title, status: m.status, amountFils: m.amountFils } : null };
    }
  }
  const payment = paymentProjection(contract ? { status: contract.status, paymentMode: contract.paymentMode, paymentsLive: contract.paymentsLive, clientSignedAt: signedAt } : null, milestoneRow, payoutInitiated);
  // Contracts the buyer could link: between these two, not cancelled.
  const linkable = role === "buyer" && !o.contractId ? await linkableContracts(db, o.supplierAgencyId, o.buyerAgencyId) : [];
  const hold = await holdFor(id);
  let share: Workspace["share"] = null;
  if (o.mode === "disclosed" && o.milestoneId) {
    const [s] = await db.select({ id: milestoneShares.id, status: milestoneShares.status }).from(milestoneShares).where(and(eq(milestoneShares.milestoneId, o.milestoneId), eq(milestoneShares.partnerAgencyId, o.supplierAgencyId), inArray(milestoneShares.status, ["proposed", "accepted"])));
    share = s ?? null;
  }
  const projected = Object.fromEntries(SUPPLIER_ORDER_FIELDS.map((k) => [k, o[k]])) as Workspace["order"];
  if (role === "buyer") projected.parentContractId = o.parentContractId;
  return {
    order: projected,
    role,
    buyer: party(people.get(o.buyerAgencyId)!),
    supplier: party(people.get(o.supplierAgencyId)!),
    versions,
    current: versions.find((v) => v.version === o.currentVersion) ?? null,
    messages: messageRows.map((m) => ({ ...m, authorName: name(m.authorAgencyId) })),
    assets: assetRows.map((a) => ({ ...a, comments: commentRows.filter((c) => c.assetId === a.id).map((c) => ({ ...c, authorName: name(c.authorAgencyId) })) })),
    submissions,
    contract,
    linkable,
    payment,
    hold: hold ? { status: hold.status, startsAt: hold.startsAt, endsAt: hold.endsAt, units: hold.units } : null,
    share,
  };
}

async function linkableContracts(db: Tx, supplierId: string, buyerId: string) {
  const rows = await db.select({ id: contracts.id, number: contracts.number, title: contracts.title }).from(contracts).where(and(eq(contracts.agencyId, supplierId), eq(contracts.clientAgencyId, buyerId), inArray(contracts.status, ["sent", "active"]))).orderBy(desc(contracts.createdAt)).limit(20);
  if (!rows.length) return [];
  const ms = await db.select({ id: milestones.id, contractId: milestones.contractId, title: milestones.title, status: milestones.status, position: milestones.position }).from(milestones).where(inArray(milestones.contractId, rows.map((r) => r.id))).orderBy(asc(milestones.position));
  return rows.map((r) => ({ ...r, milestones: ms.filter((m) => m.contractId === r.id).map((m) => ({ id: m.id, title: m.title, status: m.status })) }));
}

/** For the new-order page: contracts the buyer could attach, between exactly these two. */
export async function linkableContractsFor(supplierId: string, buyerId: string) {
  return linkableContracts(await getDb(), supplierId, buyerId);
}

/** Badge: work orders waiting for this agency (offers to answer, submissions to review, amendments to answer). */
export async function pendingOrderCount(agencyId: string) {
  const db = await getDb();
  const [a] = await db.select({ n: sql<number>`count(*)::int` }).from(workOrders).where(and(eq(workOrders.supplierAgencyId, agencyId), eq(workOrders.status, "offered")));
  const [b] = await db.select({ n: sql<number>`count(*)::int` }).from(workOrders).where(and(eq(workOrders.buyerAgencyId, agencyId), eq(workOrders.status, "submitted")));
  return (a?.n ?? 0) + (b?.n ?? 0);
}

/** Work orders the milestone checklist must not forget: used by the contract page to link back. */
export async function ordersForContract(agencyId: string, contractId: string) {
  const db = await getDb();
  return db.select({ id: workOrders.id, title: workOrders.title, status: workOrders.status, milestoneId: workOrders.milestoneId }).from(workOrders).where(and(eq(workOrders.contractId, contractId), or(eq(workOrders.buyerAgencyId, agencyId), eq(workOrders.supplierAgencyId, agencyId))));
}


/** The Collaborate badge: open inquiries plus work orders waiting on this agency. */
export async function workBadgeCount(agencyId: string) {
  const [a, delivery] = await Promise.all([openInquiryCount(agencyId), canUse("collaboration_delivery")]);
  return a + (delivery ? await pendingOrderCount(agencyId) : 0);
}
