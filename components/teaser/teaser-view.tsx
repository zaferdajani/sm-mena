import { BadgeCheck, Crown, Globe2, Hash, KeyRound, Lock, LockOpen, UserRound } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ProviderBars, ProviderMap } from "@/components/teaser/provider-map";
import { ShareButton } from "@/components/teaser/share-button";
import { Link } from "@/i18n/navigation";
import { COUNTRIES, countryOf, countryOfCity } from "@/lib/countries";
import { recentSeats, teaserStats } from "@/lib/data/teaser";
import { timeAgo } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { TEASER_MIN_PROOF, seatLabel, vaultState } from "@/lib/teaser";

const WHO = ["agencies", "freelancers", "creators", "influencers", "ugc", "photographers", "videographers", "designers", "writers", "ads", "voice", "web"] as const;

/**
 * "The List": the pre-launch teaser for providers (docs/39-teaser.md). Night
 * theme and gold, a numbered founding seat for every provider who registers,
 * and a live race of real registrations per country and city. It does not
 * explain the business model. Every call to action opens /join. Shown at /soon,
 * and as the front page while the "prelaunch_home" switch is on.
 */
export async function TeaserView({ locale, account }: { locale: string; account: { href: string; label: string } }) {
  const [t, tc, stats, recent] = await Promise.all([getTranslations("Teaser"), getTranslations("Header"), teaserStats(), recentSeats()]);
  const vault = vaultState(stats.nextSeat - 1);
  const name = (x: { ar: string; en: string }) => (locale === "ar" ? x.ar : x.en);
  const cityLabel = (key: string) => {
    const city = countryOf(countryOfCity(key)).cities.find((c) => c.key === key);
    return city ? name(city) : key;
  };
  const cta = (
    <Link
      href="/join"
      className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--gold)] px-8 py-4 text-base font-bold text-black shadow-[0_0_40px_-8px_var(--gold)] transition hover:brightness-110"
      data-testid="teaser-cta"
    >
      <KeyRound className="size-5" aria-hidden />
      {t("ctaSeat", { seat: seatLabel(stats.nextSeat) })}
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
        {/* The teaser Reel (Higgsfield), silent and looping; still image for reduced motion. */}
        <video
          src="/teaser/citadel-9x16.mp4"
          poster="/teaser/citadel-9x16.webp"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="absolute inset-0 -z-10 size-full object-cover object-bottom motion-reduce:hidden sm:hidden"
          data-testid="teaser-video"
        />
        <Image src="/teaser/citadel-16x9.webp" alt="" fill sizes="100vw" className="-z-10 hidden object-cover object-bottom sm:block" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/80 via-black/30 to-background" aria-hidden />
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex w-fit items-center gap-2 font-heading text-xl font-bold" translate="no">
              <Image src="/brand/mark-192.png" alt="" width={32} height={32} className="rounded-lg" />
              {tc("brand")}
            </Link>
            <a href={account.href} className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold backdrop-blur" data-testid="teaser-account">
              <UserRound className="size-3.5" aria-hidden />
              {account.label}
            </a>
          </div>
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
            {recent.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-3" data-testid="teaser-recent">
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/70">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
                  {t("recentTitle")}
                </p>
                <ul className="space-y-1 text-sm text-white/85">
                  {recent.slice(0, 4).map((r) => (
                    <li key={r.seat} className="flex items-baseline justify-between gap-3">
                      <span>
                        {t("recentItem", { kind: t(`kind.${r.kind}`), city: cityLabel(r.city) })}{" "}
                        <b className="font-mono text-[var(--gold-soft)]" dir="ltr">
                          {seatLabel(r.seat!)}
                        </b>
                      </span>
                      <span className="shrink-0 text-xs text-white/50">{timeAgo(r.at.toISOString(), locale)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

        <section data-testid="teaser-vault">
          <h2 className="font-heading text-3xl font-bold">{t("vaultTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("vaultIntro")}</p>
          <ol className="mt-5 space-y-3">
            {vault.items.map((m) => (
              <li key={m.key} className={`flex gap-3 rounded-2xl border p-4 ${m.open ? "border-[var(--gold)]/50 bg-card" : "border-dashed"}`} data-open={m.open}>
                {m.open ? <LockOpen className="mt-0.5 size-5 shrink-0 text-[var(--gold)]" aria-hidden /> : <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />}
                <div className="min-w-0">
                  {m.open ? (
                    <p className="font-semibold">{t(`vault.${m.key}`)}</p>
                  ) : (
                    // Locked secrets are not sent to the browser at all.
                    <p className="select-none font-semibold tracking-widest text-muted-foreground/60 blur-[3px]" aria-hidden>
                      ••••• •••• ••••••• ••• •••••
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.open ? t("vaultOpened") : t("vaultAt", { seat: seatLabel(m.at) })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {vault.next && (
            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-[var(--gold)]" style={{ inlineSize: `${Math.max(2, vault.progress * 100)}%` }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--gold-soft)]" data-testid="teaser-vault-left">
                {t("vaultLeft", { count: vault.left })}
              </p>
            </div>
          )}
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
