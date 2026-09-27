import { EmptySupply } from "@/components/demo/empty-supply";
import type { Metadata } from "next";
import { demoMode } from "@/lib/demo-mode";
import { pageMeta } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyRow } from "@/components/agency-row";
import { ExploreFilters, type FilterOptions } from "@/components/explore/explore-filters";
import { FeedList } from "@/components/feed/feed-list";
import { Link } from "@/i18n/navigation";
import { listAgencies } from "@/lib/data/agencies";
import { hasActiveFilters, parseExploreParams } from "@/lib/explore-params";
import { feedPage } from "@/lib/feed";
import { INDUSTRIES, PLATFORMS, serviceLabel, serviceOptions } from "@/lib/labels";
import { citiesOf, COUNTRIES, countryName, countryOfCity, currencyOf } from "@/lib/countries";
import { currentCountry } from "@/lib/country-choice";
import { cn } from "@/lib/utils";
import { getVisitorId, interactionKey } from "@/lib/visitor";
import { ClosestMatches } from "@/components/closest/closest-matches";
import { canUse } from "@/lib/feature-gate";
import { closestAgencies } from "@/lib/matching/closest";
import { hasRequirements } from "@/lib/matching/closeness";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/explore">): Promise<Metadata> {
  const { locale } = await params;
  const p = parseExploreParams(await searchParams);
  const t = await getTranslations({ locale, namespace: "Explore" });
  const tCity = await getTranslations({ locale, namespace: "Cities" });
  const parts = [p.service && serviceLabel(p.service, locale), p.city && tCity(p.city)].filter(Boolean);
  return pageMeta({ locale, path: "/explore", title: parts.length ? parts.join(" · ") : t("title"), description: t("metaDescription"), noindex: hasActiveFilters(p) });
}

export default async function ExplorePage({ params, searchParams }: PageProps<"/[locale]/explore">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const p = parseExploreParams(sp);
  const country = countryOfCity(p.city) ?? (await currentCountry());
  const { tab, ...rest } = p;
  const filters = { ...rest, country, includeDemo: await demoMode() };
  const { includeDemo: _demo, ...clientFilters } = filters;
  void _demo;
  const currency = currencyOf(country);
  const t = await getTranslations("Explore");
  const tc = await getTranslations("Common");
  const td = await getTranslations("Demo");
  const th = await getTranslations("Hire");
  const [tCity, tPlat, tInd] = await Promise.all([getTranslations("Cities"), getTranslations("Platforms"), getTranslations("Industries")]);
  const visitorId = await getVisitorId();
  const options: FilterOptions = {
    services: serviceOptions(locale),
    cities: citiesOf(country).map((c) => ({ key: c.key, label: tCity(c.key) })),
    platforms: PLATFORMS.map((key) => ({ key, label: tPlat(key) })),
    industries: INDUSTRIES.map((key) => ({ key, label: tInd(key) })),
  };
  const posts = tab === "posts" ? await feedPage(filters, null, visitorId, { placement: "explore", limit: 24, stateKey: await interactionKey() }) : null;
  const agencies = tab === "agencies" ? await listAgencies({ ...filters, limit: 60 }) : null;
  const count = posts ? posts.items.filter((i) => !i.sponsored).length : (agencies?.length ?? 0);
  const requirements = { services: filters.service ? [filters.service] : [], city: filters.city, country, platforms: filters.platforms, budgetMin: filters.minPrice, budgetMax: filters.maxPrice, industry: filters.industry, fullService: filters.fullService, verified: filters.verified };
  const closest = count === 0 && hasRequirements(requirements) ? await closestAgencies(requirements, { includeDemo: filters.includeDemo }) : null;
  const closestBlock = closest ? (
    <>
      <ClosestMatches matches={closest} currency={currency} viewCountry={country}
        sendHref={(await canUse("quote_requests")) ? { pathname: "/request/new", query: { ...(filters.service ? { service: filters.service } : {}), ...(filters.city ? { city: filters.city } : {}) } } : null} />
      <Empty text="" clear={tc("clearFilters")} />
    </>
  ) : <Empty text={tc("noResults")} clear={tc("clearFilters")} />;
  const resultLabel = t("results", { count }) + (posts?.nextCursor ? "+" : "");
  const query = Object.fromEntries(Object.entries(sp).filter(([k, v]) => k !== "tab" && typeof v === "string")) as Record<string, string>;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-3 py-5 sm:px-6 sm:py-7" data-testid="explore-page">
      <header className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-heading text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground" data-testid="explore-result-count">{resultLabel}</p>
        </div>
        <ExploreFilters options={options} resultLabel={resultLabel} currency={locale === "ar" ? (COUNTRIES.find((c) => c.currency === currency)?.currencyAr ?? currency) : currency} />
        {filters.service && (
          <Link href={`/hire/${filters.service}/${filters.city ?? country}`} className="flex items-center justify-between rounded-xl border bg-accent/60 px-4 py-2.5 text-sm font-medium" data-testid="hire-link">
            {th("title", { service: serviceLabel(filters.service, locale), place: filters.city ? tCity(filters.city) : countryName(country, locale) })}
            <span aria-hidden className="rtl:rotate-180">→</span>
          </Link>
        )}
        <div className="flex gap-1 rounded-xl bg-muted/70 p-1 text-sm font-semibold" role="tablist">
          {(["posts", "agencies"] as const).map((key) => (
            <Link key={key} href={{ pathname: "/explore", query: { ...query, tab: key } }} role="tab" aria-selected={tab === key}
              className={cn("flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 py-2.5 text-center text-muted-foreground", tab === key && "bg-background text-foreground shadow-sm")}>
              {t(key)}
            </Link>
          ))}
        </div>
      </header>
      <div data-testid="explore-results">
        {posts && (posts.items.length ? (
          <FeedList key={JSON.stringify(filters)} initial={posts} filters={clientFilters} placement="explore" layout="grid" />
        ) : hasActiveFilters(p) ? closestBlock : <EmptySupply text={td("emptyWork")} />)}
        {agencies && (agencies.length ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" data-testid="explore-agency-grid">
            {agencies.map((a) => (
              <div key={a.id} className="min-w-0 rounded-2xl border bg-card p-2 shadow-sm" data-testid="explore-agency-card">
                <AgencyRow agency={a} viewCountry={country} />
              </div>
            ))}
          </div>
        ) : hasActiveFilters(p) ? closestBlock : <EmptySupply />)}
      </div>
    </div>
  );
}

function Empty({ text, clear }: { text: string; clear: string | null }) {
  return (
    <div className={text ? "rounded-2xl border bg-card px-4 py-16 text-center text-muted-foreground" : "px-4 pb-8 text-center text-muted-foreground"}>
      {text && <p>{text}</p>}
      {clear && <Link href="/explore" className="mt-3 inline-block text-sm font-medium text-brand">{clear}</Link>}
    </div>
  );
}
