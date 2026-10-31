import { EyeOff, Pencil, Plus } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PinButton } from "@/components/studio/pin-button";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { getAgencyPostsForOwner } from "@/lib/data/posts";

export default async function StudioPostsPage({ params }: PageProps<"/[locale]/studio/posts">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Studio");
  const posts = await getAgencyPostsForOwner(agency.id);
  if (!posts.length) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link href="/studio/new" className={buttonVariants({ className: "mt-4" })}>{t("firstPost")}</Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {/* A heading, an add button and labelled actions: the grid alone didn't say what it was or what the icons do. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{t("postsTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("postsHint")}</p>
        </div>
        <Link href="/studio/new" className={buttonVariants({ className: "gap-1.5" })} data-testid="posts-add-work"><Plus className="size-4" aria-hidden />{t("nav.addWork")}</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="studio-posts">
        {posts.map((post) => (
          <div key={post.id} className="flex flex-col overflow-hidden rounded-xl border">
            <Link href={`/p/${post.id}`} className="relative block aspect-square bg-muted">
              {post.images[0] && <Image src={post.images[0].thumbUrl} alt="" fill unoptimized sizes="300px" className="object-cover" />}
              {post.status === "hidden" && (
                <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/70 px-2 py-1 text-xs text-white">
                  <EyeOff className="size-3" /> {t("hiddenByAdmin")}
                </span>
              )}
            </Link>
            <div className="flex flex-1 flex-col gap-1.5 p-2 text-xs">
              <p className="line-clamp-2 font-medium text-foreground" dir="auto" data-testid="studio-post-title">{post.caption.trim().split("\n")[0] || t("untitled")}</p>
              {post.client && <p className="truncate text-muted-foreground" dir="auto">{t("forClient", { client: post.client.name })}</p>}
              <p className="text-muted-foreground">{t("postStats", { views: post.viewCount, likes: post.likeCount })}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <Link href={`/studio/posts/${post.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 font-medium text-foreground hover:bg-muted" data-testid="studio-post-edit">
                  <Pencil className="size-3.5" aria-hidden /> {t("editOrDelete")}
                </Link>
                <PinButton postId={post.id} pinned={Boolean(post.pinned)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
