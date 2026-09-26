import { BadgeCheck, Globe2, Sparkles, Timer } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProviderBars, ProviderMap } from "@/components/teaser/provider-map";
import { ShareButton } from "@/components/teaser/share-button";
import { Link } from "@/i18n/navigation";
import { COUNTRIES, countryOf, countryOfCity } from "@/lib/countries";
import { teaserStats } from "@/lib/data/teaser";
import { pageMeta } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { TEASER_MIN_PROOF } from "@/lib/teaser";

export const dynamic = "force-dynamic";

const WHO = ["agencies", "freelancers", "creators", "influencers", "ugc", "photographers", "videographers", "designers", "writers", "ads", "voice", "web"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/soon">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Teaser" });
  return pageMeta({ locale, path: "/soon", title: t("metaTitle"), absoluteTitle: true, description: t("metaDescription") });
}

/**
 * The pre-launch teaser for providers (docs/39-teaser.md): who it is for, why
 * register now, and live counts of real registered providers per country and
 * city. It does not explain the business model. Every call to action opens /join.
 */
export default async function TeaserPage({ params }: PageProps<"/[locale]/soon">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc, stats] = await Promise.all([getTranslations("Teaser"), getTranslations("Header"), teaserStats()]);
  const name = (x: { ar: string; en: string }) => (locale === "ar" ? x.ar : x.en);
  const cityLabel = (key: string) => name(countryOf(countryOfCity(key)).cities.find((c) => c.key === key)!);
  const url = `${SITE_URL}/${locale}/soon`;
  const cta = (
    <Link href="/join" className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3.5 text-base font-bold text-primary-foreground shadow-lg transition hover:opacity-90" data-testid="teaser-cta">
      {t("cta")}
    </Link>
  );
  const why = [
    { key: "free", icon: BadgeCheck },
    { key: "first", icon: Timer },
    { key: "reach", icon: Globe2 },
    { key: "arabic", icon: Sparkles },
  ] as const;

  return (
    <main className="min-h-dvh bg-background text-foreground" data-testid="teaser-page">
      <section className="bg-brand-deep px-4 pt-6 dark:bg-brand-soft pb-14 text-white">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="inline-flex items-center gap-2 font-heading text-xl font-bold" translate="no">
            <Image src="/brand/mark-192.png" alt="" width={32} height={32} className="rounded-lg" priority />
            {tc("brand")}
          </Link>
          <p className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
            <span className="size-2 animate-pulse rounded-full bg-emerald-300" aria-hidden />
            {t("badge")}
          </p>
          <h1 className="mt-4 font-heading text-3xl leading-tight font-bold text-balance sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">{t("subtitle")}</p>
          <div className="mt-7 flex flex-col items-start gap-2">
            {cta}
            <p className="text-xs text-white/70">{t("ctaNote")}</p>
          </div>
          <p className="mt-6 text-sm font-semibold text-emerald-200" data-testid="teaser-proof">
            {stats.total >= TEASER_MIN_PROOF ? t("proofMany", { count: stats.total }) : t("proofFew")}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-14 px-4 py-12">
        <dl className="-mt-20 grid grid-cols-3 gap-2 rounded-2xl border bg-card p-4 text-center shadow-card">
          {[
            [String(COUNTRIES.length), t("marketCountries")],
            [t("marketPeopleValue"), t("marketPeople")],
            [t("marketFreeValue"), t("marketFree")],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="font-heading text-2xl font-bold text-brand tabular-nums sm:text-3xl">{value}</dd>
              <dd className="text-xs text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h2 className="font-heading text-2xl font-bold">{t("whoTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("whoIntro")}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {WHO.map((k) => (
              <li key={k} className="rounded-full bg-brand-soft px-3 py-1.5 text-sm font-medium text-brand">
                {t(`who.${k}`)}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold">{t("whyTitle")}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {why.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-3 rounded-2xl border p-4">
                <Icon className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden />
                <div>
                  <h3 className="font-semibold">{t(`why.${key}Title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`why.${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-2xl font-bold">{t("mapTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("mapIntro")}</p>
          <div className="mt-5 rounded-2xl border p-3 sm:p-5">
            <ProviderMap countries={stats.countries} locale={locale} />
          </div>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 font-semibold">{t("chartCountries")}</h3>
              <ProviderBars testId="teaser-countries" rows={stats.countries.map((c) => ({ key: c.code, label: name(countryOf(c.code)), flag: countryOf(c.code).flag, n: c.n }))} />
            </div>
            <div>
              <h3 className="mb-3 font-semibold">{t("chartCities")}</h3>
              {stats.cities.length ? (
                <ProviderBars testId="teaser-cities" rows={stats.cities.slice(0, 8).map((c) => ({ key: c.key, label: cityLabel(c.key), flag: countryOf(c.country).flag, n: c.n }))} />
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{t("citiesEmpty")}</p>
              )}
              {stats.total > 0 && <p className="mt-3 text-xs text-muted-foreground">{t("kinds", { agencies: stats.agencies, freelancers: stats.freelancers })}</p>}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-brand-deep px-5 dark:bg-brand-soft py-10 text-center text-white">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">{t("finalTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">{t("finalBody")}</p>
          <div className="mt-6 flex flex-col items-center gap-3">
            {cta}
            <ShareButton url={url} />
          </div>
        </section>

        <footer className="space-y-2 pb-6 text-center text-xs text-muted-foreground">
          <p>
            <Link href="/login" className="underline">
              {t("have")}
            </Link>
          </p>
          <p>{t("footnote")}</p>
        </footer>
      </div>
    </main>
  );
}
