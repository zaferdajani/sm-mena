import { getTranslations, setRequestLocale } from "next-intl/server";
import { replyReviewAction } from "@/app/[locale]/(main)/studio/actions";
import { ReviewSummary } from "@/components/reviews/review-list";
import { Stars } from "@/components/reviews/stars";
import { ReviewInvite } from "@/components/studio/review-invite";
import { SubmitButton } from "@/components/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { requireAgency } from "@/lib/auth/guards";
import { listReviewInvites, listReviews, ratingSummary, subScores } from "@/lib/data/reviews";
import { timeAgo } from "@/lib/format";

export default async function StudioReviewsPage({ params }: PageProps<"/[locale]/studio/reviews">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Reviews");
  const [rows, invites, sub] = await Promise.all([listReviews(agency.id, { includeHidden: true }), listReviewInvites(agency.id), subScores(agency.id)]);
  const rating = ratingSummary(agency);
  const now = new Date();
  return (
    <div className="space-y-6">
      <ReviewInvite agencyName={agency.name} />
      <ReviewSummary average={rating.average} count={rating.count} sub={sub} />
      <section>
        <h2 className="mb-2 font-semibold">{t("title")}</h2>
        {!rows.length && <p className="text-sm text-muted-foreground">{t("none")}</p>}
        <ul className="space-y-3" data-testid="studio-reviews">
          {rows.map((r) => (
            <li key={r.id} className="space-y-2 rounded-xl border p-4">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{r.reviewerName}{r.reviewerBusiness ? ` · ${r.reviewerBusiness}` : ""}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt.toISOString(), locale)}</span>
              </div>
              <Stars value={r.rating} size="size-3.5" />
              {r.status === "hidden" && <p className="text-xs text-destructive">{t("admin.hidden")}</p>}
              <p className="whitespace-pre-line text-sm" dir="auto">{r.body}</p>
              <form action={replyReviewAction} className="grid gap-2">
                <input type="hidden" name="reviewId" value={r.id} />
                <Textarea name="reply" rows={2} maxLength={1000} defaultValue={r.reply ?? ""} placeholder={t("studio.replyPlaceholder")} />
                <SubmitButton variant="outline" className="h-8 w-fit">{t("studio.saveReply")}</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      </section>
      {invites.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">{t("studio.invites")}</h2>
          <ul className="divide-y rounded-xl border text-sm">
            {invites.map((i) => (
              <li key={i.id} className="flex justify-between px-3 py-2">
                <span>{i.clientName || "—"}</span>
                <span className="text-xs text-muted-foreground">
                  {i.usedAt ? t("studio.used") : i.expiresAt < now ? t("studio.expired") : t("studio.pending")} · {timeAgo(i.createdAt.toISOString(), locale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
