import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { events, posts } from "@/lib/db/schema";

export type Insights = {
  days: number;
  totals: Record<"profile_view" | "post_view" | "contact_click" | "inquiry" | "like" | "save" | "follow" | "recommended" | "proposal", number>;
  channels: Record<string, number>;
  daily: { date: string; clicks: number }[];
};

/** Aggregated activity for one agency over the last `days` days. */
export async function agencyInsights(agencyId: string, days: number, now = new Date()): Promise<Insights> {
  const db = await getDb();
  const since = new Date(now.getTime() - days * 24 * 3600 * 1000);
  const where = and(eq(events.agencyId, agencyId), gte(events.createdAt, since));

  const [byType, byChannel, byDay] = await Promise.all([
    db.select({ type: events.type, n: sql<number>`count(*)::int` }).from(events).where(where).groupBy(events.type),
    db
      .select({ channel: events.channel, n: sql<number>`count(*)::int` })
      .from(events)
      .where(and(where, eq(events.type, "contact_click")))
      .groupBy(events.channel),
    db
      .select({ day: sql<string>`to_char(date_trunc('day', ${events.createdAt}), 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
      .from(events)
      .where(and(where, eq(events.type, "contact_click")))
      .groupBy(sql`1`),
  ]);

  const totals = { profile_view: 0, post_view: 0, contact_click: 0, inquiry: 0, like: 0, save: 0, follow: 0, recommended: 0, proposal: 0 };
  for (const row of byType) if (row.type in totals) totals[row.type as keyof typeof totals] = row.n;
  const channels = Object.fromEntries(byChannel.filter((r) => r.channel).map((r) => [r.channel!, r.n]));
  const perDay = new Map(byDay.map((r) => [r.day, r.n]));
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(now.getTime() - (days - 1 - i) * 24 * 3600 * 1000);
    const key = d.toISOString().slice(0, 10);
    return { date: key, clicks: perDay.get(key) ?? 0 };
  });
  return { days, totals, channels, daily };
}

export async function topPosts(agencyId: string, limit = 3) {
  const db = await getDb();
  return db
    .select({ id: posts.id, caption: posts.caption, viewCount: posts.viewCount, likeCount: posts.likeCount, saveCount: posts.saveCount })
    .from(posts)
    .where(eq(posts.agencyId, agencyId))
    .orderBy(desc(posts.viewCount), desc(posts.likeCount))
    .limit(limit);
}
