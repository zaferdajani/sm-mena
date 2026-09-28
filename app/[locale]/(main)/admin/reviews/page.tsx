import { REVIEW_LABEL } from "@/components/reviews/review-list";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CollabFeedbackStatusButton, ReviewStatusButton } from "@/components/admin/admin-buttons";
import { feedbackForAdmin } from "@/lib/data/collab-feedback";
import { Stars } from "@/components/reviews/stars";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { recentReviewsForAdmin } from "@/lib/data/reviews";
import { timeAgo } from "@/lib/format";

export default async function AdminReviews({ params }: PageProps<"/[locale]/admin/reviews">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("content.moderate");
  const t = await getTranslations("Reviews");
  const [rows, collab, tf] = await Promise.all([recentReviewsForAdmin(), feedbackForAdmin(), getTranslations("CollabFeedback")]);
  const collabList = collab.length > 0 && (
    <section className="space-y-2" data-testid="admin-collab-feedback">
      <h2 className="font-semibold">{tf("adminTitle")}</h2>
      <p className="text-xs text-muted-foreground">{tf("adminIntro")}</p>
      <ul className="divide-y rounded-xl border">
        {collab.map(({ f, author, about, aboutHandle }) => (
          <li key={f.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm" data-testid="admin-collab-feedback-row" data-status={f.status}>
            <div className="min-w-0 flex-1 space-y-1">
              <p><Link href={`/a/${aboutHandle}?tab=reviews`} className="font-semibold">{about}</Link> · {tf("by", { name: author })} · <span className="text-muted-foreground">{tf(`role.${f.authorRole}`)} · {tf(`visibility.${f.visibility}`)}</span></p>
              <p className="text-xs text-muted-foreground">{tf("communication")} {f.communication} · {tf("reliability")} {f.reliability} · {tf("quality")} {f.quality} · {timeAgo(f.createdAt.toISOString(), locale)}{f.status !== "published" ? <span className="text-destructive"> · {tf(`status.${f.status}`)}</span> : null}</p>
              {f.body && <p className="line-clamp-3"><bdi>{f.body}</bdi></p>}
              {f.disputeNote && <p className="rounded-lg bg-muted p-2 text-xs"><b>{tf("disputeLabel")}:</b> <bdi>{f.disputeNote}</bdi></p>}
            </div>
            <CollabFeedbackStatusButton id={f.id} status={f.status} />
          </li>
        ))}
      </ul>
    </section>
  );
  if (!rows.length && !collab.length) return <p className="py-10 text-center text-sm text-muted-foreground">{t("none")}</p>;
  return (
    <div className="space-y-6">
    {collabList}
    <ul className="divide-y rounded-xl border" data-testid="admin-reviews">
      {rows.map(({ review: r, handle, name }) => (
        <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-3 text-sm">
          <div className="min-w-0 flex-1 space-y-1">
            <p>
              <Link href={`/a/${handle}?tab=reviews`} className="font-semibold">{name}</Link> · {r.reviewerName}
              {r.reviewerBusiness ? ` (${r.reviewerBusiness})` : ""} · <span className="text-muted-foreground">{t(REVIEW_LABEL[r.source])}</span>
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
    </div>
  );
}
