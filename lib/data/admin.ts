import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, auditLogs, events, inquiries, postImages, posts, promotions, reports, users } from "@/lib/db/schema";
import { mediaUrl, storage } from "@/lib/storage";
import { normalizeForSearch } from "@/lib/text";

const DAY = 24 * 3600 * 1000;

export async function platformStats(now = new Date()) {
  const db = await getDb();
  const since = new Date(now.getTime() - 30 * DAY);
  const [[a], [p], [v], byType, [openReports], perAgency] = await Promise.all([
    db.select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${agencies.status} = 'active')::int`,
      verified: sql<number>`count(*) filter (where ${agencies.isVerified})::int`,
      demo: sql<number>`count(*) filter (where ${agencies.isDemo})::int`,
      paid: sql<number>`count(*) filter (where ${agencies.plan} <> 'free')::int`,
    }).from(agencies),
    db.select({ total: sql<number>`count(*)::int`, recent: sql<number>`count(*) filter (where ${posts.createdAt} >= ${since})::int` }).from(posts),
    db.select({ n: sql<number>`count(distinct ${events.visitorId})::int` }).from(events).where(gte(events.createdAt, since)),
    db.select({ type: events.type, n: sql<number>`count(*)::int` }).from(events).where(gte(events.createdAt, since)).groupBy(events.type),
    db.select({ n: sql<number>`count(*)::int` }).from(reports).where(eq(reports.status, "open")),
    db.select({ n: sql<number>`count(*)::int` }).from(events)
      .where(and(eq(events.type, "contact_click"), gte(events.createdAt, since)))
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
    { key: "agencies", value: s.agencies.active - s.agencies.demo, target: 150 },
    { key: "medianContacts", value: s.medianContactsPerAgency, target: 10 },
  ].map((c) => ({ ...c, met: c.value >= c.target }));
}

export async function adminListAgencies(q?: string) {
  const db = await getDb();
  const where = q ? sql`${agencies.searchText} like ${`%${normalizeForSearch(q)}%`}` : undefined;
  const rows = await db
    .select({ agency: agencies, email: users.email })
    .from(agencies)
    .innerJoin(users, eq(agencies.ownerUserId, users.id))
    .where(where)
    .orderBy(desc(agencies.createdAt))
    .limit(200);
  return rows.map((r) => ({ ...r.agency, ownerEmail: r.email, avatarUrl: mediaUrl(r.agency.avatarKey) }));
}

export async function setAgencyFlags(agencyId: string, patch: Partial<{ isVerified: boolean; status: "active" | "suspended"; plan: "free" | "pro" | "business"; planExpiresAt: Date | null }>) {
  const db = await getDb();
  await db.update(agencies).set({ ...patch, updatedAt: new Date() }).where(eq(agencies.id, agencyId));
}

/** Deletes every demo agency (and, via cascade, its posts, users and activity). */
export async function removeDemoData() {
  const db = await getDb();
  const demo = await db.select({ id: agencies.id, owner: agencies.ownerUserId, avatarKey: agencies.avatarKey }).from(agencies).where(eq(agencies.isDemo, true));
  if (!demo.length) return 0;
  const ids = demo.map((d) => d.id);
  const images = await db.select({ key: postImages.key, thumbKey: postImages.thumbKey }).from(postImages).innerJoin(posts, eq(postImages.postId, posts.id)).where(inArray(posts.agencyId, ids));
  await db.delete(users).where(inArray(users.id, demo.map((d) => d.owner)));
  await storage().remove([...images.flatMap((i) => [i.key, i.thumbKey]), ...demo.flatMap((d) => (d.avatarKey ? [d.avatarKey] : []))]).catch(() => {});
  return demo.length;
}

export async function listOpenReports() {
  const db = await getDb();
  const rows = await db
    .select({ report: reports, post: posts, agency: agencies })
    .from(reports)
    .leftJoin(posts, eq(reports.postId, posts.id))
    .leftJoin(agencies, eq(posts.agencyId, agencies.id))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt))
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
    .select({ id: auditLogs.id, action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId, meta: auditLogs.meta, createdAt: auditLogs.createdAt, actor: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
