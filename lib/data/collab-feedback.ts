import "server-only";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, collabFeedback, collabPrefs, workOrders, type Agency, type CollabFeedbackRow } from "@/lib/db/schema";
import { addNotifications } from "./notifications";

// Collaborator feedback (docs/50 §evidence, AC26): a class of its own, never
// merged with client reviews, Google ratings or paid-project provenance.
// Only the two parties of a finished work order may write, once each; the
// author chooses whether it stays between the parties or may appear on the
// other side's public page; the subject can dispute it (hidden until staff
// decide) or opt out of public display altogether.

export type FeedbackInput = { communication: number; reliability: number; quality: number; body: string; visibility: "parties" | "public" };
export type FeedbackError = "notFound" | "notFinished" | "invalid";
const FINISHED = ["approved", "closed"];

export async function leaveFeedback(me: Agency, workOrderId: string, input: FeedbackInput): Promise<{ ok: true; id: string; duplicate: boolean } | { error: FeedbackError }> {
  if (!/^[0-9a-f-]{36}$/.test(workOrderId)) return { error: "notFound" };
  for (const n of [input.communication, input.reliability, input.quality]) if (!Number.isInteger(n) || n < 1 || n > 5) return { error: "invalid" };
  const db = await getDb();
  const [o] = await db.select().from(workOrders).where(and(eq(workOrders.id, workOrderId), or(eq(workOrders.buyerAgencyId, me.id), eq(workOrders.supplierAgencyId, me.id))));
  if (!o) return { error: "notFound" };
  if (!FINISHED.includes(o.status)) return { error: "notFinished" };
  const role = o.buyerAgencyId === me.id ? "buyer" : "supplier";
  const about = role === "buyer" ? o.supplierAgencyId : o.buyerAgencyId;
  // Once per engagement and side: a retry returns the existing record instead of a second one.
  const inserted = await db
    .insert(collabFeedback)
    .values({ workOrderId, authorAgencyId: me.id, aboutAgencyId: about, authorRole: role, communication: input.communication, reliability: input.reliability, quality: input.quality, body: input.body.trim().slice(0, 1500), visibility: input.visibility })
    .onConflictDoNothing({ target: [collabFeedback.workOrderId, collabFeedback.authorAgencyId] })
    .returning({ id: collabFeedback.id });
  if (inserted.length) {
    await addNotifications([{ agencyId: about, kind: "collab_feedback", href: `/studio/collab/orders/${workOrderId}`, params: { name: me.name, title: o.title } }]);
    return { ok: true, id: inserted[0].id, duplicate: false };
  }
  const [existing] = await db.select({ id: collabFeedback.id }).from(collabFeedback).where(and(eq(collabFeedback.workOrderId, workOrderId), eq(collabFeedback.authorAgencyId, me.id)));
  return { ok: true, id: existing.id, duplicate: true };
}

/** The subject disputes a record: it leaves public view until staff decide. */
export async function disputeFeedback(me: Agency, id: string, note: string): Promise<{ ok: true } | { error: FeedbackError }> {
  if (!/^[0-9a-f-]{36}$/.test(id) || note.trim().length < 3) return { error: "invalid" };
  const db = await getDb();
  const rows = await db
    .update(collabFeedback)
    .set({ status: "disputed", disputeNote: note.trim().slice(0, 1000), disputedAt: new Date() })
    .where(and(eq(collabFeedback.id, id), eq(collabFeedback.aboutAgencyId, me.id), eq(collabFeedback.status, "published")))
    .returning({ id: collabFeedback.id });
  return rows.length ? { ok: true } : { error: "notFound" };
}

/** Staff decision: keep it (published) or hide it. Never edits the text. */
export async function moderateFeedback(id: string, status: "published" | "hidden") {
  const db = await getDb();
  const rows = await db.update(collabFeedback).set({ status, moderatedAt: new Date() }).where(eq(collabFeedback.id, id)).returning({ id: collabFeedback.id });
  return rows.length > 0;
}

export async function feedbackForOrder(workOrderId: string) {
  const db = await getDb();
  return db.select().from(collabFeedback).where(eq(collabFeedback.workOrderId, workOrderId)).orderBy(desc(collabFeedback.createdAt));
}

export type PublicFeedback = { count: number; averages: { communication: number; reliability: number; quality: number } | null; items: { id: string; authorName: string; authorRole: string; communication: number; reliability: number; quality: number; body: string; createdAt: Date }[] };

/**
 * What a public page may show: published records the author consented to
 * publish, only while the subject has not opted out. No client, work-order
 * title, amount or file is included: the engagement itself stays confidential.
 */
export async function publicFeedbackFor(agencyId: string): Promise<PublicFeedback> {
  const db = await getDb();
  const [pref] = await db.select({ show: collabPrefs.showFeedback }).from(collabPrefs).where(eq(collabPrefs.agencyId, agencyId));
  const none: PublicFeedback = { count: 0, averages: null, items: [] };
  if (pref && !pref.show) return none;
  const visible = and(eq(collabFeedback.aboutAgencyId, agencyId), eq(collabFeedback.status, "published"), eq(collabFeedback.visibility, "public"));
  const [agg] = await db.select({ n: sql<number>`count(*)::int`, c: sql<number>`avg(${collabFeedback.communication})::float`, r: sql<number>`avg(${collabFeedback.reliability})::float`, q: sql<number>`avg(${collabFeedback.quality})::float` }).from(collabFeedback).where(visible);
  if (!agg?.n) return none;
  const rows = await db
    .select({ f: collabFeedback, name: agencies.name })
    .from(collabFeedback)
    .innerJoin(agencies, eq(agencies.id, collabFeedback.authorAgencyId))
    .where(visible)
    .orderBy(desc(collabFeedback.createdAt))
    .limit(20);
  const round = (x: number) => Math.round(x * 10) / 10;
  return { count: agg.n, averages: { communication: round(agg.c), reliability: round(agg.r), quality: round(agg.q) }, items: rows.map((r) => ({ id: r.f.id, authorName: r.name, authorRole: r.f.authorRole, communication: r.f.communication, reliability: r.f.reliability, quality: r.f.quality, body: r.f.body, createdAt: r.f.createdAt })) };
}

export async function setFeedbackOptOut(agencyId: string, show: boolean) {
  const db = await getDb();
  await db.insert(collabPrefs).values({ agencyId, showFeedback: show }).onConflictDoUpdate({ target: collabPrefs.agencyId, set: { showFeedback: show, updatedAt: new Date() } });
}

export type AdminFeedbackRow = { f: CollabFeedbackRow; author: string; about: string; aboutHandle: string };

/** Disputed first, then the latest, for Admin → Reviews. */
export async function feedbackForAdmin(limit = 100): Promise<AdminFeedbackRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ f: collabFeedback, author: agencies.name })
    .from(collabFeedback)
    .innerJoin(agencies, eq(agencies.id, collabFeedback.authorAgencyId))
    .orderBy(sql`case when ${collabFeedback.status} = 'disputed' then 0 else 1 end`, desc(collabFeedback.createdAt))
    .limit(limit);
  const aboutIds = [...new Set(rows.map((r) => r.f.aboutAgencyId))];
  const about = new Map((aboutIds.length ? await db.select({ id: agencies.id, name: agencies.name, handle: agencies.handle }).from(agencies).where(inArray(agencies.id, aboutIds)) : []).map((a) => [a.id, a]));
  return rows.map((r) => ({ f: r.f, author: r.author, about: about.get(r.f.aboutAgencyId)?.name ?? "", aboutHandle: about.get(r.f.aboutAgencyId)?.handle ?? "" }));
}
