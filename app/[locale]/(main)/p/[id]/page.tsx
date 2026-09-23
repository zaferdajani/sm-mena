import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PostCard } from "@/components/post/post-card";
import { PostGrid } from "@/components/post/post-grid";
import { ReportDialog } from "@/components/post/report-dialog";
import { Link } from "@/i18n/navigation";
import { recordView } from "@/lib/data/interactions";
import { getFeed, getPost } from "@/lib/data/posts";
import { withState } from "@/lib/feed";
import { serviceLabel } from "@/lib/labels";
import { getVisitorId } from "@/lib/visitor";

export async function generateMetadata({ params }: PageProps<"/[locale]/p/[id]">): Promise<Metadata> {
  const { locale, id } = await params;
  const post = await getPost(id);
  if (!post) return {};
  const services = post.services.map((s) => serviceLabel(s, locale)).join(" · ");
  const image = post.images[0];
  return {
    title: `${post.agency.name}: ${services}`,
    description: post.caption.slice(0, 160),
    alternates: { canonical: `/${locale}/p/${post.id}`, languages: { ar: `/ar/p/${post.id}`, en: `/en/p/${post.id}` } },
    openGraph: { title: post.agency.name, description: post.caption.slice(0, 160), images: image ? [{ url: image.url, width: image.width, height: image.height }] : undefined },
  };
}

export default async function PostPage({ params }: PageProps<"/[locale]/p/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const post = await getPost(id);
  if (!post) notFound();
  const t = await getTranslations("Post");
  const visitorId = await getVisitorId();
  const [{ items: [item] }, more] = await Promise.all([
    withState([post], visitorId),
    getFeed({ agencyId: post.agency.id }, null, 7),
    recordView("post_view", post.agency.id, post.id, visitorId),
  ]);
  const others = more.items.filter((p) => p.id !== post.id).slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-[470px] sm:pt-6">
      <PostCard post={item} priority linkToPost={false} />
      <div className="flex justify-end px-3 py-2">
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
