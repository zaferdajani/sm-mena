import { RefreshCw } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs, EmptyState } from "@/components/collab/collab-tabs";
import { AvailabilityForm } from "@/components/collab/widgets";
import { SubmitButton } from "@/components/submit-button";
import { listWindows, windowSummary } from "@/lib/data/collab-availability";
import { workBadgeCount } from "@/lib/data/work-orders";
import { isFresh } from "@/lib/collab/availability";
import { dateIn } from "@/lib/collab/time";
import { countryOf } from "@/lib/countries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { reconfirmAction, removeWindowAction } from "../actions";
import { collabPage } from "../gate";

/** Studio → Collaborate → Availability: what this provider declares, and how fresh it is. */
export default async function CollabAvailabilityPage({ params }: PageProps<"/[locale]/studio/collab/availability">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency, soon } = await collabPage();
  if (soon) return <ComingSoon feature="collaboration" />;
  const t = await getTranslations("Collab.availability");
  const [rows, badge] = await Promise.all([listWindows(agency.id), workBadgeCount(agency.id)]);
  const summary = windowSummary(rows);
  const now = new Date();
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="collab-availability">
      <CollabTabs active="availability" badges={{ work: badge }} />
      <CollabHeader title={t("title")} intro={t("intro")} action={summary.count > 0 ? <form action={reconfirmAction}><SubmitButton variant="outline" className="h-11 gap-1.5" testId="availability-reconfirm"><RefreshCw className="size-4" /> {t("reconfirm")}</SubmitButton></form> : undefined} />
      <p className={cn("rounded-xl border p-3 text-sm", summary.stale ? "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200" : "border-brand-line bg-brand-soft")} data-testid="availability-summary" data-stale={summary.stale}>
        {summary.count === 0 ? t("summaryNone") : summary.stale ? t("summaryStale", { count: summary.stale }) : t("summaryFresh", { count: summary.count })}
      </p>
      <p className="text-xs text-muted-foreground">{t("noSync")}</p>
      <AvailabilityForm timezone={countryOf(agency.country).timeZones[0] ?? "Asia/Amman"} />
      {rows.length === 0 ? (
        <EmptyState title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <ul className="divide-y rounded-2xl border text-sm" data-testid="availability-list">
          {rows.map((w) => {
            const fresh = isFresh(w, now);
            return (
              <li key={w.id} className="flex flex-wrap items-center gap-2 p-3" data-testid="availability-window" data-status={w.status} data-fresh={fresh}>
                <span className="min-w-0 flex-1">
                  <span className="font-medium"><bdi dir="ltr">{dateIn(w.startsAt, w.timezone)} → {dateIn(new Date(w.endsAt.getTime() - 1), w.timezone)}</bdi> · {t(`statuses.${w.status}`)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {w.capacityUnits !== null ? `${w.capacityUnits} ${t(`units.${w.capacityUnit ?? "days"}`)} · ` : ""}{t(`visibilities.${w.visibility}`)} · {w.timezone} · {fresh ? t("confirmedOn", { date: formatDate(w.confirmedAt, locale) }) : t("needsConfirmation")}
                  </span>
                  {w.note && <span className="block text-xs" dir="auto">{w.note}</span>}
                </span>
                <form action={removeWindowAction}><input type="hidden" name="id" value={w.id} /><SubmitButton variant="ghost" className="h-9">{t("remove")}</SubmitButton></form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
