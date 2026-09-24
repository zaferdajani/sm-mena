import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { serviceCounts } from "@/lib/data/hire";
import { getDb } from "@/lib/db";
import { agencies, posts } from "@/lib/db/schema";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

function entry(path: string, lastModified?: Date, priority = 0.6): MetadataRoute.Sitemap[number] {
  return {
    url: `${SITE_URL}/ar${path}`,
    lastModified,
    priority,
    alternates: { languages: { ...Object.fromEntries(routing.locales.map((l) => [l, `${SITE_URL}/${l}${path}`])), "x-default": `${SITE_URL}/${routing.defaultLocale}${path}` } },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = await getDb();
  const [agencyRows, postRows, { services, pairs }] = await Promise.all([
    db.select({ handle: agencies.handle, updatedAt: agencies.updatedAt }).from(agencies).where(eq(agencies.status, "active")),
    db
      .select({ id: posts.id, createdAt: posts.createdAt })
      .from(posts)
      .innerJoin(agencies, eq(posts.agencyId, agencies.id))
      .where(and(eq(posts.status, "published"), eq(agencies.status, "active"))),
    serviceCounts(),
  ]);
  return [
    entry("", undefined, 1),
    entry("/explore", undefined, 0.8),
    entry("/hire", undefined, 0.9),
    entry("/join", undefined, 0.5),
    ...[...services.keys()].map((s) => entry(`/hire/${s}`, undefined, 0.9)),
    ...[...pairs.keys()].map((k) => {
      const [s, c] = k.split("|");
      return entry(`/hire/${s}/${c}`, undefined, 0.8);
    }),
    ...agencyRows.map((a) => entry(`/a/${a.handle}`, a.updatedAt, 0.7)),
    ...postRows.map((p) => entry(`/p/${p.id}`, p.createdAt, 0.5)),
  ];
}
