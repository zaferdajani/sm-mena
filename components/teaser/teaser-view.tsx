import { ArrowLeft, Check, UserRound } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ProviderBars } from "@/components/teaser/provider-map";
import { ShareButton } from "@/components/teaser/share-button";
import { Link } from "@/i18n/navigation";
import { countryOf } from "@/lib/countries";
import { teaserStats } from "@/lib/data/teaser";
import { SITE_URL } from "@/lib/site";
import { TEASER_MIN_PROOF, seatLabel } from "@/lib/teaser";

const WHO = ["agencies", "freelancers", "creators", "photographers", "designers", "ads"] as const;

/**
 * "The List": the pre-launch page for providers (docs/39-teaser.md), light and
 * short. One line on what Sawwiq is, the next founding seat, one call to action
 * (/join), three plain reasons, and the live count per country. Nothing dark,
 * no video, no secrets: the page respects the reader's time and reads properly
 * in Arabic. Shown at /soon (and as the front page only if "prelaunch_home" is on).
 */
export async function TeaserView({ locale, account }: { locale: string; account: { href: string; label: string } }) {
  const [t, tc, stats] = await Promise.all([getTranslations("Teaser"), getTranslations("Header"), teaserStats()]);
  const name = (x: { ar: string; en: string }) => (locale === "ar" ? x.ar : x.en);
  const why = ["free", "seat", "first"] as const;
  const cta = (
    <Link href="/join" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-7 text-base font-semibold text-white shadow-sm transition hover:brightness-110" data-testid="teaser-cta">
      {t("ctaSeat", { seat: seatLabel(stats.nextSeat) })}
      <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
    </Link>
  );

  return (
    <main className="min-h-dvh bg-background text-foreground" data-testid="teaser-page">
      <div className="mx-auto w-full max-w-2xl px-5 pb-16 pt-5 sm:pt-8">
        <header className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-heading text-xl font-bold" translate="no">
            <Image src="/brand/mark-192.png" alt="" width={32} height={32} className="rounded-lg" />
            {tc("brand")}
          </Link>
          <a href={account.href} className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground" data-testid="teaser-account">
            <UserRound className="size-3.5" aria-hidden />
            {account.label}
          </a>
        </header>

        <section className="mt-14 sm:mt-20">
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <span className="size-1.5 rounded-full bg-brand" aria-hidden />
            {t("badge")}
          </p>
          <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.15] sm:text-5xl">{t("title")}</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("tagline")}</p>
        </section>

        <section className="mt-10 rounded-2xl border p-5 sm:p-6" data-testid="teaser-seat">
          <p className="text-sm font-medium text-muted-foreground">{t("seatLabel")}</p>
          <p className="mt-1 font-heading text-5xl font-bold tabular-nums text-brand sm:text-6xl" dir="ltr" data-testid="teaser-next-seat">
            {seatLabel(stats.nextSeat)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{t("seatNote")}</p>
          <div className="mt-5 flex flex-col items-start gap-2">
            {cta}
            <p className="text-xs text-muted-foreground">{t("ctaNote")}</p>
          </div>
          <p className="mt-4 text-sm font-medium" data-testid="teaser-proof">
            {stats.total >= TEASER_MIN_PROOF ? t("proofMany", { count: stats.total }) : t("proofFew")}
          </p>
        </section>

        <section className="mt-12">
          <ul className="grid gap-3 sm:grid-cols-3">
            {why.map((key) => (
              <li key={key} className="rounded-2xl border p-4">
                <Check className="size-5 text-brand" aria-hidden />
                <h2 className="mt-2 font-semibold">{t(`why.${key}Title`)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t(`why.${key}Body`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-semibold">{t("whoTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("whoIntro")}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {WHO.map((k) => (
              <li key={k} className="rounded-full border px-3 py-1 text-sm">
                {t(`who.${k}`)}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-semibold">{t("chartCountries")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("mapIntro")}</p>
          <div className="mt-4 rounded-2xl border p-4">
            <ProviderBars testId="teaser-countries" rows={stats.countries.map((c) => ({ key: c.code, label: name(countryOf(c.code)), flag: countryOf(c.code).flag, n: c.n }))} />
          </div>
          {stats.total > 0 && <p className="mt-2 text-xs text-muted-foreground">{t("kinds", { agencies: stats.agencies, freelancers: stats.freelancers })}</p>}
        </section>

        <section className="mt-14 rounded-2xl bg-brand-soft p-6 text-center">
          <h2 className="font-heading text-2xl font-bold">{t("finalTitle")}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{t("finalBody")}</p>
          <div className="mt-5 flex flex-col items-center gap-3">
            {cta}
            <ShareButton url={`${SITE_URL}/${locale}/soon`} />
          </div>
        </section>

        <footer className="mt-10 space-y-2 text-center text-xs text-muted-foreground">
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
