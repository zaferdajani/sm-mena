import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyRow } from "@/components/agency-row";
import { ExploreFilters, type FilterOptions } from "@/components/explore/explore-filters";
import { FeedList } from "@/components/feed/feed-list";
import { Link } from "@/i18n/navigation";
import { listAgencies } from "@/lib/data/agencies";
import { hasActiveFilters, parseExploreParams } from "@/lib/explore-params";
import { feedPage } from "@/lib/feed";
import { CITIES, INDUSTRIES, PLATFORMS, serviceLabel, serviceOptions } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { getVisitorId } from "@/lib/visitor";

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/explore">): Promise<Metadata> {
  const { locale } = await params;
  const p = parseExploreParams(await searchParams);
  const t = await getTranslations({ locale, namespace: "Explore" });
  const tCity = await getTranslations({ locale, namespace: "Cities" });
  const parts = [p.service && serviceLabel(p.service, locale), p.city && tCity(p.city)].filter(Boolean);
  // One indexable explore page: filtered views are for people, and a service's
  // landing page for search is /hire/{service}.
  return pageMeta({
    locale,
    path: "/explore",
    title: parts.length ? parts.join(" · ") : t("title"),
    description: t("metaDescription"),
    noindex: hasActiveFilters(p),
  });
}

export default async function ExplorePage({ params, searchParams }: PageProps<"/[locale]/explore">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const p = parseExploreParams(sp);
  const { tab, ...filters } = p;
  const t = await getTranslations("Explore");
  const tc = await getTranslations("Common");
  const th = await getTranslations("Hire");
  const [tCity, tPlat, tInd] = await Promise.all([getTranslations("Cities"), getTranslations("Platforms"), getTranslations("Industries")]);
  const visitorId = await getVisitorId();

  const options: FilterOptions = {
    services: serviceOptions(locale),
    cities: CITIES.map((key) => ({ key, label: tCity(key) })),
    platforms: PLATFORMS.map((key) => ({ key, label: tPlat(key) })),
    industries: INDUSTRIES.map((key) => ({ key, label: tInd(key) })),
  };

  const posts = tab === "posts" ? await feedPage(filters, null, visitorId, { placement: "explore", limit: 24 }) : null;
  const agencies = tab === "agencies" ? await listAgencies({ ...filters, limit: 60 }) : null;
  const count = posts ? posts.items.filter((i) => !i.sponsored).length : (agencies?.length ?? 0);
  const resultLabel = t("results", { count }) + (posts?.nextCursor ? "+" : "");
  const query = Object.fromEntries(Object.entries(sp).filter(([k, v]) => k !== "tab" && typeof v === "string")) as Record<string, string>;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="space-y-3 px-3 pt-3 sm:px-4 sm:pt-6">
        <h1 className="sr-only">{t("title")}</h1>
        <ExploreFilters options={options} resultLabel={resultLabel} />
        {filters.service && (
          <Link
            href={`/hire/${filters.service}${filters.city ? `/${filters.city}` : ""}`}
            className="flex items-center justify-between rounded-xl border bg-accent/60 px-4 py-2.5 text-sm font-medium"
            data-testid="hire-link"
          >
            {th("title", { service: serviceLabel(filters.service, locale), place: filters.city ? tCity(filters.city) : th("jordan") })}
            <span aria-hidden className="rtl:rotate-180">→</span>
          </Link>
        )}
        <div className="flex border-b text-sm font-semibold" role="tablist">
          {(["posts", "agencies"] as const).map((key) => (
            <Link
              key={key}
              href={{ pathname: "/explore", query: { ...query, tab: key } }}
              role="tab"
              aria-selected={tab === key}
              className={cn("flex-1 border-b-2 border-transparent py-2.5 text-center text-muted-foreground", tab === key && "border-foreground text-foreground")}
            >
              {t(key)}
            </Link>
          ))}
        </div>
      </div>
      <div className="pt-1 sm:px-4">
        {posts &&
          (posts.items.length ? (
            <FeedList key={JSON.stringify(filters)} initial={posts} filters={filters} placement="explore" layout="grid" />
          ) : (
            <Empty text={tc("noResults")} clear={hasActiveFilters(p) ? tc("clearFilters") : null} />
          ))}
        {agencies &&
          (agencies.length ? (
            <div className="grid grid-cols-1 gap-1 px-2 sm:grid-cols-2">
              {agencies.map((a) => (
                <AgencyRow key={a.id} agency={a} />
              ))}
            </div>
          ) : (
            <Empty text={tc("noResults")} clear={hasActiveFilters(p) ? tc("clearFilters") : null} />
          ))}
      </div>
    </div>
  );
}

function Empty({ text, clear }: { text: string; clear: string | null }) {
  return (
    <div className="px-4 py-16 text-center text-muted-foreground">
      <p>{text}</p>
      {clear && (
        <Link href="/explore" className="mt-3 inline-block text-sm font-medium text-brand">
          {clear}
        </Link>
      )}
    </div>
  );
}
