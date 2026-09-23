import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReviewStatusButton } from "@/components/admin/admin-buttons";
import { Stars } from "@/components/reviews/stars";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { recentReviewsForAdmin } from "@/lib/data/reviews";
import { timeAgo } from "@/lib/format";

export default async function AdminReviews({ params }: PageProps<"/[locale]/admin/reviews">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("Reviews");
  const rows = await recentReviewsForAdmin();
  if (!rows.length) return <p className="py-10 text-center text-sm text-muted-foreground">{t("none")}</p>;
  return (
    <ul className="divide-y rounded-xl border" data-testid="admin-reviews">
      {rows.map(({ review: r, handle, name }) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm">
          <div className="min-w-0 flex-1 space-y-1">
            <p>
              <Link href={`/a/${handle}?tab=reviews`} className="font-semibold">{name}</Link> · {r.reviewerName}
              {r.reviewerBusiness ? ` (${r.reviewerBusiness})` : ""} · <span className="text-muted-foreground">{r.source === "invite" ? t("verifiedClient") : t("viaSawwiq")}</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Stars value={r.rating} size="size-3" /> {timeAgo(r.createdAt.toISOString(), locale)}
              {r.status === "hidden" && <span className="text-destructive">· {t("admin.hidden")}</span>}
            </div>
            <p className="line-clamp-3">{r.body}</p>
          </div>
          <ReviewStatusButton id={r.id} status={r.status} />
        </li>
      ))}
    </ul>
  );
}
