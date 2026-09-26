import { BadgeCheck, Crown, Globe2, Hash, KeyRound } from "lucide-react";
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
import { TEASER_MIN_PROOF, seatLabel } from "@/lib/teaser";

export const dynamic = "force-dynamic";

const WHO = ["agencies", "freelancers", "creators", "influencers", "ugc", "photographers", "videographers", "designers", "writers", "ads", "voice", "web"] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/soon">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Teaser" });
  return pageMeta({
    locale,
    path: "/soon",
    title: t("metaTitle"),
    absoluteTitle: true,
    description: t("metaDescription"),
    images: [{ url: "/teaser/citadel-16x9.webp", width: 1600, height: 900, alt: t("title") }],
  });
}

/**
 * "The List": the pre-launch teaser for providers (docs/39-teaser.md). Night
 * theme and gold, a numbered founding seat for every provider who registers,
 * and a live race of real registrations per country and city. It does not
 * explain the business model. Every call to action opens /join.
 */
export default async function TeaserPage({ params }: PageProps<"/[locale]/soon">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tc, stats] = await Promise.all([getTranslations("Teaser"), getTranslations("Header"), teaserStats()]);
  const name = (x: { ar: string; en: string }) => (locale === "ar" ? x.ar : x.en);
  const cityLabel = (key: string) => name(countryOf(countryOfCity(key)).cities.find((c) => c.key === key)!);
  const cta = (
    <Link
      href="/join"
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-8 py-4 text-base font-bold text-black shadow-[0_0_40px_-8px_var(--gold)] transition hover:brightness-110"
      data-testid="teaser-cta"
    >
      <KeyRound className="size-5" aria-hidden />
      {t("cta")}
    </Link>
  );
  const why = [
    { key: "free", icon: BadgeCheck },
    { key: "seat", icon: Hash },
    { key: "reach", icon: Globe2 },
    { key: "first", icon: Crown },
  ] as const;

  return (
    <main className="teaser-night min-h-dvh bg-background text-foreground" data-testid="teaser-page">
      <section className="relative isolate flex min-h-[92svh] flex-col overflow-hidden px-4 pt-5 pb-10">
        <Image src="/teaser/citadel-9x16.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-bottom sm:hidden" />
        <Image src="/teaser/citadel-16x9.webp" alt="" fill sizes="100vw" className="-z-10 hidden object-cover object-bottom sm:block" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/30 to-background" aria-hidden />
        <div className="mx-auto w-full max-w-3xl">
          <Link href="/" className="flex w-fit items-center gap-2 font-heading text-xl font-bold" translate="no">
            <Image src="/brand/mark-192.png" alt="" width={32} height={32} className="rounded-lg" />
            {tc("brand")}
          </Link>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-black/40 px-3 py-1 text-xs font-semibold text-[var(--gold-soft)] backdrop-blur">
            <span className="size-2 animate-pulse rounded-full bg-[var(--gold)]" aria-hidden />
            {t("badge")}
          </p>
          <h1 className="teaser-gold-text mt-4 font-heading text-5xl leading-[1.1] font-bold sm:text-7xl">{t("title")}</h1>
          <p className="mt-3 max-w-xl text-lg font-semibold text-white sm:text-2xl">{t("tagline")}</p>
          <p className="mt-3 max-w-xl text-sm text-white/75 sm:text-base">{t("subtitle")}</p>
        </div>

        <div className="mx-auto mt-auto w-full max-w-3xl pt-10">
          <div className="rounded-3xl border border-[var(--gold)]/30 bg-black/55 p-5 backdrop-blur-md" data-testid="teaser-seat">
            <p className="text-xs font-semibold tracking-wide text-[var(--gold-soft)]">{t("seatLabel")}</p>
            <p className="teaser-gold-text font-mono text-6xl font-bold tabular-nums sm:text-7xl" dir="ltr" data-testid="teaser-next-seat">
              {seatLabel(stats.nextSeat)}
            </p>
            <p className="mt-1 text-sm text-white/75">{t("seatNote")}</p>
            <div className="mt-5 flex flex-col items-start gap-2">
              {cta}
              <p className="text-xs text-white/60">{t("ctaNote")}</p>
            </div>
            <p className="mt-4 text-sm font-semibold text-[var(--gold-soft)]" data-testid="teaser-proof">
              {stats.total >= TEASER_MIN_PROOF ? t("proofMany", { count: stats.total }) : t("proofFew")}
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-16 px-4 py-12">
        <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--gold)]/20 bg-card p-4 text-center">
          {[
            [String(COUNTRIES.length), t("marketCountries")],
            [t("marketPeopleValue"), t("marketPeople")],
            [t("marketFreeValue"), t("marketFree")],
          ].map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="teaser-gold-text font-heading text-3xl font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="grid items-center gap-6 sm:grid-cols-2">
          <Image src="/teaser/door-1x1.webp" alt="" width={1080} height={1080} sizes="(min-width: 640px) 50vw, 100vw" className="rounded-3xl" />
          <div>
            <h2 className="font-heading text-3xl font-bold">{t("secretTitle")}</h2>
            <p className="mt-2 text-muted-foreground">{t("secretIntro")}</p>
            <ul className="mt-4 space-y-3">
              {(["one", "two", "three"] as const).map((k) => (
                <li key={k} className="flex gap-3 text-lg">
                  <span className="mt-2.5 size-2 shrink-0 rotate-45 bg-[var(--gold)]" aria-hidden />
                  {t(`secret.${k}`)}
                </li>
              ))}
            </ul>
            <p className="mt-5 font-semibold text-[var(--gold-soft)]">{t("secretMore")}</p>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-3xl font-bold">{t("whoTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("whoIntro")}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {WHO.map((k) => (
              <li key={k} className="rounded-full border border-[var(--gold)]/30 px-3 py-1.5 text-sm font-medium">
                {t(`who.${k}`)}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-3xl font-bold">{t("whyTitle")}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {why.map(({ key, icon: Icon }) => (
              <li key={key} className="flex gap-3 rounded-2xl border bg-card p-4">
                <Icon className="mt-0.5 size-6 shrink-0 text-[var(--gold)]" aria-hidden />
                <div>
                  <h3 className="font-semibold">{t(`why.${key}Title`)}</h3>
                  <p className="text-sm text-muted-foreground">{t(`why.${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-heading text-3xl font-bold">{t("mapTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("mapIntro")}</p>
          <div className="mt-5 rounded-2xl border bg-card p-3 sm:p-5">
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

        <section className="relative isolate overflow-hidden rounded-3xl px-5 py-12 text-center">
          <Image src="/teaser/invite-4x5.webp" alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-black/65" aria-hidden />
          <h2 className="teaser-gold-text font-heading text-3xl font-bold sm:text-4xl">{t("finalTitle")}</h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">{t("finalBody")}</p>
          <p className="teaser-gold-text mt-5 font-mono text-5xl font-bold tabular-nums" dir="ltr">
            {seatLabel(stats.nextSeat)}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            {cta}
            <ShareButton url={`${SITE_URL}/${locale}/soon`} />
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
