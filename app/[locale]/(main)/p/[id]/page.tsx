import { DemoNotice } from "@/components/demo/demo-banner";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostCard } from "@/components/post/post-card";
import { PostGrid } from "@/components/post/post-grid";
import { ReportDialog } from "@/components/post/report-dialog";
import { Link } from "@/i18n/navigation";
import { recordView } from "@/lib/data/interactions";
import { getFeed, getPost } from "@/lib/data/posts";
import { localized, localizedPost } from "@/lib/content-lang";
import { withState } from "@/lib/feed";
import { serviceLabel } from "@/lib/labels";
import { isCrawlerRequest } from "@/lib/request";
import { pageMeta, postIndexable } from "@/lib/seo";
import { getVisitorId, interactionKey } from "@/lib/visitor";

const captionFits = (caption: string, locale: string) => (/[\u0600-\u06FF]/.test(caption) ? locale === "ar" : locale !== "ar");

export async function generateMetadata({ params }: PageProps<"/[locale]/p/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const found = await getPost(id);
  if (!found) return {};
  const post = localizedPost(found, locale);
  const t = await getTranslations({ locale, namespace: "Seo" });
  const service = post.services[0] ? serviceLabel(post.services[0], locale) : "";
  const image = post.images[0];
  // The caption is the agency's own words; on the other language's page a short localized line is used instead.
  const description = captionFits(post.caption, locale) && post.caption.trim() ? post.caption : t("postDescription", { agency: post.agency.name, service });
  return pageMeta({
    locale,
    path: `/p/${post.id}`,
    title: t("postTitle", { agency: post.agency.name, service }),
    description,
    images: image ? [{ url: image.url, width: image.width, height: image.height, alt: t("postTitle", { agency: post.agency.name, service }) }] : undefined,
    type: "article",
    noindex: post.agency.isDemo || !postIndexable(post.caption),
  });
}

export default async function PostPage({ params }: PageProps<"/[locale]/p/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const found = await getPost(id);
  if (!found) notFound();
  const post = localizedPost(found, locale);
  const t = await getTranslations("Post");
  const tSeo = await getTranslations("Seo");
  const visitorId = await getVisitorId();
  const [{ items: [item] }, more] = await Promise.all([
    withState([post], await interactionKey()),
    getFeed({ agencyId: post.agency.id }, null, 7),
    (await isCrawlerRequest()) ? null : recordView("post_view", post.agency.id, post.id, visitorId),
  ]);
  const others = more.items.filter((p) => p.id !== post.id).slice(0, 6);
  const clientName = post.client ? localized({ name: post.client.name }, { name: post.client.nameTranslation ?? undefined }, post.contentLang, locale).name : undefined;
  const tp = await getTranslations("Profile");

  return (
    <div className="mx-auto w-full max-w-[470px] sm:pt-6">
      <h1 className="sr-only">{tSeo("postTitle", { agency: post.agency.name, service: post.services[0] ? serviceLabel(post.services[0], locale) : "" })}</h1>
      {post.agency.isDemo && (
        <div className="px-3 pb-3 pt-3 sm:pt-0">
          <DemoNotice kind="post" />
        </div>
      )}
      <PostCard post={item} priority linkToPost={false} />
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        {clientName && post.client ? (
          <Link href={`/a/${post.agency.handle}/c/${post.client.id}`} className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-brand" data-testid="post-client">
            {post.client.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={post.client.logoUrl} alt="" className="size-6 shrink-0 rounded-full border bg-white object-cover" />
            )}
            {tp("forClient", { name: clientName })}
          </Link>
        ) : (
          <span />
        )}
        <ReportDialog postId={post.id} />
      </div>
      {others.length > 0 && (
        <section className="mt-4 border-t pt-4">
          <h2 className="mb-3 px-3 text-sm font-semibold text-muted-foreground">
            <Link href={`/a/${post.agency.handle}`}>{t("moreFrom", { handle: post.agency.handle })}</Link>
          </h2>
          <PostGrid posts={others} />
        </section>
      )}
    </div>
  );
}
