import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, postImages, posts } from "@/lib/db/schema";
import { mediaUrl } from "@/lib/storage";
import { toSummary, type AgencySummary } from "./agencies";

export type HireCard = AgencySummary & { thumbs: { postId: string; url: string; color: string }[] };

function where(service: string, city?: string) {
  const c = [eq(agencies.status, "active"), sql`${service} = any(${agencies.services})`];
  if (city) c.push(eq(agencies.city, city));
  return and(...c);
}

/** Agencies offering a service (optionally in a city) with three recent work thumbnails each. */
export async function hireCards(service: string, city?: string, limit = 24): Promise<HireCard[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(agencies)
    .where(where(service, city))
    .orderBy(desc(agencies.isVerified), desc(sql`${agencies.postCount} > 0`), desc(agencies.followerCount))
    .limit(limit);
  if (!rows.length) return [];
  const thumbs = await db
    .select({ agencyId: posts.agencyId, postId: posts.id, key: postImages.thumbKey, color: postImages.color, createdAt: posts.createdAt })
    .from(posts)
    .innerJoin(postImages, and(eq(postImages.postId, posts.id), eq(postImages.position, 0)))
    .where(and(inArray(posts.agencyId, rows.map((r) => r.id)), eq(posts.status, "published")))
    .orderBy(desc(sql`${service} = any(${posts.services})`), desc(posts.createdAt), asc(posts.id));
  const byAgency = new Map<string, HireCard["thumbs"]>();
  for (const t of thumbs) {
    const list = byAgency.get(t.agencyId) ?? [];
    if (list.length < 3) list.push({ postId: t.postId, url: mediaUrl(t.key)!, color: t.color });
    byAgency.set(t.agencyId, list);
  }
  return rows.map((a) => ({ ...toSummary(a), thumbs: byAgency.get(a.id) ?? [] }));
}

/** Starting-price guide from agencies' own "from" prices. */
export async function priceGuide(service: string, city?: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      n: sql<number>`count(${agencies.startingPriceJod})::int`,
      min: sql<number | null>`min(${agencies.startingPriceJod})`,
      max: sql<number | null>`max(${agencies.startingPriceJod})`,
      median: sql<number | null>`percentile_cont(0.5) within group (order by ${agencies.startingPriceJod})`,
      agencies: sql<number>`count(*)::int`,
      verified: sql<number>`count(*) filter (where ${agencies.isVerified})::int`,
    })
    .from(agencies)
    .where(where(service, city));
  return { ...row, median: row.median === null ? null : Math.round(Number(row.median)) };
}

/** Cities with at least one agency for a service, most first. */
export async function citiesForService(service: string) {
  const db = await getDb();
  return db
    .select({ city: agencies.city, n: sql<number>`count(*)::int` })
    .from(agencies)
    .where(where(service))
    .groupBy(agencies.city)
    .orderBy(desc(sql`count(*)`));
}

/** Services with at least one active agency, for the hire index and sitemap. */
export async function serviceCounts() {
  const db = await getDb();
  const rows = await db
    .select({ service: sql<string>`unnest(${agencies.services})`, city: agencies.city })
    .from(agencies)
    .where(eq(agencies.status, "active"));
  const services = new Map<string, number>();
  const pairs = new Map<string, number>();
  for (const r of rows) {
    services.set(r.service, (services.get(r.service) ?? 0) + 1);
    pairs.set(`${r.service}|${r.city}`, (pairs.get(`${r.service}|${r.city}`) ?? 0) + 1);
  }
  return { services, pairs };
}
