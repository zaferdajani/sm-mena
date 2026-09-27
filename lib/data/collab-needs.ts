import "server-only";
import { and, arrayOverlaps, desc, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, collabNeedReplies, collabNeeds, partnerRequests, type Agency, type CollabNeed } from "@/lib/db/schema";
import { addDays } from "@/lib/collab/time";
import type { NeedInput } from "@/lib/collab/schemas";
import { currencyOf } from "@/lib/countries";
import { rolesOf, ROLE_KEYS } from "@/lib/services/catalog";
import { mediaUrl } from "@/lib/storage";
import { blockedSet } from "./collab-blocks";
import { addNotifications } from "./notifications";

// Published needs (docs/48 §discovery): an agency says, on purpose, "we are
// looking for X". Freelancers and specialist agencies discover them. Nothing
// is derived from seeks_roles; a need exists only when someone publishes it.

const offeredRoles = (a: Pick<Agency, "teamRoles" | "services">) => new Set([...a.teamRoles, ...rolesOf(a.services)]);

export async function publishNeed(agency: Agency, input: NeedInput): Promise<CollabNeed> {
  const db = await getDb();
  const now = new Date();
  const [row] = await db
    .insert(collabNeeds)
    .values({
      agencyId: agency.id,
      title: input.title,
      roles: input.roles.filter((r) => ROLE_KEYS.includes(r)),
      services: input.services,
      scope: input.scope,
      workMode: input.workMode,
      city: input.city || null,
      country: input.country,
      languages: input.languages,
      startsOn: input.startsOn || null,
      endsOn: input.endsOn || null,
      budgetMinFils: input.budgetMin === "" ? null : input.budgetMin,
      budgetMaxFils: input.budgetMax === "" ? null : input.budgetMax,
      currency: currencyOf(agency.country),
      modes: input.modes,
      audience: input.audience,
      status: "published",
      publishedAt: now,
      expiresAt: addDays(now, input.days),
      updatedAt: now,
    })
    .returning();
  return row;
}

export async function withdrawNeed(agencyId: string, id: string) {
  const db = await getDb();
  const rows = await db
    .update(collabNeeds)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(and(eq(collabNeeds.id, id), eq(collabNeeds.agencyId, agencyId), eq(collabNeeds.status, "published")))
    .returning({ id: collabNeeds.id });
  return rows.length > 0;
}

export async function markNeedFilled(agencyId: string, id: string) {
  const db = await getDb();
  const rows = await db.update(collabNeeds).set({ status: "filled", updatedAt: new Date() }).where(and(eq(collabNeeds.id, id), eq(collabNeeds.agencyId, agencyId), eq(collabNeeds.status, "published"))).returning({ id: collabNeeds.id });
  return rows.length > 0;
}

/** Daily job: published needs past their date read as expired (and vanish from every list). */
export async function expireNeeds(now = new Date()) {
  const db = await getDb();
  const rows = await db.update(collabNeeds).set({ status: "expired", updatedAt: now }).where(and(eq(collabNeeds.status, "published"), sql`${collabNeeds.expiresAt} <= ${now}`)).returning({ id: collabNeeds.id });
  return rows.length;
}

export type NeedWithReplies = CollabNeed & { replies: { id: string; status: string; note: string; createdAt: Date; provider: { id: string; handle: string; name: string; kind: "agency" | "freelancer"; city: string; avatarUrl: string | null } }[] };

/** The owner's needs with who raised a hand. */
export async function listMyNeeds(agencyId: string): Promise<NeedWithReplies[]> {
  const db = await getDb();
  const needs = await db.select().from(collabNeeds).where(and(eq(collabNeeds.agencyId, agencyId), ne(collabNeeds.status, "draft"))).orderBy(desc(collabNeeds.createdAt)).limit(50);
  if (!needs.length) return [];
  const replies = await db
    .select({ r: collabNeedReplies, a: { id: agencies.id, handle: agencies.handle, name: agencies.name, kind: agencies.kind, city: agencies.city, avatarKey: agencies.avatarKey } })
    .from(collabNeedReplies)
    .innerJoin(agencies, eq(collabNeedReplies.agencyId, agencies.id))
    .where(inArray(collabNeedReplies.needId, needs.map((n) => n.id)))
    .orderBy(desc(collabNeedReplies.createdAt));
  return needs.map((n) => ({
    ...n,
    replies: replies.filter((x) => x.r.needId === n.id).map((x) => ({ id: x.r.id, status: x.r.status, note: x.r.note, createdAt: x.r.createdAt, provider: { id: x.a.id, handle: x.a.handle, name: x.a.name, kind: x.a.kind, city: x.a.city, avatarUrl: mediaUrl(x.a.avatarKey) } })),
  }));
}

export type OpenNeed = CollabNeed & { agency: { id: string; handle: string; name: string; kind: "agency" | "freelancer"; city: string; avatarUrl: string | null }; matchedRoles: string[]; myReply: string | null };

/**
 * Needs a provider may see: published, not expired, in its country (or one it
 * serves), asking for a role it covers, from nobody it blocks or is blocked
 * by, and partner-only ones only from accepted partners. Bounded and ordered
 * newest first with the id as tie-break.
 */
export async function listOpenNeedsFor(me: Agency, now = new Date(), limit = 50, onlyId?: string): Promise<OpenNeed[]> {
  const mine = [...offeredRoles(me)];
  if (!mine.length) return [];
  const db = await getDb();
  const countries = [me.country, ...me.servesCountries];
  const rows = await db
    .select({ need: collabNeeds, agency: { id: agencies.id, handle: agencies.handle, name: agencies.name, kind: agencies.kind, city: agencies.city, avatarKey: agencies.avatarKey, isDemo: agencies.isDemo } })
    .from(collabNeeds)
    .innerJoin(agencies, eq(collabNeeds.agencyId, agencies.id))
    .where(and(eq(collabNeeds.status, "published"), gt(collabNeeds.expiresAt, now), ne(collabNeeds.agencyId, me.id), inArray(collabNeeds.country, countries), arrayOverlaps(collabNeeds.roles, mine), eq(agencies.status, "active"), onlyId ? eq(collabNeeds.id, onlyId) : undefined))
    .orderBy(desc(collabNeeds.publishedAt), desc(collabNeeds.id))
    .limit(limit * 2);
  if (!rows.length) return [];
  const blocked = await blockedSet(me.id);
  const partnerRows = await db
    .select({ a: partnerRequests.fromAgencyId, b: partnerRequests.toAgencyId })
    .from(partnerRequests)
    .where(and(eq(partnerRequests.status, "accepted"), or(eq(partnerRequests.fromAgencyId, me.id), eq(partnerRequests.toAgencyId, me.id))));
  const partners = new Set(partnerRows.map((p) => (p.a === me.id ? p.b : p.a)));
  const myReplies = new Map((await db.select({ needId: collabNeedReplies.needId, status: collabNeedReplies.status }).from(collabNeedReplies).where(eq(collabNeedReplies.agencyId, me.id))).map((r) => [r.needId, r.status]));
  return rows
    .filter((r) => !blocked.has(r.agency.id) && (r.need.audience === "public" || partners.has(r.agency.id)) && (!r.agency.isDemo || me.isDemo))
    .slice(0, limit)
    .map((r) => ({ ...r.need, agency: { id: r.agency.id, handle: r.agency.handle, name: r.agency.name, kind: r.agency.kind, city: r.agency.city, avatarUrl: mediaUrl(r.agency.avatarKey) }, matchedRoles: r.need.roles.filter((x) => mine.includes(x)), myReply: myReplies.get(r.need.id) ?? null }));
}

/** One open need for a provider that may see it, or null (an old link to a withdrawn need shows nothing). */
export async function openNeedFor(me: Agency, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  return (await listOpenNeedsFor(me, new Date(), 1, id))[0] ?? null;
}

export type ReplyResult = { ok: true } | { error: "notFound" | "exists" | "self" };

/** A provider raises a hand. One reply per need; a withdrawn reply can be renewed. */
export async function replyToNeed(me: Agency, needId: string, note: string): Promise<ReplyResult> {
  const need = await openNeedFor(me, needId);
  if (!need) return { error: "notFound" };
  if (need.agencyId === me.id) return { error: "self" };
  const db = await getDb();
  const text = note.trim().slice(0, 1000);
  const [row] = await db
    .insert(collabNeedReplies)
    .values({ needId, agencyId: me.id, note: text })
    .onConflictDoUpdate({ target: [collabNeedReplies.needId, collabNeedReplies.agencyId], set: { status: "interested", note: text, createdAt: new Date() }, setWhere: eq(collabNeedReplies.status, "withdrawn") })
    .returning({ id: collabNeedReplies.id, status: collabNeedReplies.status });
  if (!row) return { error: "exists" };
  await addNotifications([{ agencyId: need.agencyId, kind: "need_reply", href: "/studio/collab/needs", params: { name: me.name, title: need.title } }]);
  return { ok: true };
}

export async function withdrawReply(me: Agency, needId: string) {
  const db = await getDb();
  await db.update(collabNeedReplies).set({ status: "withdrawn" }).where(and(eq(collabNeedReplies.needId, needId), eq(collabNeedReplies.agencyId, me.id), eq(collabNeedReplies.status, "interested")));
}
