import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs, EmptyState } from "@/components/collab/collab-tabs";
import { ORDER_STYLE } from "@/components/collab/status";
import { Link } from "@/i18n/navigation";
import { worksheetFor } from "@/lib/data/collab-worksheet";
import { workBadgeCount } from "@/lib/data/work-orders";
import { formatFils, formatIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { intelligencePage } from "../gate";

/** The buyer's private cost worksheet (docs/50): supplier costs beside the client contract; estimates, not quotations. */
export default async function WorksheetPage({ params }: PageProps<"/[locale]/studio/collab/worksheet">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency, soonFeature } = await intelligencePage();
  if (soonFeature) return <ComingSoon feature={soonFeature} />;
  const [t, to, tc, groups, badge] = await Promise.all([getTranslations("Worksheet"), getTranslations("Orders"), getTranslations("Contracts"), worksheetFor(agency), workBadgeCount(agency.id)]);
  const money = (fils: number, currency: string) => formatFils(fils, locale, currency);
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="collab-worksheet">
      <CollabTabs active="plan" badges={{ work: badge }} />
      <CollabHeader title={t("title")} intro={t("intro")} />
      <p className="rounded-xl border border-brand-line bg-brand-soft p-3 text-sm" data-testid="worksheet-note"><b>{t("noteLead")}</b> {t("note")}</p>
      {groups.length === 0 ? <EmptyState title={t("noneTitle")} body={t("noneBody")} /> : groups.map((g, i) => (
        <section key={g.parent?.id ?? "none"} className="grid gap-2 rounded-2xl border p-4" data-testid="worksheet-group" data-parent={g.parent ? "yes" : "no"}>
          <h2 className="font-semibold">{g.parent ? <bdi>{g.parent.number} · {g.parent.title}</bdi> : t("noParent")}</h2>
          {g.parent && <p className="text-xs text-muted-foreground">{t("clientPrice")}: <bdi>{money(g.parent.totalFils, g.parent.currency)}</bdi> · {t("contractStatus", { status: tc.has(`status.${g.parent.status}`) ? tc(`status.${g.parent.status}`) : g.parent.status })}</p>}
          <ul className="grid gap-1 text-sm">
            {g.lines.map((l) => (
              <li key={l.id} className="grid gap-1 rounded-lg bg-muted/40 p-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2" data-testid="worksheet-line" data-amount={l.amountFils ?? "unknown"}>
                <Link href={l.href} className="min-w-0 truncate font-medium sm:flex-1" dir="auto">{l.title}</Link>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground"><bdi>{l.supplier}</bdi></span>
                  {l.dueOn && <span className="text-xs text-muted-foreground"><bdi dir="ltr">{formatIsoDate(l.dueOn, locale)}</bdi></span>}
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", ORDER_STYLE[l.status] ?? "bg-muted")}>{l.kind === "order" ? to(`status.${l.status}`) : t("acceptedQuote")}</span>
                  <span className="ms-auto font-semibold tabular-nums">{l.amountFils !== null && l.currency ? <bdi>{money(l.amountFils, l.currency)}</bdi> : <span className="text-muted-foreground">{t("unknown")}</span>}</span>
                </div>
              </li>
            ))}
          </ul>
          <dl className="grid gap-1 text-sm sm:grid-cols-2" data-testid={`worksheet-totals-${i}`}>
            {g.costs.map((c) => <div key={c.currency} className="flex justify-between gap-2 rounded-lg border p-2"><dt>{t("costs", { currency: c.currency })}</dt><dd className="font-semibold tabular-nums"><bdi>{money(c.fils, c.currency)}</bdi></dd></div>)}
            {g.unknown > 0 && <div className="flex justify-between gap-2 rounded-lg border border-dashed p-2"><dt>{t("unknownLines")}</dt><dd className="font-semibold">{g.unknown}</dd></div>}
            {g.margin === "mixed_currency" && <div className="rounded-lg border border-dashed p-2 text-xs text-muted-foreground sm:col-span-2" data-testid="worksheet-mixed">{t("mixedCurrency")}</div>}
            {g.margin && g.margin !== "mixed_currency" && <div className="flex justify-between gap-2 rounded-lg border-2 border-brand/40 bg-brand/5 p-2 sm:col-span-2" data-testid="worksheet-margin"><dt>{t("margin")}{g.unknown ? ` · ${t("marginPartial")}` : ""}</dt><dd className="font-semibold tabular-nums"><bdi>{money(g.margin.fils, g.parent!.currency)} ({g.margin.percent}%)</bdi></dd></div>}
          </dl>
        </section>
      ))}
    </div>
  );
}
