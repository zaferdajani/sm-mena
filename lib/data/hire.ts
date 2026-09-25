import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, packages, postImages, posts } from "@/lib/db/schema";
import { mediaUrl } from "@/lib/storage";
import { toSummary, type AgencySummary } from "./agencies";
import { summarizePrices, median, MIN_PRICE_SAMPLE } from "@/lib/price-stats";
import { inCountry, realUnless } from "./agency-filters";

export type HireCard = AgencySummary & { thumbs: { postId: string; url: string; color: string }[] };

/** A hire page's place: a city, a whole country, or (neither) every country. */
export type Place = { city?: string; country?: string };

function where(service: string, place: Place = {}) {
  const c = [eq(agencies.status, "active"), sql`${service} = any(${agencies.services})`];
  if (place.city) c.push(eq(agencies.city, place.city));
  if (place.country) c.push(inCountry(place.country));
  return and(...c);
}

/**
 * Agencies offering a service (optionally in a city) with three recent work
 * thumbnails each. Demo agencies only in the labelled demo view (docs/31).
 */
export async function hireCards(service: string, place: Place = {}, { limit = 24, includeDemo = false } = {}): Promise<HireCard[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(agencies)
    .where(and(where(service, place), realUnless(includeDemo)))
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

/**
 * Starting-price guide from real agencies' own "from" prices (never demo
 * ones), summarised the same way everywhere (lib/price-stats.ts). `range` is
 * null below MIN_PRICE_SAMPLE prices: too few to present as market data.
 */
export async function priceGuide(service: string, place: Place = {}) {
  const db = await getDb();
  const rows = await db
    .select({ price: agencies.startingPriceJod, verified: agencies.isVerified, updatedAt: agencies.updatedAt })
    .from(agencies)
    .where(and(where(service, place), eq(agencies.isDemo, false)));
  const priced = rows.filter((r) => r.price !== null && r.price > 0);
  const summary = summarizePrices(priced.map((r) => r.price!));
  const updatedAt = priced.reduce<Date | null>((d, r) => (!d || r.updatedAt > d ? r.updatedAt : d), null);
  return {
    agencies: rows.length,
    verified: rows.filter((r) => r.verified).length,
    n: summary?.n ?? 0,
    min: summary?.min ?? null,
    max: summary?.max ?? null,
    median: summary?.median ?? null,
    range: summary && summary.n >= MIN_PRICE_SAMPLE ? summary : null,
    updatedAt,
  };
}

/** Cities with at least one real agency for a service (in a country, if given), most first. */
export async function citiesForService(service: string, country?: string) {
  const db = await getDb();
  return db
    .select({ city: agencies.city, n: sql<number>`count(*)::int` })
    .from(agencies)
    .where(and(where(service, { country }), eq(agencies.isDemo, false)))
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
    .select({ service: sql<string>`unnest(${agencies.services})`, city: agencies.city, country: agencies.country })
    .from(agencies)
    .where(realOnly ? and(eq(agencies.status, "active"), eq(agencies.isDemo, false)) : eq(agencies.status, "active"));
  const services = new Map<string, number>();
  const pairs = new Map<string, number>();
  const countries = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  for (const r of rows) {
    bump(services, r.service);
    bump(pairs, `${r.service}|${r.city}`);
    bump(countries, `${r.service}|${r.country}`);
  }
  return { services, pairs, countries };
}

/** Real active agencies per country for a service (the region-wide hire page). */
export async function countriesForService(service: string) {
  const db = await getDb();
  return db
    .select({ country: agencies.country, n: sql<number>`count(*)::int` })
    .from(agencies)
    .where(and(where(service), eq(agencies.isDemo, false)))
    .groupBy(agencies.country);
}

/** Real (non-demo) active agencies offering a service, optionally in a city. */
export async function realAgencyCount(service: string, place: Place = {}) {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(agencies)
    .where(and(where(service, place), eq(agencies.isDemo, false)));
  return row.n;
}

/** What real agencies charge in their packages for a service: price spread and typical delivery time. */
export async function packageFacts(service: string, place: Place = {}) {
  const db = await getDb();
  const rows = await db
    .select({ price: packages.priceJod, billing: packages.billing, days: packages.deliveryDays })
    .from(packages)
    .innerJoin(agencies, eq(packages.agencyId, agencies.id))
    .where(and(where(service, place), eq(agencies.isDemo, false), eq(packages.service, service)));
  if (rows.length < MIN_PRICE_SAMPLE) return null;
  const range = (xs: number[]) => {
    const s = summarizePrices(xs);
    return s && s.n >= MIN_PRICE_SAMPLE ? { min: s.min, median: s.median, max: s.max } : null;
  };
  const days = rows.map((r) => r.days).filter((d): d is number => typeof d === "number" && d > 0);
  return {
    count: rows.length,
    monthly: range(rows.filter((r) => r.billing === "monthly").map((r) => r.price)),
    oneOff: range(rows.filter((r) => r.billing !== "monthly").map((r) => r.price)),
    deliveryDays: median(days),
  };
}
