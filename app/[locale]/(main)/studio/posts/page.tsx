import { EyeOff, Pencil } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="studio-posts">
      {posts.map((post) => (
        <div key={post.id} className="overflow-hidden rounded-xl border">
          <Link href={`/p/${post.id}`} className="relative block aspect-square bg-muted">
            {post.images[0] && <Image src={post.images[0].thumbUrl} alt="" fill unoptimized sizes="300px" className="object-cover" />}
            {post.status === "hidden" && (
              <span className="absolute inset-x-0 bottom-0 flex items-center gap-1 bg-black/70 px-2 py-1 text-xs text-white">
                <EyeOff className="size-3" /> {t("hiddenByAdmin")}
              </span>
            )}
          </Link>
          <div className="flex items-center justify-between gap-2 p-2 text-xs text-muted-foreground">
            <span>👁 {post.viewCount} · ♥ {post.likeCount}</span>
            <Link href={`/studio/posts/${post.id}`} className="flex items-center gap-1 text-foreground" aria-label={t("form.saveChanges")}>
              <Pencil className="size-3.5" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
