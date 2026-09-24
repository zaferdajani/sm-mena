"use client";

import { MessageCircle, Sparkles } from "lucide-react";
import { currencyOf } from "@/lib/countries";
import { useLocale, useTranslations } from "next-intl";
import { AgencyAvatar } from "@/components/agency-avatar";
import { ContactLink } from "@/components/post/contact-link";
import { RatingBadge } from "@/components/reviews/stars";
import { buttonVariants } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { formatJod } from "@/lib/format";
import type { Match } from "@/lib/matching";
import { serviceLabel } from "@/lib/labels";
import type { Reason } from "@/lib/matching/score";
import { whatsappLink } from "@/lib/text";
import { cn } from "@/lib/utils";

function reasonText(t: ReturnType<typeof useTranslations>, r: Reason) {
  switch (r.code) {
    case "services": return t("reasons.services", { matched: r.matched, total: r.total });
    case "portfolio": return t("reasons.portfolio", { posts: r.posts });
    case "budget_fit": return t("reasons.budget_fit", { price: r.priceJod });
    case "over_budget": return t("reasons.over_budget", { price: r.priceJod });
    case "rating": return t("reasons.rating", { average: r.average, count: r.count });
    case "google": return t("reasons.google", { average: r.average, count: r.count });
    default: return t(`reasons.${r.code}`);
  }
}

export function RecommendationCard({ agency, rank }: { agency: Match; rank: number }) {
  const t = useTranslations("Match");
  const tc = useTranslations("Common");
  const tp = useTranslations("Post");
  const tCity = useTranslations("Cities");
  const locale = useLocale();
  const reasons = agency.reasons.filter((r) => r.code !== "featured" && r.code !== "verified");
  return (
    <article className={cn("rounded-xl border bg-card p-3", agency.featured && "border-amber-300")} data-testid="recommendation-card">
      <div className="flex items-start gap-3">
        <span className="mt-1 w-4 text-center text-xs font-bold text-muted-foreground">{rank}</span>
        <AgencyAvatar name={agency.name} src={agency.avatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1 font-semibold">
            <span className="truncate">{agency.name}</span>
            {agency.isVerified && <VerifiedBadge label={tc("verified")} />}
            {agency.featured && (
              <span title={t("featuredHint")} className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                <Sparkles className="size-3" />
                {t("featured")}
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            <span dir="ltr">@{agency.handle}</span> · {tCity(agency.city)} · {t("matchScore", { score: agency.score })}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3">
            {agency.ratingAverage !== null && <RatingBadge average={agency.ratingAverage} count={agency.ratingCount} />}
            {agency.googleRating !== null && <RatingBadge average={agency.googleRating} count={agency.googleRatingCount ?? 0} label="Google" />}
          </div>
          <p className="mt-1 text-sm">
            {agency.cheapestPackage
              ? <><bdi>{agency.cheapestPackage.title}</bdi>: {formatJod(agency.cheapestPackage.priceJod, locale, currencyOf(agency.country))}</>
              : agency.startingPriceJod
                ? tc("from", { price: formatJod(agency.startingPriceJod, locale, currencyOf(agency.country)) })
                : agency.services.slice(0, 2).map((s) => serviceLabel(s, locale)).join(" · ")}
          </p>
          {reasons.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1" aria-label={t("why")}>
              {reasons.map((r, i) => (
                <li key={i} className={cn("rounded-full px-2 py-0.5 text-[11px]", r.code === "over_budget" ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground")}>
                  {reasonText(t, r)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/a/${agency.handle}`} className={buttonVariants({ variant: "outline", className: "h-8 flex-1" })}>
          {t("viewProfile")}
        </Link>
        {agency.whatsapp && (
          <ContactLink
            agencyId={agency.id}
            channel="whatsapp"
            href={whatsappLink(agency.whatsapp, tp("whatsappMessage"))}
            className={cn(buttonVariants(), "h-8 flex-1 gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]")}
          >
            <MessageCircle className="size-3.5" />
            {tp("whatsapp")}
          </ContactLink>
        )}
      </div>
    </article>
  );
}
