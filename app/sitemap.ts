import type { MetadataRoute } from "next";
import { and, desc, eq, max } from "drizzle-orm";
import { serviceCounts } from "@/lib/data/hire";
import { getDb } from "@/lib/db";
import { agencies, posts } from "@/lib/db/schema";
import { routing } from "@/i18n/routing";
import { INDEX_MIN_CITY, INDEX_MIN_SERVICE, postIndexable, siteIndexable } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * Derived from the same data and rules as the pages (lib/seo.ts), so the
 * sitemap never lists a page that says noindex: no demo agencies, no thin hire
 * pages. Each language version is its own entry with the full hreflang set.
 */
function entries(path: string, lastModified?: Date | null, priority = 0.6): MetadataRoute.Sitemap {
  const languages = {
    ...Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])),
    "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
  };
  return routing.locales.map((l) => ({
    url: `${SITE_URL}/${l}${path}`,
    lastModified: lastModified ?? undefined,
    priority: l === routing.defaultLocale ? priority : Math.round(priority * 90) / 100,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!siteIndexable()) return [];
  const db = await getDb();
  const real = and(eq(agencies.status, "active"), eq(agencies.isDemo, false));
  const [agencyRows, postRows, [{ latest }], { services, pairs, countries }] = await Promise.all([
    db.select({ handle: agencies.handle, updatedAt: agencies.updatedAt }).from(agencies).where(real),
    db
      .select({ id: posts.id, caption: posts.caption, createdAt: posts.createdAt })
      .from(posts)
      .innerJoin(agencies, eq(posts.agencyId, agencies.id))
      .where(and(eq(posts.status, "published"), real))
      .orderBy(desc(posts.createdAt))
      .limit(5000),
    db.select({ latest: max(agencies.updatedAt) }).from(agencies).where(real),
    serviceCounts({ realOnly: true }),
  ]);
  const newestPost = postRows[0]?.createdAt ?? null;
  return [
    ...entries("", newestPost ?? latest, 1),
    ...entries("/feed", newestPost, 0.8),
    ...entries("/hire", latest, 0.9),
    ...[...services].filter(([, n]) => n >= INDEX_MIN_SERVICE).flatMap(([s]) => entries(`/hire/${s}`, latest, 0.9)),
    ...[...countries].filter(([, n]) => n >= INDEX_MIN_SERVICE).flatMap(([k]) => {
      const [s, c] = k.split("|");
      return entries(`/hire/${s}/${c}`, latest, 0.85);
    }),
    ...[...pairs].filter(([, n]) => n >= INDEX_MIN_CITY).flatMap(([k]) => {
      const [s, c] = k.split("|");
      return entries(`/hire/${s}/${c}`, latest, 0.8);
    }),
    ...entries("/explore", newestPost, 0.7),
    ...entries("/match", null, 0.6),
    ...entries("/about", null, 0.5),
    ...entries("/contact", null, 0.4),
    ...entries("/join", null, 0.4),
    ...entries("/legal", null, 0.2),
    ...agencyRows.flatMap((a) => entries(`/a/${a.handle}`, a.updatedAt, 0.8)),
    ...postRows.filter((p) => postIndexable(p.caption)).flatMap((p) => entries(`/p/${p.id}`, p.createdAt, 0.5)),
  ];
}
