import { publicationFor } from "@/lib/data/publication";
import { profileIndexable } from "@/lib/launch-phase";
import { DemoNotice } from "@/components/demo/demo-banner";
import { Pencil } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppPanel } from "@/components/post/app-panel";
import { EmbedPlayer } from "@/components/post/embed-player";
import { PostCard } from "@/components/post/post-card";
import { PostGrid } from "@/components/post/post-grid";
import { ReportDialog } from "@/components/post/report-dialog";
import { DeletePostButton } from "@/components/studio/delete-post-button";
import { Link } from "@/i18n/navigation";
import { getCurrentAgency } from "@/lib/auth/session";
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
    noindex: !profileIndexable((await publicationFor(post.agency.id)).visibility, post.agency.isDemo) || !postIndexable(post.caption),
  });
}

export default async function PostPage({ params, searchParams }: PageProps<"/[locale]/p/[id]">) {
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
  const tc = await getTranslations("Common");
  // The owner edits or deletes the project right here instead of reporting it.
  const isOwner = (await getCurrentAgency())?.id === post.agency.id;
  const justPublished = isOwner && (await searchParams).published === "1";

  return (
    <div className="mx-auto w-full max-w-[470px] sm:pt-6">
      {justPublished && (
        <div role="status" className="mx-3 mb-3 mt-3 rounded-xl border border-brand-line bg-brand-soft p-4 text-sm sm:mt-0" data-testid="post-published">
          <p className="font-semibold">✓ {tc("publishedTitle")}</p>
          <p className="mt-1 text-muted-foreground">{tc("publishedBody")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/studio/new" className="inline-flex h-9 items-center rounded-lg bg-brand px-3 font-medium text-white hover:bg-brand-deep" data-testid="published-add-another">{tc("addAnother")}</Link>
            <Link href={`/a/${post.agency.handle}`} className="inline-flex h-9 items-center rounded-lg border px-3 font-medium hover:bg-muted">{tc("viewMyPage")}</Link>
            <Link href="/studio" className="inline-flex h-9 items-center rounded-lg px-3 font-medium text-brand hover:bg-muted">{tc("backToStudio")}</Link>
          </div>
        </div>
      )}
      <h1 className="sr-only">{tSeo("postTitle", { agency: post.agency.name, service: post.services[0] ? serviceLabel(post.services[0], locale) : "" })}</h1>
      {post.agency.isDemo && (
        <div className="px-3 pb-3 pt-3 sm:pt-0">
          <DemoNotice kind="post" />
        </div>
      )}
      <PostCard post={item} priority linkToPost={false} />
      {post.app && (
        <div className="px-3 pt-2">
          <AppPanel app={post.app} />
        </div>
      )}
      {post.embed && (
        <div className="px-3 pt-2">
          <EmbedPlayer embed={post.embed} title={t("embedTitle", { provider: t(`provider.${post.embed.provider}`) })} />
        </div>
      )}
      {post.sourceUrl && (
        <p className="px-3 pt-2 text-xs text-muted-foreground">
          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline" data-testid="post-source">
            {post.embed ? t("sourceOn", { provider: t(`provider.${post.embed.provider}`) }) : t("sourceBehance")} ↗
          </a>
        </p>
      )}
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
        {isOwner ? (
          <div className="flex shrink-0 items-center gap-2" data-testid="post-owner-actions">
            <Link href={`/studio/posts/${post.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted" data-testid="edit-post">
              <Pencil className="size-4" aria-hidden />
              {tc("edit")}
            </Link>
            <DeletePostButton postId={post.id} />
          </div>
        ) : (
          <ReportDialog postId={post.id} />
        )}
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
