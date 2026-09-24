import "server-only";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, events, inquiries, pageViews, posts, projectRequests, proposals, reviews } from "@/lib/db/schema";

// First-party statistics for Admin → Statistics (modelled on OneClickConvert's
// traffic page): where visitors come from, what they look at, and how far they
// get through the marketplace. Days are grouped in Jordan time.

const DAY_MS = 24 * 3600 * 1000;
const TZ = "Asia/Amman";

export function deviceOf(ua: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|kindle|silk/i.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/i.test(ua)) return "mobile";
  return "desktop";
}

/** Where a visit came from: UTM source, else the referring site, else "(direct)". */
export function sourceOf(utm: string | null | undefined, referrer: string | null | undefined, ownHost: string) {
  if (utm) return utm.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40) || "(direct)";
  if (!referrer) return "(direct)";
  try {
    const host = new URL(referrer).hostname.replace(/^www\.|^m\.|^l\./, "");
    if (!host || host === ownHost.split(":")[0].replace(/^www\./, "")) return "(direct)";
    // Group the big ones by name.
    if (/(^|\.)google\./.test(host)) return "google";
    if (/(^|\.)(facebook|fb)\.com$/.test(host)) return "facebook";
    if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
    if (/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(host)) return "x";
    return host.slice(0, 60);
  } catch {
    return "(direct)";
  }
}

export async function recordPageView(v: {
  path: string;
  locale?: string | null;
  landing: boolean;
  utm?: string | null;
  referrer?: string | null;
  sessionId: string;
  timezone?: string | null;
  userAgent: string;
  visitorId: string | null;
  ownHost: string;
}) {
  const db = await getDb();
  await db.insert(pageViews).values({
    path: v.path.split(/[?#]/)[0].slice(0, 200),
    source: v.landing ? sourceOf(v.utm, v.referrer, v.ownHost) : "",
    visitorId: v.visitorId,
    sessionId: v.sessionId,
    landing: v.landing,
    device: deviceOf(v.userAgent),
    locale: v.locale ?? null,
    timezone: v.timezone ?? null,
  });
}

export const RANGES = [7, 30, 90, 365] as const;

export async function trafficStats(days: number, now = new Date()) {
  const db = await getDb();
  const since = new Date(now.getTime() - days * DAY_MS);
  const inRange = gte(pageViews.createdAt, since);
  const who = sql`coalesce(${pageViews.visitorId}, ${pageViews.sessionId})`;
  // TZ is a constant, inlined so GROUP BY sees one identical expression.
  const day = sql<string>`to_char(${pageViews.createdAt} at time zone ${sql.raw(`'${TZ}'`)}, 'YYYY-MM-DD')`;

  const [[totals], daily, pages, sources, landings, devices, languages, zones] = await Promise.all([
    db
      .select({
        views: sql<number>`count(*)::int`,
        visitors: sql<number>`count(distinct ${who})::int`,
        sessions: sql<number>`count(distinct ${pageViews.sessionId})::int`,
      })
      .from(pageViews)
      .where(inRange),
    db.select({ day, views: sql<number>`count(*)::int`, visitors: sql<number>`count(distinct ${who})::int` }).from(pageViews).where(inRange).groupBy(day).orderBy(day),
    db.select({ key: pageViews.path, n: sql<number>`count(*)::int`, visitors: sql<number>`count(distinct ${who})::int` }).from(pageViews).where(inRange).groupBy(pageViews.path).orderBy(desc(sql`count(*)`)).limit(12),
    db.select({ key: pageViews.source, n: sql<number>`count(*)::int` }).from(pageViews).where(and(inRange, eq(pageViews.landing, true))).groupBy(pageViews.source).orderBy(desc(sql`count(*)`)).limit(10),
    db
      .select({ path: pageViews.path, source: pageViews.source, n: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(and(inRange, eq(pageViews.landing, true)))
      .groupBy(pageViews.path, pageViews.source)
      .orderBy(desc(sql`count(*)`))
      .limit(12),
    db.select({ key: pageViews.device, n: sql<number>`count(distinct ${pageViews.sessionId})::int` }).from(pageViews).where(inRange).groupBy(pageViews.device).orderBy(desc(sql`count(distinct ${pageViews.sessionId})`)),
    db.select({ key: sql<string>`coalesce(${pageViews.locale}, '?')`, n: sql<number>`count(distinct ${pageViews.sessionId})::int` }).from(pageViews).where(inRange).groupBy(sql`1`).orderBy(desc(sql`2`)),
    db.select({ key: sql<string>`coalesce(${pageViews.timezone}, '?')`, n: sql<number>`count(distinct ${pageViews.sessionId})::int` }).from(pageViews).where(inRange).groupBy(sql`1`).orderBy(desc(sql`2`)).limit(60),
  ]);

  // Fill days without traffic so the chart has no gaps.
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const series = Array.from({ length: Math.min(days, 365) }, (_, i) => {
    const d = new Date(now.getTime() - (Math.min(days, 365) - 1 - i) * DAY_MS).toLocaleDateString("en-CA", { timeZone: TZ });
    return { day: d, views: byDay.get(d)?.views ?? 0, visitors: byDay.get(d)?.visitors ?? 0 };
  });

  return { totals, series, pages, sources, landings, devices, languages, zones };
}

/** How far visitors get: browse → look at an agency → contact → project request → quote accepted. */
export async function marketplaceStats(days: number, now = new Date()) {
  const db = await getDb();
  const since = new Date(now.getTime() - days * DAY_MS);
  const ev = (type: (typeof events.type.enumValues)[number]) =>
    db.select({ n: sql<number>`count(distinct ${events.visitorId})::int`, total: count() }).from(events).where(and(eq(events.type, type), gte(events.createdAt, since)));
  const [[browsed], [viewed], [contacted], [inquired], [chatted], aiByProvider, [requests], [quotes], [accepted], [newAgencies], [newPosts], [newReviews], [messages]] = await Promise.all([
    db.select({ n: sql<number>`count(distinct coalesce(${pageViews.visitorId}, ${pageViews.sessionId}))::int` }).from(pageViews).where(gte(pageViews.createdAt, since)),
    ev("profile_view"),
    ev("contact_click"),
    ev("inquiry"),
    ev("ai_chat"),
    db.select({ key: sql<string>`coalesce(${events.detail}, 'basic')`, n: sql<number>`count(*)::int` }).from(events).where(and(eq(events.type, "ai_chat"), gte(events.createdAt, since))).groupBy(sql`1`).orderBy(desc(sql`2`)),
    db.select({ n: sql<number>`count(*)::int` }).from(projectRequests).where(gte(projectRequests.createdAt, since)),
    db.select({ n: sql<number>`count(*)::int` }).from(proposals).where(gte(proposals.createdAt, since)),
    db.select({ n: sql<number>`count(*)::int` }).from(proposals).where(and(eq(proposals.status, "accepted"), gte(proposals.createdAt, since))),
    db.select({ n: sql<number>`count(*)::int` }).from(agencies).where(and(gte(agencies.createdAt, since), eq(agencies.isDemo, false))),
    db.select({ n: sql<number>`count(*)::int` }).from(posts).where(gte(posts.createdAt, since)),
    db.select({ n: sql<number>`count(*)::int` }).from(reviews).where(gte(reviews.createdAt, since)),
    db.select({ n: sql<number>`count(*)::int` }).from(inquiries).where(gte(inquiries.createdAt, since)),
  ]);

  return {
    funnel: [
      { key: "browsed", n: browsed.n },
      { key: "viewedAgency", n: viewed.n },
      { key: "contacted", n: contacted.n + inquired.n },
      { key: "requests", n: requests.n },
      { key: "accepted", n: accepted.n },
    ],
    activity: { newAgencies: newAgencies.n, newPosts: newPosts.n, newReviews: newReviews.n, messages: messages.n, requests: requests.n, quotes: quotes.n, aiChats: chatted.total },
    aiByProvider,
  };
}
