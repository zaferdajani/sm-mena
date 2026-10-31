import { and, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, appSettings, auditLogs, contracts, events, inquiries, postImages, posts, projectRequests, promotions, proposals, reports, requestMatches, users } from "@/lib/db/schema";
import { mediaUrl, storage } from "@/lib/storage";
import { normalizeForSearch } from "@/lib/text";
import { ofRealAgency, ofRealAgencyOrNone } from "@/lib/data/real-data";

const DAY = 24 * 3600 * 1000;

export async function platformStats(now = new Date()) {
  const db = await getDb();
  const since = new Date(now.getTime() - 30 * DAY);
  // Real activity only: demo pages, staff test pages and everything on them are left out (lib/data/real-data.ts).
  const realAgency = ofRealAgency(db, agencies.id);
  const realEvent = ofRealAgencyOrNone(db, events.agencyId);
  const [[a], [p], [v], byType, [openReports], perAgency] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${agencies.status} = 'active')::int`,
      verified: sql<number>`count(*) filter (where ${agencies.isVerified})::int`,
      paid: sql<number>`count(*) filter (where ${agencies.plan} <> 'free')::int`,
    }).from(agencies).where(realAgency),
    db.select({ total: sql<number>`count(*)::int`, recent: sql<number>`count(*) filter (where ${posts.createdAt} >= ${since})::int` }).from(posts).where(ofRealAgency(db, posts.agencyId)),
    db.select({ n: sql<number>`count(distinct ${events.visitorId})::int` }).from(events).where(and(gte(events.createdAt, since), realEvent)),
    db.select({ type: events.type, n: sql<number>`count(*)::int` }).from(events).where(and(gte(events.createdAt, since), realEvent)).groupBy(events.type),
    db.select({ n: sql<number>`count(*)::int` }).from(reports).where(and(eq(reports.status, "open"), ofRealAgencyOrNone(db, reports.agencyId))),
    db.select({ n: sql<number>`count(*)::int` }).from(events)
      .where(and(eq(events.type, "contact_click"), gte(events.createdAt, since), ofRealAgency(db, events.agencyId)))
      .groupBy(events.agencyId),
  ]);
  const t = Object.fromEntries(byType.map((r) => [r.type, r.n])) as Record<string, number>;
  const counts = perAgency.map((r) => r.n).sort((x, y) => x - y);
  const activeAgencies = a.active || 1;
  // agencies with no clicks count as zero when taking the median
  const padded = [...Array(Math.max(0, a.active - counts.length)).fill(0), ...counts];
  const median = padded.length ? padded[Math.floor((padded.length - 1) / 2)] : 0;
  return {
    agencies: a,
    posts: p,
    visitors30d: v.n,
    contacts30d: t.contact_click ?? 0,
    inquiries30d: t.inquiry ?? 0,
    views30d: (t.profile_view ?? 0) + (t.post_view ?? 0),
    openReports: openReports.n,
    medianContactsPerAgency: median,
    contactsPerAgency: Math.round(((t.contact_click ?? 0) / activeAgencies) * 10) / 10,
  };
}

/** Switch-on triggers from docs/10-monetization.md. */
export function monetizationReadiness(s: Awaited<ReturnType<typeof platformStats>>) {
  return [
    { key: "visitors", value: s.visitors30d, target: 20000 },
    { key: "agencies", value: s.agencies.active, target: 150 },
    { key: "medianContacts", value: s.medianContactsPerAgency, target: 10 },
  ].map((c) => ({ ...c, met: c.value >= c.target }));
}

export const AGENCY_FILTERS = ["all", "new", "unverified", "suspended"] as const;
export type AgencyFilter = (typeof AGENCY_FILTERS)[number];

/** Admin → Agencies, newest first; `filter` narrows to what needs a look: joined this week, not verified yet, paused. */
export async function adminListAgencies(q?: string, filter: AgencyFilter = "all") {
  const db = await getDb();
  const narrow =
    filter === "new" ? gte(agencies.createdAt, new Date(Date.now() - 7 * 86_400_000))
    : filter === "unverified" ? and(eq(agencies.isVerified, false), eq(agencies.isDemo, false), eq(agencies.status, "active"))
    : filter === "suspended" ? eq(agencies.status, "suspended")
    : undefined;
  const where = and(q ? sql`${agencies.searchText} like ${`%${normalizeForSearch(q)}%`}` : undefined, narrow);
  const rows = await db
    .select({ agency: agencies, email: users.email })
    .from(agencies)
    .innerJoin(users, eq(agencies.ownerUserId, users.id))
    .where(where)
    .orderBy(desc(agencies.createdAt))
    .limit(200);
  const weekAgo = Date.now() - 7 * 86_400_000;
  return rows.map((r) => ({ ...r.agency, ownerEmail: r.email, avatarUrl: mediaUrl(r.agency.avatarKey), isNew: r.agency.createdAt.getTime() > weekAgo }));
}

export async function setAgencyFlags(agencyId: string, patch: Partial<{ isVerified: boolean; status: "active" | "suspended"; plan: "free" | "pro" | "business"; planExpiresAt: Date | null }>) {
  const db = await getDb();
  await db.update(agencies).set({ ...patch, updatedAt: new Date() }).where(eq(agencies.id, agencyId));
}

/**
 * Removes every demo agency (docs/32). Demo agencies that took part in any
 * contract are deactivated instead of deleted, so contracts and the test-mode
 * ledger stay as a permanent, labelled record; the rest are deleted (with
 * their posts, users and activity, via cascade).
 */
export async function removeDemoData(actorUserId: string | null = null) {
  const db = await getDb();
  const demo = await db
    .select({ id: agencies.id, owner: agencies.ownerUserId, avatarKey: agencies.avatarKey, status: agencies.status })
    .from(agencies)
    .where(and(eq(agencies.isDemo, true), ne(agencies.status, "deactivated")));
  if (!demo.length) return { deleted: 0, deactivated: 0 };
  const ids = demo.map((d) => d.id);
  const inContracts = new Set(
    (
      await db
        .select({ a: contracts.agencyId, b: contracts.clientAgencyId })
        .from(contracts)
        .where(or(inArray(contracts.agencyId, ids), inArray(contracts.clientAgencyId, ids)))
    ).flatMap((r) => [r.a, r.b].filter((x): x is string => Boolean(x))),
  );
  const keep = demo.filter((d) => inContracts.has(d.id));
  const remove = demo.filter((d) => !inContracts.has(d.id));
  const { deactivateAgency } = await import("./deactivation");
  for (const d of keep) await deactivateAgency(d.id, "demo_cleanup", actorUserId, "demo data removed; kept because it took part in contracts");
  const removeIds = remove.map((d) => d.id);
  const images = removeIds.length
    ? await db.select({ key: postImages.key, thumbKey: postImages.thumbKey }).from(postImages).innerJoin(posts, eq(postImages.postId, posts.id)).where(inArray(posts.agencyId, removeIds))
    : [];
  if (remove.length) await db.delete(users).where(inArray(users.id, remove.map((d) => d.owner)));
  // Seeded demo client requests go with them (contracts keep their own copy of the terms).
  await db.delete(projectRequests).where(eq(projectRequests.source, "demo"));
  // Remembered so the demo seed (npm run db:seed, Maintenance → seed-demo) never brings it back.
  await db.insert(appSettings).values({ key: "demo_removed", value: true }).onConflictDoUpdate({ target: appSettings.key, set: { value: true, updatedAt: new Date() } });
  await storage().remove([...images.flatMap((i) => [i.key, i.thumbKey]), ...remove.flatMap((d) => (d.avatarKey ? [d.avatarKey] : []))]).catch(() => {});
  return { deleted: remove.length, deactivated: keep.length };
}

/** Reports to act on, or (handled) the last ones already resolved or dismissed, so a decision never just disappears. */
export async function listOpenReports(handled = false) {
  const db = await getDb();
  const rows = await db
    .select({ report: reports, post: posts, agency: agencies })
    .from(reports)
    .leftJoin(posts, eq(reports.postId, posts.id))
    .leftJoin(agencies, eq(posts.agencyId, agencies.id))
    .where(handled ? inArray(reports.status, ["resolved", "dismissed"]) : eq(reports.status, "open"))
    .orderBy(desc(handled ? reports.resolvedAt : reports.createdAt))
    .limit(100);
  const postIds = rows.flatMap((r) => (r.post ? [r.post.id] : []));
  const covers = postIds.length
    ? await db.select().from(postImages).where(and(inArray(postImages.postId, postIds), eq(postImages.position, 0)))
    : [];
  const coverByPost = new Map(covers.map((c) => [c.postId, mediaUrl(c.thumbKey)]));
  return rows.map((r) => ({ ...r, coverUrl: r.post ? coverByPost.get(r.post.id) ?? null : null }));
}

export async function resolveReport(reportId: string, adminId: string, decision: "hide" | "dismiss") {
  const db = await getDb();
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!report) return;
  if (decision === "hide" && report.postId) await db.update(posts).set({ status: "hidden" }).where(eq(posts.id, report.postId));
  await db
    .update(reports)
    .set({ status: decision === "hide" ? "resolved" : "dismissed", resolvedBy: adminId, resolvedAt: new Date() })
    .where(report.postId ? and(eq(reports.postId, report.postId), eq(reports.status, "open")) : eq(reports.id, reportId));
}

export async function setPostStatus(postId: string, status: "published" | "hidden") {
  const db = await getDb();
  await db.update(posts).set({ status }).where(eq(posts.id, postId));
}

export async function listPromotions() {
  const db = await getDb();
  const rows = await db
    .select({ promotion: promotions, handle: agencies.handle, name: agencies.name })
    .from(promotions)
    .innerJoin(agencies, eq(promotions.agencyId, agencies.id))
    .orderBy(desc(promotions.createdAt))
    .limit(200);
  return rows;
}

export async function createPromotion(input: {
  agencyId: string;
  postId: string | null;
  placement: "feed" | "strip" | "explore";
  service: string | null;
  city: string | null;
  startsAt: Date;
  endsAt: Date;
  note: string;
  createdBy: string;
}) {
  const db = await getDb();
  const [row] = await db.insert(promotions).values(input).returning();
  return row;
}

export async function setPromotionStatus(id: string, status: "active" | "paused" | "ended") {
  const db = await getDb();
  await db.update(promotions).set({ status }).where(eq(promotions.id, id));
}

export async function recentInquiriesCount(days = 30) {
  const db = await getDb();
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(inquiries).where(gte(inquiries.createdAt, new Date(Date.now() - days * DAY)));
  return row.n;
}

/** Accounts with their agency, two-factor state and last sign-in (Admin → Users). */
export async function adminListUsers(q?: string) {
  const db = await getDb();
  const term = q?.trim().toLowerCase();
  return db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      mfa: sql<boolean>`${users.totpEnabledAt} is not null`,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
      agencyHandle: agencies.handle,
      agencyName: agencies.name,
    })
    .from(users)
    .leftJoin(agencies, eq(agencies.ownerUserId, users.id))
    .where(term ? sql`lower(${users.email}) like ${`%${term}%`} or lower(coalesce(${agencies.handle}, '')) like ${`%${term}%`}` : undefined)
    .orderBy(desc(users.createdAt))
    .limit(200);
}

export async function listAuditLog(limit = 200) {
  const db = await getDb();
  return db
    .select({ id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId, meta: auditLogs.meta, createdAt: auditLogs.createdAt, actor: users.email, agencyHandle: agencies.handle, agencyName: agencies.name })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    // Entries about an agency link to its page (the log showed only "agency:ef1140c4").
    .leftJoin(agencies, and(eq(auditLogs.entity, "agency"), sql`${auditLogs.entityId} = ${agencies.id}::text`))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/**
 * Admin → Requests: what business owners asked for and how far each request got (matched, invited, seen,
 * quotes). Read-only and without the client's name or phone: what the team needs is where a request is stuck.
 */
export async function adminRequests(status: "open" | "closed" | "all" = "open", limit = 100) {
  const db = await getDb();
  const rows = await db
    .select({
      id: projectRequests.id,
      businessType: projectRequests.businessType,
      services: projectRequests.services,
      country: projectRequests.country,
      city: projectRequests.city,
      budgetMinJod: projectRequests.budgetMinJod,
      budgetMaxJod: projectRequests.budgetMaxJod,
      source: projectRequests.source,
      status: projectRequests.status,
      createdAt: projectRequests.createdAt,
      expiresAt: projectRequests.expiresAt,
      matched: sql<number>`(select count(*)::int from ${requestMatches} m where m.request_id = ${projectRequests}.id)`,
      invited: sql<number>`(select count(*)::int from ${requestMatches} m where m.request_id = ${projectRequests}.id and m.invited)`,
      seen: sql<number>`(select count(*)::int from ${requestMatches} m where m.request_id = ${projectRequests}.id and m.viewed_at is not null)`,
      quotes: sql<number>`(select count(*)::int from ${proposals} p where p.request_id = ${projectRequests}.id)`,
    })
    .from(projectRequests)
    .where(status === "all" ? undefined : eq(projectRequests.status, status))
    .orderBy(desc(projectRequests.createdAt))
    .limit(limit);
  // Open, no quote after two days: the case the team should look at first.
  const twoDaysAgo = Date.now() - 2 * 86_400_000;
  return rows.map((r) => ({ ...r, stuck: r.status === "open" && r.quotes === 0 && r.createdAt.getTime() < twoDaysAgo }));
}
