import { BriefcaseBusiness, CheckCircle2, Images, Lock, UserRound, UsersRound } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand-lockup";
import { CountryPicker } from "@/components/country-picker";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReleaseStamp } from "@/components/release-stamp";
import { ShareButton } from "@/components/teaser/share-button";
import { founderCopy } from "@/components/teaser/market-copy";
import { Link } from "@/i18n/navigation";
import { COUNTRIES, countryOf } from "@/lib/countries";
import { chosenCountry, currentCountry } from "@/lib/country-choice";
import { teaserStats } from "@/lib/data/teaser";
import { SITE_URL } from "@/lib/site";

const WHO = ["agencies", "freelancers", "creators", "influencers", "ugc", "photographers", "videographers", "designers", "writers", "ads", "voice", "web"] as const;

/** The approved brochure's composition, retaining the existing copy and rules. */
export async function TeaserView({ locale, account }: { locale: string; account: { href: string; label: string } }) {
  const [t, th, stats, country, chosen] = await Promise.all([
    getTranslations("Teaser"), getTranslations("Header"), teaserStats(), currentCountry(), chosenCountry(),
  ]);
  const copy = founderCopy(locale, country);
  const countryMeta = countryOf(country);
  const countryCount = stats.countries.find((x) => x.code === country)?.n ?? 0;
  const cta = <Link href="/join" className="sw-invitation-cta" data-testid="teaser-cta">{copy.cta}</Link>;
  const values = [
    { icon: Images, title: copy.value.proofTitle, body: copy.value.proofBody },
    { icon: BriefcaseBusiness, title: copy.value.clientsTitle, body: copy.value.clientsBody },
    { icon: UsersRound, title: copy.value.partnersTitle, body: copy.value.partnersBody },
  ];
  return (
    <main className="sw-invitation" data-testid="teaser-page" data-design-surface="invitation" data-country={country}>
      <header className="sw-invitation-header">
        <Link href="/" translate="no"><BrandLockup label={th("brand")} /></Link>
        <div className="sw-invitation-tools">
          <CountryPicker current={country} chosen={chosen !== null}
            options={COUNTRIES.map((c) => ({ code: c.code, name: locale === "ar" ? c.ar : c.en, flag: c.flag }))}
            label={th("country")} locateLabel={th("useLocation")} />
          <LocaleSwitcher label={th("switchLocale")} ariaLabel={th("switchLocaleLabel")} />
          <ThemeToggle labels={{ dark: th("themeDark"), light: th("themeLight") }} />
          <a href={account.href} data-testid="teaser-account"><UserRound className="size-4" aria-hidden />{account.label}</a>
        </div>
      </header>
      <section className="sw-invitation-hero">
        <Image src="/assets/world/scene-01-poster.jpg" alt="" fill priority sizes="(min-width: 1280px) 1152px, 100vw" />
        <p className="sw-invitation-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
        <div className="sw-invitation-actions">{cta}<span>{copy.ctaNote}</span></div>
      </section>
      <div className="sw-invitation-content">
        <section>
          <h2>{copy.valueTitle}</h2>
          <p className="sw-invitation-note">{copy.valueIntro}</p>
          <div className="sw-invitation-values">
            {values.map(({ icon: Icon, title, body }) => <article key={title}><Icon aria-hidden /><h3>{title}</h3><p>{body}</p></article>)}
          </div>
        </section>
        <section className="sw-invitation-founder" data-testid="founder-benefits">
          <h2>{copy.founderTitle}</h2>
          <p>{copy.founderIntro}</p>
          <div className="sw-invitation-benefits">
            <div className="sw-invitation-benefit" data-revealed="true">
              <CheckCircle2 aria-hidden /><div><small>{copy.founderKnown}</small><p>{copy.founderKnownBody}</p></div>
            </div>
            {copy.founderLocked.map((item, i) => (
              <div key={item} className="sw-invitation-benefit"><Lock aria-hidden /><div>
                <small>{locale === "ar" ? `ميزة ${i + 2} · نكشفها قريباً` : `Benefit ${i + 2} · reveal coming`}</small><p>{item}</p>
              </div></div>
            ))}
          </div>
          <p className="sw-invitation-note">{copy.founderNote}</p>
          <div className="sw-invitation-actions mt-5">{cta}</div>
        </section>
        <section>
          <h2>{copy.whoTitle}</h2><p className="sw-invitation-note">{copy.whoIntro}</p>
          <ul className="sw-invitation-chips">{WHO.map((k) => <li key={k}><bdi>{t(`who.${k}`)}</bdi></li>)}</ul>
        </section>
        <section className="sw-invitation-proof">
          <div><h2>{copy.socialTitle}</h2><p className="sw-invitation-note">{copy.socialBody}</p></div>
          <dl>
            <div><dt>{locale === "ar" ? countryMeta.ar : countryMeta.en}</dt><dd><bdi>{countryCount}</bdi></dd></div>
            <div><dt>{locale === "ar" ? "كل الشبكة" : "Whole network"}</dt><dd><bdi>{stats.total}</bdi></dd></div>
          </dl>
        </section>
        <section className="sw-invitation-final">
          <h2>{copy.finalTitle}</h2><p>{copy.finalBody}</p>
          <div className="sw-invitation-actions">{cta}<ShareButton url={`${SITE_URL}/${locale}/soon`} /></div>
          <p className="sw-invitation-note mt-4">{copy.share}</p>
        </section>
      </div>
      <footer className="sw-invitation-footer">
        <Link href="/login" className="underline">{locale === "ar" ? "عندك حساب؟ سجّل دخول" : "Already joined? Sign in"}</Link>
        <p>{locale === "ar" ? "الأعداد صفحات مسجّلة، وليست شهادة جودة." : "Counts are registered pages, not a quality certification."}</p>
        <ReleaseStamp />
      </footer>
    </main>
  );
}
