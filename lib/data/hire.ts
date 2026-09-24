import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, packages, postImages, posts } from "@/lib/db/schema";
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

/**
 * Active agencies per service and per service+city, for the hire index and
 * sitemap. With realOnly, demo agencies don't count: search engines only see
 * pages that real agencies fill (lib/seo.ts INDEX_MIN_*).
 */
export async function serviceCounts({ realOnly = false } = {}) {
  const db = await getDb();
  const rows = await db
    .select({ service: sql<string>`unnest(${agencies.services})`, city: agencies.city })
    .from(agencies)
    .where(realOnly ? and(eq(agencies.status, "active"), eq(agencies.isDemo, false)) : eq(agencies.status, "active"));
  const services = new Map<string, number>();
  const pairs = new Map<string, number>();
  for (const r of rows) {
    services.set(r.service, (services.get(r.service) ?? 0) + 1);
    pairs.set(`${r.service}|${r.city}`, (pairs.get(`${r.service}|${r.city}`) ?? 0) + 1);
  }
  return { services, pairs };
}

/** Real (non-demo) active agencies offering a service, optionally in a city. */
export async function realAgencyCount(service: string, city?: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(agencies)
    .where(and(where(service, city), eq(agencies.isDemo, false)));
  return row.n;
}

/** What agencies charge in their packages for a service: price spread and typical delivery time. */
export async function packageFacts(service: string, city?: string) {
  const db = await getDb();
  const rows = await db
    .select({ price: packages.priceJod, billing: packages.billing, days: packages.deliveryDays })
    .from(packages)
    .innerJoin(agencies, eq(packages.agencyId, agencies.id))
    .where(and(where(service, city), eq(packages.service, service)));
  if (!rows.length) return null;
  const median = (xs: number[]) => {
    const v = [...xs].sort((a, b) => a - b);
    return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
  };
  const monthly = rows.filter((r) => r.billing === "monthly").map((r) => r.price);
  const oneOff = rows.filter((r) => r.billing !== "monthly").map((r) => r.price);
  const days = rows.map((r) => r.days).filter((d): d is number => typeof d === "number" && d > 0);
  return {
    count: rows.length,
    monthly: monthly.length ? { min: Math.min(...monthly), median: median(monthly)!, max: Math.max(...monthly) } : null,
    oneOff: oneOff.length ? { min: Math.min(...oneOff), median: median(oneOff)!, max: Math.max(...oneOff) } : null,
    deliveryDays: median(days),
  };
}
