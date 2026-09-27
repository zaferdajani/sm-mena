import { BriefcaseBusiness, CheckCircle2, Images, Lock, Sparkles, UserRound, UsersRound } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ShareButton } from "@/components/teaser/share-button";
import { founderCopy } from "@/components/teaser/market-copy";
import { Link } from "@/i18n/navigation";
import { countryOf } from "@/lib/countries";
import { currentCountry } from "@/lib/country-choice";
import { teaserStats } from "@/lib/data/teaser";
import { SITE_URL } from "@/lib/site";

const WHO = ["agencies", "freelancers", "creators", "influencers", "ugc", "photographers", "videographers", "designers", "writers", "ads", "voice", "web"] as const;

/**
 * Provider-first pre-launch page.
 *
 * The Arabic voice is selected by market (saved country, then Vercel country,
 * then Jordan). The value proposition comes before scarcity: clients, partner
 * work and proof first; founder advantages second. Registration order is still
 * kept internally for history, but is deliberately not sold as the benefit.
 */
export async function TeaserView({ locale, account }: { locale: string; account: { href: string; label: string } }) {
  const [t, tc, stats, country] = await Promise.all([
    getTranslations("Teaser"),
    getTranslations("Header"),
    teaserStats(),
    currentCountry(),
  ]);
  const copy = founderCopy(locale, country);
  const countryMeta = countryOf(country);
  const countryCount = stats.countries.find((x) => x.code === country)?.n ?? 0;

  const cta = (
    <Link
      href="/join"
      className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--gold)] px-7 py-3.5 text-base font-bold text-black shadow-[0_0_40px_-8px_var(--gold)] transition hover:brightness-110"
      data-testid="teaser-cta"
    >
      {copy.cta}
    </Link>
  );

  const values = [
    { icon: BriefcaseBusiness, title: copy.value.clientsTitle, body: copy.value.clientsBody },
    { icon: UsersRound, title: copy.value.partnersTitle, body: copy.value.partnersBody },
    { icon: Images, title: copy.value.proofTitle, body: copy.value.proofBody },
  ];

  return (
    <main className="teaser-night min-h-dvh overflow-x-clip bg-background text-foreground" data-testid="teaser-page">
      <section className="relative isolate flex min-h-[88svh] flex-col overflow-hidden px-4 pb-12 pt-5">
        <Image src="/teaser/citadel-9x16.webp" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-bottom sm:hidden" />
        <video
          src="/teaser/citadel-9x16.mp4"
          poster="/teaser/citadel-9x16.webp"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="absolute inset-0 -z-10 size-full object-cover object-bottom motion-reduce:hidden sm:hidden"
        />
        <Image src="/teaser/citadel-16x9.webp" alt="" fill sizes="100vw" className="-z-10 hidden object-cover object-bottom sm:block" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/85 via-black/45 to-background" aria-hidden />

        <div className="mx-auto w-full max-w-4xl">
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

          <div className="mt-16 max-w-2xl sm:mt-24">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/40 bg-black/40 px-3 py-1.5 text-xs font-bold text-[var(--gold-soft)] backdrop-blur">
              <span className="size-2 rounded-full bg-emerald-400" aria-hidden />
              {copy.eyebrow}
            </p>
            <h1 className="mt-5 text-balance font-heading text-[clamp(2.65rem,8vw,5.2rem)] font-bold leading-[1.08] text-white">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-8 text-white/80 sm:text-xl">{copy.intro}</p>
            <p className="mt-5 text-lg font-bold text-[var(--gold-soft)]">{copy.advantage}</p>
            <div className="mt-7 flex flex-col items-start gap-2">
              {cta}
              <p className="text-xs text-white/60">{copy.ctaNote}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-20 px-4 py-14 sm:py-20">
        <section>
          <h2 className="max-w-2xl text-balance font-heading text-3xl font-bold sm:text-5xl">{copy.valueTitle}</h2>
          <p className="mt-3 max-w-2xl text-pretty leading-7 text-muted-foreground">{copy.valueIntro}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {values.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-3xl border bg-card p-6">
                <Icon className="size-6 text-[var(--gold)]" aria-hidden />
                <h3 className="mt-5 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="relative isolate overflow-hidden rounded-[2rem] border border-[var(--gold)]/30 bg-card p-6 sm:p-10" data-testid="founder-benefits">
          <div className="absolute -end-20 -top-24 -z-10 size-64 rounded-full bg-[var(--gold)]/10 blur-3xl" aria-hidden />
          <p className="text-sm font-bold text-[var(--gold)]">{locale === "ar" ? "مزايا المؤسسين" : "Founder advantages"}</p>
          <h2 className="mt-2 max-w-2xl text-balance font-heading text-3xl font-bold sm:text-5xl">{copy.founderTitle}</h2>
          <p className="mt-4 max-w-2xl text-pretty leading-7 text-muted-foreground">{copy.founderIntro}</p>

          <div className="mt-8 grid gap-3">
            <div className="rounded-2xl border border-emerald-600/25 bg-emerald-600/5 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="size-5" aria-hidden />
                {copy.founderKnown}
              </div>
              <p className="mt-2 font-semibold leading-7">{copy.founderKnownBody}</p>
            </div>
            {copy.founderLocked.map((item, i) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-dashed p-5">
                <Lock className="size-5 shrink-0 text-[var(--gold)]" aria-hidden />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{locale === "ar" ? `ميزة ${i + 2} · نكشفها قريباً` : `Benefit ${i + 2} · reveal coming`}</p>
                  <p className="mt-1 font-bold">{item}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-xs leading-6 text-muted-foreground">{copy.founderNote}</p>
          <div className="mt-7">{cta}</div>
        </section>

        <section>
          <h2 className="font-heading text-3xl font-bold">{copy.whoTitle}</h2>
          <p className="mt-2 text-muted-foreground">{copy.whoIntro}</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {WHO.map((k) => (
              <li key={k} className="rounded-full border px-3 py-1.5 text-sm font-medium">
                {t(`who.${k}`)}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid items-center gap-6 rounded-[2rem] border bg-card p-5 sm:grid-cols-[1fr_1.1fr] sm:p-8">
          <Image src="/teaser/door-1x1.webp" alt="" width={1080} height={1080} sizes="(min-width: 640px) 40vw, 100vw" className="rounded-3xl" />
          <div>
            <Sparkles className="size-6 text-[var(--gold)]" aria-hidden />
            <h2 className="mt-4 font-heading text-3xl font-bold">{copy.socialTitle}</h2>
            <p className="mt-3 text-pretty leading-7 text-muted-foreground">{copy.socialBody}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border p-4">
                <dt className="text-xs text-muted-foreground">{locale === "ar" ? countryMeta.ar : countryMeta.en}</dt>
                <dd className="mt-1 text-3xl font-bold tabular-nums" dir="ltr">{countryCount}</dd>
              </div>
              <div className="rounded-2xl border p-4">
                <dt className="text-xs text-muted-foreground">{locale === "ar" ? "كل الشبكة" : "Whole network"}</dt>
                <dd className="mt-1 text-3xl font-bold tabular-nums" dir="ltr">{stats.total}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="relative isolate overflow-hidden rounded-[2rem] px-6 py-14 text-center sm:px-10 sm:py-20">
          <Image src="/teaser/invite-4x5.webp" alt="" fill sizes="(min-width: 768px) 768px, 100vw" className="-z-10 object-cover" />
          <div className="absolute inset-0 -z-10 bg-black/70" aria-hidden />
          <h2 className="mx-auto max-w-2xl text-balance font-heading text-3xl font-bold text-white sm:text-5xl">{copy.finalTitle}</h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty leading-7 text-white/80">{copy.finalBody}</p>
          <div className="mt-8 flex flex-col items-center gap-3">
            {cta}
            <ShareButton url={`${SITE_URL}/${locale}/soon`} />
            <p className="text-xs text-white/60">{copy.share}</p>
          </div>
        </section>

        <footer className="space-y-2 pb-6 text-center text-xs text-muted-foreground">
          <p>
            <Link href="/login" className="underline">
              {locale === "ar" ? "عندك حساب؟ سجّل دخول" : "Already joined? Sign in"}
            </Link>
          </p>
          <p>{locale === "ar" ? "الأعداد أعلاه صفحات مسجّلة، وليست جهات موثّقة أو ترتيباً للجودة." : "Counts above are registered pages, not verified businesses or a quality ranking."}</p>
        </footer>
      </div>
    </main>
  );
}
