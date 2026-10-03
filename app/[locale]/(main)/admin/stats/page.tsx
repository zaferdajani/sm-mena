import { getTranslations, setRequestLocale } from "next-intl/server";
import { BarList, ColumnChart } from "@/components/admin/charts";
import { FilterChips } from "@/components/admin/filter-chips";
import { StatTiles } from "@/components/admin/stat-tiles";
import { requireStaff } from "@/lib/auth/guards";
import { marketplaceStats, RANGES, trafficStats } from "@/lib/data/stats";
import { collabMetrics } from "@/lib/data/collab-metrics";
import { ownerNeedsStats } from "@/lib/data/owner-needs";
import { SERVICE_GROUPS } from "@/lib/core/catalog/services/catalog";
import { countryName, countryOfZone } from "@/lib/i18n/country";

export default async function AdminStats({ params, searchParams }: PageProps<"/[locale]/admin/stats">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("stats.view");
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r) === sp.days) ?? 30;
  const t = await getTranslations("AdminStats");
  const [traffic, market, collab, owners] = await Promise.all([trafficStats(days), marketplaceStats(days), collabMetrics(days), ownerNeedsStats()]);
  const groupName = (key: string) => { const g = SERVICE_GROUPS.find((x) => x.key === key); return g ? (locale === "ar" ? g.name_ar : g.name_en) : key; };
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en");
  const fmt = (n: number) => nf.format(n);
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en", { day: "numeric", month: "short" });
  const label = (day: string) => dateFmt.format(new Date(`${day}T12:00:00Z`));

  // Weekly columns for the year view, daily otherwise.
  const weekly = days > 90;
  const columns = weekly
    ? Array.from({ length: Math.ceil(traffic.series.length / 7) }, (_, w) => {
        const chunk = traffic.series.slice(w * 7, w * 7 + 7);
        return { label: label(chunk[0].day), tip: t("weekOf", { date: label(chunk[0].day) }), value: chunk.reduce((s, d) => s + d.views, 0) };
      })
    : traffic.series.map((d) => ({ label: label(d.day), tip: label(d.day), value: d.views }));

  const { totals } = traffic;
  // Countries from device time zones (no IP addresses are used).
  const countries = new Map<string, number>();
  for (const z of traffic.zones) {
    const code = countryOfZone(z.key);
    const label = code ? countryName(code, locale) : t("unknownCountry");
    countries.set(label, (countries.get(label) ?? 0) + z.n);
  }
  return (
    <div className="space-y-6" data-testid="admin-stats-page">
      <FilterChips param="days" current={String(days)} options={RANGES.map((r) => ({ value: String(r), label: t("range", { days: r }) }))} />
      <p className="text-xs text-muted-foreground" data-testid="real-data-note">{t("realOnly")}</p>
      <StatTiles
        locale={locale}
        tiles={[
          { label: t("tiles.visitors"), value: totals.visitors },
          { label: t("tiles.sessions"), value: totals.sessions },
          { label: t("tiles.views"), value: totals.views },
          { label: t("tiles.perSession"), value: totals.sessions ? (totals.views / totals.sessions).toFixed(1) : "0" },
          { label: t("tiles.aiChats"), value: market.activity.aiChats },
        ]}
      />
      <section className="rounded-xl border p-4">
        <ColumnChart title={weekly ? t("viewsPerWeek") : t("viewsPerDay")} data={columns} fmt={fmt} tableLabels={[t("showTable"), t("viewsPerDay")]} />
      </section>
      <section className="rounded-xl border p-4" data-testid="owner-needs-stats">
        <h2 className="text-sm font-semibold">{t("owners.title")}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("owners.note")}</p>
        <StatTiles locale={locale} tiles={[{ label: t("owners.total"), value: owners.total }]} />
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          <BarList title={t("owners.byCountry")} fmt={fmt} rows={owners.byCountry.map((r) => ({ label: countryName(r.key, locale), value: r.n }))} empty={t("noData")} />
          <BarList title={t("owners.byService")} fmt={fmt} rows={owners.byService.map((r) => ({ label: groupName(r.key), value: r.n }))} empty={t("noData")} />
          <BarList title={t("owners.byTiming")} fmt={fmt} rows={owners.byTiming.map((r) => ({ label: t(`owners.timings.${r.key}` as "owners.timings.now"), value: r.n }))} empty={t("noData")} />
        </div>
      </section>
      <section className="rounded-xl border p-4" data-testid="collab-metrics">
        <BarList title={t("collab.title")} funnel fmt={fmt} rows={collab.funnel.map((f) => ({ label: t(`collab.steps.${f.key}`), value: f.n }))} />
        <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-lg border p-2"><dt>{t("collab.repeat")}</dt><dd className="text-sm font-semibold text-foreground" data-testid="collab-repeat">{collab.repeat.rate === null ? t("collab.noCohort") : `${collab.repeat.rate}%`}</dd><dd>{t("collab.repeatDenominator", { cohort: collab.repeat.cohort, repeated: collab.repeat.repeated, days: collab.repeat.windowDays })}</dd></div>
          <div className="rounded-lg border p-2"><dt>{t("collab.protectedDelay")}</dt><dd className="text-sm font-semibold text-foreground">{collab.payment.protected.medianDays === null ? "—" : t("collab.days", { n: collab.payment.protected.medianDays })}</dd><dd>{t("collab.n", { n: collab.payment.protected.n })}</dd></div>
          <div className="rounded-lg border p-2"><dt>{t("collab.directConfirmed")}</dt><dd className="text-sm font-semibold text-foreground">{collab.payment.direct.n}</dd><dd>{t("collab.directNote")}</dd></div>
        </dl>
        <p className="mt-2 text-[11px] text-muted-foreground">{t("collab.note", { demo: collab.excluded.demo, staff: collab.excluded.staff, days })}</p>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border p-4">
          <BarList title={t("funnel")} funnel fmt={fmt} rows={market.funnel.map((f) => ({ label: t(`funnelSteps.${f.key}`), value: f.n }))} />
          <p className="mt-2 text-[11px] text-muted-foreground">{t("funnelNote")}</p>
        </section>
        <section className="rounded-xl border p-4">
          <BarList
            title={t("activity")}
            fmt={fmt}
            rows={Object.entries(market.activity)
              .filter(([k]) => k !== "aiChats")
              .map(([k, v]) => ({ label: t(`activityKeys.${k}`), value: v }))}
          />
        </section>
        <section className="rounded-xl border p-4">
          <BarList title={t("sources")} fmt={fmt} empty={t("noData")} rows={traffic.sources.map((s) => ({ label: s.key === "(direct)" ? t("direct") : s.key, value: s.n }))} />
        </section>
        <section className="rounded-xl border p-4">
          <BarList title={t("landings")} fmt={fmt} empty={t("noData")} rows={traffic.landings.map((l) => ({ label: l.path, sub: l.source === "(direct)" ? t("direct") : l.source, value: l.n }))} />
        </section>
        <section className="rounded-xl border p-4">
          <BarList title={t("pages")} fmt={fmt} empty={t("noData")} rows={traffic.pages.map((p) => ({ label: p.key, sub: t("visitorsCount", { count: p.visitors }), value: p.n }))} />
        </section>
        <section className="space-y-5 rounded-xl border p-4">
          <BarList title={t("devices")} fmt={fmt} empty={t("noData")} rows={traffic.devices.map((d) => ({ label: t(`deviceNames.${d.key}` as "deviceNames.mobile"), value: d.n }))} />
          <BarList title={t("languages")} fmt={fmt} empty={t("noData")} rows={traffic.languages.map((d) => ({ label: d.key === "ar" ? "العربية" : d.key === "en" ? "English" : d.key, value: d.n }))} />
          <BarList title={t("countries")} fmt={fmt} empty={t("noData")} rows={[...countries].sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, value: n }))} />
          <BarList title={t("aiByProvider")} fmt={fmt} empty={t("noData")} rows={market.aiByProvider.map((d) => ({ label: d.key, value: d.n }))} />
        </section>
      </div>
    </div>
  );
}
