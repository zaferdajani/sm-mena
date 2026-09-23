import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyRow } from "@/components/agency-row";
import { PostGrid } from "@/components/post/post-grid";
import { Link } from "@/i18n/navigation";
import { toSummary } from "@/lib/data/agencies";
import { followedAgencyIds, savedPostIds } from "@/lib/data/interactions";
import { getPostsByIds } from "@/lib/data/posts";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { getVisitorId } from "@/lib/visitor";
import { and, eq, inArray } from "drizzle-orm";

export async function generateMetadata({ params }: PageProps<"/[locale]/saved">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Saved" });
  return { title: t("title"), robots: { index: false } };
}

export default async function SavedPage({ params }: PageProps<"/[locale]/saved">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Saved");
  const tr = await getTranslations("Requests");
  const visitorId = await getVisitorId();
  const [postIds, agencyIds] = visitorId ? await Promise.all([savedPostIds(visitorId), followedAgencyIds(visitorId)]) : [[], []];
  const posts = await getPostsByIds(postIds);
  const db = await getDb();
  const followed = agencyIds.length
    ? (await db.select().from(agencies).where(and(inArray(agencies.id, agencyIds), eq(agencies.status, "active")))).map(toSummary)
    : [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-0 pt-4 sm:px-4 sm:pt-8">
      <div className="px-4 sm:px-0">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-xs text-muted-foreground">{t("deviceNote")}</p>
        <Link href="/requests" className="mt-2 inline-block text-sm font-medium text-brand">{tr("myRequests")} →</Link>
      </div>
      <section>
        <h2 className="mb-2 px-4 text-sm font-semibold sm:px-0">{t("agencies")}</h2>
        {followed.length ? (
          <div className="grid gap-1 px-2 sm:grid-cols-2 sm:px-0">
            {followed.map((a) => (
              <AgencyRow key={a.id} agency={a} />
            ))}
          </div>
        ) : (
          <p className="px-4 text-sm text-muted-foreground sm:px-0">{t("emptyAgencies")}</p>
        )}
      </section>
      <section>
        <h2 className="mb-2 px-4 text-sm font-semibold sm:px-0">{t("posts")}</h2>
        {posts.length ? <PostGrid posts={posts} /> : <p className="px-4 text-sm text-muted-foreground sm:px-0">{t("emptyPosts")}</p>}
      </section>
    </div>
  );
}
