import { CalendarClock, MapPin, Sparkles, Wallet } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { currencyOf } from "@/lib/countries";
import { listOpportunities } from "@/lib/data/requests";
import { formatJod, timeAgo } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** The feed of clients looking for an agency: newest first, invited ones marked. */
export default async function OpportunitiesPage({ params }: PageProps<"/[locale]/studio/opportunities">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Opportunities");
  const tr = await getTranslations("Requests");
  const tCity = await getTranslations("Cities");
  const tCountry = await getTranslations("Countries");
  const rows = (await listOpportunities(agency)).sort((a, b) => b.request.createdAt.getTime() - a.request.createdAt.getTime());
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      {!rows.length && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          <p>{t("empty")}</p>
          <p className="mt-1 text-xs">{t("feedEmptyHint")}</p>
        </div>
      )}
      <ul className="space-y-3" data-testid="opportunities">
        {rows.map((o) => {
          const r = o.request;
          const currency = currencyOf(r.country);
          const budget = r.budgetMaxJod
            ? `${formatJod(r.budgetMinJod ?? 0, locale, currency)} – ${formatJod(r.budgetMaxJod, locale, currency)}`
            : t("any");
          return (
            <li key={r.id}>
              <Link
                href={`/studio/opportunities/${r.id}`}
                className={cn("block space-y-2.5 rounded-2xl border p-4 transition-colors hover:bg-muted/60", o.isNew && "border-primary/50 bg-primary/5")}
                data-testid="opportunity"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {o.invited && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground">
                      <Sparkles className="size-3" /> {t("invited")}
                    </span>
                  )}
                  {o.isNew && <span className="rounded-full bg-destructive px-2 py-0.5 font-bold text-white">{t("new")}</span>}
                  {r.fullService && <span className="rounded-full bg-brand/10 px-2 py-0.5 font-medium text-brand">{tr("fullService")}</span>}
                  <span className="ms-auto text-muted-foreground">{timeAgo(r.createdAt.toISOString(), locale)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {r.services.map((s) => (
                    <span key={s} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                      {serviceLabel(s, locale)}
                    </span>
                  ))}
                </div>
                <p className="line-clamp-3 text-sm" dir="auto">
                  {r.description}
                </p>
                <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground sm:grid-cols-3">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="size-3.5 shrink-0" />
                    <span className="sr-only">{t("budget")}</span>
                    <span className="font-medium text-foreground">{budget}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0" />
                    <span>{r.city ? `${tCity(r.city)}, ${tCountry(r.country)}` : `${t("anyCity")}, ${tCountry(r.country)}`}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 shrink-0" />
                    <span>{r.timeline ? tr(`timelines.${r.timeline}` as "timelines.asap") : t("any")}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t pt-2.5">
                  <span className="text-xs text-muted-foreground">{t("proposals", { count: o.proposalCount })}</span>
                  {o.myProposal ? (
                    <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">{t("sent")}</span>
                  ) : (
                    <span className={buttonVariants({ size: "sm" })}>{t("quoteNow")}</span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
