import { ArrowLeft, Camera, Handshake, Sparkles, UserRound } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { CountUp, Marquee, Reveal, Rotator } from "@/components/teaser/motion";
import { ShareButton } from "@/components/teaser/share-button";
import { Link } from "@/i18n/navigation";
import { COUNTRIES, countryOf, countryOfCity } from "@/lib/countries";
import { recentSeats, teaserStats } from "@/lib/data/teaser";
import { SITE_URL } from "@/lib/site";
import { TEASER_MIN_PROOF, seatLabel } from "@/lib/teaser";

const WHO_A = ["agencies", "freelancers", "creators", "influencers", "ugc", "photographers"] as const;
const WHO_B = ["videographers", "designers", "writers", "ads", "voice", "web"] as const;

/**
 * "The List": the pre-launch page for providers (docs/39-teaser.md), light,
 * warm and in motion. It sells one feeling, a better working life for the
 * people who make social media, with the levers that are honest to use:
 * gains before fears, concrete scenes instead of claims, live (real) numbers,
 * a founding seat that is truly scarce, and one ask repeated. Every call to
 * action opens /join. Shown at /soon; the front page only if "prelaunch_home" is on.
 */
export async function TeaserView({ locale, account }: { locale: string; account: { href: string; label: string } }) {
  const [t, tc, stats, recent] = await Promise.all([getTranslations("Teaser"), getTranslations("Header"), teaserStats(), recentSeats()]);
  const name = (x: { ar: string; en: string }) => (locale === "ar" ? x.ar : x.en);
  const cityLabel = (key: string) => {
    const city = countryOf(countryOfCity(key)).cities.find((c) => c.key === key);
    return city ? name(city) : key;
  };
  const max = Math.max(1, ...stats.countries.map((c) => c.n));
  const cta = (size: "lg" | "md" = "lg") => (
    <Link
      href="/join"
      className={`teaser-pulse inline-flex items-center justify-center gap-2 rounded-full bg-brand font-semibold text-white shadow-md transition hover:brightness-110 ${size === "lg" ? "h-13 px-8 text-base" : "h-11 px-6 text-sm"}`}
      data-testid="teaser-cta"
    >
      {t("ctaSeat", { seat: seatLabel(stats.nextSeat) })}
      <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
    </Link>
  );
  const scenes = [
    { key: "clients", img: "/teaser/light/scene-7.webp", icon: Sparkles },
    { key: "partners", img: "/teaser/light/scene-5.webp", icon: Handshake },
    { key: "seen", img: "/teaser/light/scene-2.webp", icon: Camera },
  ] as const;

  return (
    <main className="min-h-dvh overflow-x-clip bg-background text-foreground" data-testid="teaser-page">
      {/* Hero: a slow sunrise gradient, the promise, and three floating scenes. */}
      <section className="teaser-sky relative">
        <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-5 sm:pt-7">
          <header className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2 font-heading text-xl font-bold" translate="no">
              <Image src="/brand/mark-192.png" alt="" width={32} height={32} className="rounded-lg" />
              {tc("brand")}
            </Link>
            <a href={account.href} className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-background" data-testid="teaser-account">
              <UserRound className="size-3.5" aria-hidden />
              {account.label}
            </a>
          </header>

          <div className="mt-12 grid items-center gap-10 sm:mt-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-brand shadow-sm backdrop-blur">
                <span className="size-2 animate-pulse rounded-full bg-brand" aria-hidden />
                {t("badge")}
              </p>
              <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.12] sm:text-6xl">{t("v3.heroTitle")}</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("v3.heroSub")}</p>
              <div className="mt-7 flex flex-wrap items-center gap-4">
                {cta()}
                <p className="text-sm text-muted-foreground">{t("ctaNote")}</p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="font-semibold" data-testid="teaser-proof">{stats.total >= TEASER_MIN_PROOF ? t("proofMany", { count: stats.total }) : t("proofFew")}</span>
                <span className="text-muted-foreground">{t("v3.freeLine")}</span>
              </div>
            </div>

            {/* The collage: real-feeling moments, tilted and floating, with the kind of moment each one is. */}
            <div className="relative mx-auto h-[420px] w-full max-w-md sm:h-[480px]" aria-hidden>
              {[
                { img: "/teaser/light/scene-1.webp", chip: t("v3.chips.request"), cls: "teaser-float start-0 top-6 w-[52%]", tilt: "-4deg", chipPos: "top-2" },
                { img: "/teaser/light/scene-4.webp", chip: t("v3.chips.partner"), cls: "teaser-float teaser-float--2 end-0 top-0 w-[46%]", tilt: "5deg", chipPos: "top-2" },
                { img: "/teaser/light/scene-3.webp", chip: t("v3.chips.seen"), cls: "teaser-float teaser-float--3 start-[22%] bottom-0 w-[54%]", tilt: "-2deg", chipPos: "bottom-2" },
              ].map((c) => (
                <figure key={c.img} className={`absolute overflow-hidden rounded-3xl border-4 border-background bg-muted shadow-xl ${c.cls}`} style={{ ["--tilt" as string]: c.tilt }}>
                  <Image src={c.img} alt="" width={720} height={960} sizes="(min-width: 640px) 260px, 50vw" className="aspect-[3/4] w-full object-cover" priority />
                  <figcaption className={`absolute inset-x-2 ${c.chipPos} rounded-xl bg-background/90 px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur`}>{c.chip}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Momentum: real numbers, moving. */}
      <section className="border-y bg-background">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-5 py-8 sm:grid-cols-3">
          <div>
            <p className="font-heading text-4xl font-bold tabular-nums text-brand">
              <span dir="ltr"><CountUp value={COUNTRIES.length} /></span>
            </p>
            <p className="text-sm text-muted-foreground">{t("marketCountries")}</p>
          </div>
          <div>
            <p className="font-heading text-4xl font-bold tabular-nums text-brand">
              <span dir="ltr">{stats.total >= TEASER_MIN_PROOF ? <CountUp value={stats.total} /> : <CountUp value={stats.nextSeat} seat />}</span>
            </p>
            <p className="text-sm text-muted-foreground">{stats.total >= TEASER_MIN_PROOF ? t("v3.registered") : t("v3.nextSeatShort")}</p>
          </div>
          <div className="col-span-2 min-w-0 sm:col-span-1" data-testid="teaser-recent">
            <p className="text-xs font-semibold text-brand">{t("recentTitle")}</p>
            {recent.length ? (
              <Rotator
                className="mt-1 text-sm"
                items={recent.slice(0, 6).map((r) => (
                  <span key={r.seat}>
                    {t("recentItem", { kind: t(`kind.${r.kind}`), city: cityLabel(r.city) })} <b className="tabular-nums" dir="ltr">{seatLabel(r.seat!)}</b>
                  </span>
                ))}
              />
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t("proofFew")}</p>
            )}
          </div>
        </div>
      </section>

      {/* Imagine: three concrete scenes of what changes. */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <Reveal>
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">{t("v3.imagineTitle")}</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("v3.imagineSub")}</p>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {scenes.map((s, i) => (
            <Reveal key={s.key} delay={i * 120}>
              <article className="group overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                <Image src={s.img} alt="" width={720} height={960} sizes="(min-width: 640px) 33vw, 100vw" className="aspect-[4/5] w-full object-cover" />
                <div className="p-5">
                  <s.icon className="size-5 text-brand" aria-hidden />
                  <h3 className="mt-2 text-lg font-semibold">{t(`v3.imagine.${s.key}.title`)}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(`v3.imagine.${s.key}.body`)}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* The ask: the seat. */}
      <section className="mx-auto w-full max-w-6xl px-5">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border bg-gradient-to-br from-brand-soft via-background to-amber-50 p-7 sm:p-10 dark:to-background" data-testid="teaser-seat">
            <div className="grid items-center gap-8 lg:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-brand">{t("seatLabel")}</p>
                <p className="mt-1 font-heading text-6xl font-bold tabular-nums sm:text-7xl" dir="ltr" data-testid="teaser-next-seat">
                  {seatLabel(stats.nextSeat)}
                </p>
                <p className="mt-3 max-w-md text-muted-foreground">{t("seatNote")}</p>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("v3.cohort")}</p>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  {cta()}
                  <p className="text-sm text-muted-foreground">{t("ctaNote")}</p>
                </div>
              </div>
              <ul className="grid gap-3">
                {(["free", "seat", "first"] as const).map((k) => (
                  <li key={k} className="rounded-2xl border bg-background/80 p-4 backdrop-blur">
                    <h3 className="font-semibold">{t(`why.${k}Title`)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t(`why.${k}Body`)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Who it's for: two rows drifting past each other. */}
      <section className="py-16">
        <Reveal className="mx-auto w-full max-w-6xl px-5">
          <h2 className="font-heading text-3xl font-bold">{t("whoTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("whoIntro")}</p>
        </Reveal>
        <div className="mt-6 space-y-3">
          <Marquee>
            {WHO_A.map((k) => (
              <span key={k} className="rounded-full border bg-card px-4 py-2 text-sm font-medium" dir="auto">
                {t(`who.${k}`)}
              </span>
            ))}
          </Marquee>
          <Marquee reverse>
            {WHO_B.map((k) => (
              <span key={k} className="rounded-full border bg-card px-4 py-2 text-sm font-medium" dir="auto">
                {t(`who.${k}`)}
              </span>
            ))}
          </Marquee>
        </div>
      </section>

      {/* The country race: bars grow when they come into view. */}
      <section className="mx-auto w-full max-w-6xl px-5">
        <Reveal>
          <h2 className="font-heading text-3xl font-bold">{t("chartCountries")}</h2>
          <p className="mt-2 text-muted-foreground">{t("mapIntro")}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2" data-testid="teaser-countries">
            {stats.countries.map((c) => {
              const country = countryOf(c.code);
              return (
                <li key={c.code} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">
                      {country.flag} {name(country)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{c.n ? t("mapCount", { count: c.n }) : t("mapOpen")}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="teaser-bar h-full rounded-full bg-brand" style={{ inlineSize: `${Math.max(4, (c.n / max) * 100)}%`, opacity: c.n ? 1 : 0.25 }} />
                  </div>
                </li>
              );
            })}
          </ul>
          {stats.total > 0 && <p className="mt-3 text-xs text-muted-foreground">{t("kinds", { agencies: stats.agencies, freelancers: stats.freelancers })}</p>}
        </Reveal>
      </section>

      {/* Closing: the morning, and the door. */}
      <section className="mx-auto mt-16 w-full max-w-6xl px-5">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] px-6 py-16 text-center text-white sm:py-24">
            <Image src="/teaser/light/sky.webp" alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" className="-z-10 object-cover" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b3d2e]/85 via-[#0b3d2e]/40 to-transparent" aria-hidden />
            <h2 className="font-heading text-3xl font-bold sm:text-5xl">{t("v3.closingTitle")}</h2>
            <p className="mx-auto mt-3 max-w-lg text-white/90">{t("v3.closingBody")}</p>
            <div className="mt-7 flex flex-col items-center gap-3">
              {cta()}
              <ShareButton url={`${SITE_URL}/${locale}/soon`} />
            </div>
          </div>
        </Reveal>
        <footer className="space-y-2 py-10 text-center text-xs text-muted-foreground">
          <p>
            <Link href="/login" className="underline">
              {t("have")}
            </Link>
          </p>
          <p>{t("footnote")}</p>
        </footer>
      </section>
    </main>
  );
}
