import Image from "next/image";
import { BriefcaseBusiness, Images, UsersRound, Sparkles, ArrowUpLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand-lockup";
import { CountryPicker } from "@/components/country-picker";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReleaseStamp } from "@/components/release-stamp";
import { Link } from "@/i18n/navigation";
import { accountLink } from "@/lib/account-link";
import { COUNTRIES } from "@/lib/countries";
import { chosenCountry, currentCountry } from "@/lib/country-choice";

export async function RegistrationHeader({ locale }: { locale: string }) {
  const [t, h, country, chosen, account] = await Promise.all([getTranslations("Registration"), getTranslations("Header"), currentCountry(), chosenCountry(), accountLink(locale)]);
  return <header className="registration-header">
    <Link href="/" aria-label={h("brand")}><BrandLockup label={h("brand")} /></Link>
    <div className="registration-tools">
      <CountryPicker current={country} chosen={chosen !== null} options={COUNTRIES.map((c) => ({ code: c.code, name: locale === "ar" ? c.ar : c.en, flag: c.flag }))} label={h("country")} locateLabel={h("useLocation")} />
      <LocaleSwitcher label={h("switchLocale")} ariaLabel={h("switchLocaleLabel")} />
      <ThemeToggle labels={{ dark: h("themeDark"), light: h("themeLight") }} />
      <a href={account.href} className="registration-login" data-testid="registration-account">{account.label}</a>
    </div>
    <p className="registration-phase-label">{t("phaseLabel")}</p>
  </header>;
}
export async function RegistrationFooter() {
  const t = await getTranslations("Registration");
  return <footer className="registration-footer" data-testid="registration-footer">
    <p>{t("freeNote")}</p>
    <nav aria-label={t("footerLabel")}><Link href="/contact">{t("contact")}</Link><Link href="/legal">{t("legal")}</Link><Link href="/examples">{t("exampleCta")}</Link></nav>
    <ReleaseStamp />
  </footer>;
}

/** No provider queries, membership totals, simulated activity or future charges. */
export async function RegistrationView({ locale }: { locale: string }) {
  const [t, country] = await Promise.all([getTranslations("Registration"), currentCountry()]);
  const market = country === "jo" || country === "sa" || country === "eg" ? country : "gulf";
  const cta = <Link href="/join" className="sw-invitation-cta" data-testid="registration-cta">{t("cta")}</Link>;
  return <main className="registration-site" data-testid="registration-page" data-launch-phase="registration" data-country={country}>
    <RegistrationHeader locale={locale} />
    <section className="registration-hero">
      <div className="registration-hero-copy">
        <p className="registration-eyebrow"><Sparkles className="size-4" aria-hidden />{t("eyebrow")}</p>
        <h1>{t(`markets.${market}.title`)}<span>{t(`markets.${market}.titleEnd`)}</span></h1>
        <p className="registration-lead">{t(`markets.${market}.intro`)}</p>
        <div className="registration-actions">{cta}<Link href="/examples" className="registration-secondary" data-testid="registration-example">{t("exampleCta")}<ArrowUpLeft className="size-4 ltr:rotate-90" aria-hidden /></Link></div>
        <p className="registration-free">{t("freeNote")}</p>
      </div>
      <div className="registration-hero-photo"><Image src="/assets/photos/agency.webp" alt="" fill priority sizes="(min-width: 900px) 450px, 90vw" /><div className="registration-photo-caption"><strong>{t("photoTitle")}</strong><span>{t("photoBody")}</span></div></div>
    </section>
    <section className="registration-section" aria-labelledby="registration-value">
      <p className="registration-eyebrow">{t("visionEyebrow")}</p><h2 id="registration-value">{t("visionTitle")}</h2><p className="registration-intro">{t("visionBody")}</p>
      <div className="registration-grid">
        {([{ key: "portfolio", icon: Images }, { key: "opportunities", icon: BriefcaseBusiness }, { key: "partners", icon: UsersRound }] as const).map(({ key, icon: Icon }) => <article key={key} className="registration-card"><Icon className="registration-icon" aria-hidden /><h3>{t(`values.${key}.title`)}</h3><p>{t(`values.${key}.body`)}</p><span className="registration-status">{t(key === "portfolio" ? "availableNow" : "nextStage")}</span></article>)}
      </div>
    </section>
    <section className="registration-pioneers" data-testid="pioneer-invitation">
      <div><p className="registration-eyebrow">{t("pioneersEyebrow")}</p><h2>{t(`markets.${market}.pioneerTitle`)}</h2><p>{t("pioneersBody")}</p></div>
      <div className="registration-pioneer-hints"><p>{t("pioneerOpportunity")}</p><p>{t("pioneerTools")}</p><p>{t("pioneerVoice")}</p></div>
      <p className="registration-note">{t("pioneersNote")}</p>
    </section>
    <section className="registration-section" aria-labelledby="registration-stages"><h2 id="registration-stages">{t("stagesTitle")}</h2>
      <ol className="registration-stages">{(["registration", "discovery", "full"] as const).map((key) => <li key={key} data-current={key === "registration"}><span className="registration-status">{t(key === "registration" ? "currentStage" : "laterStage")}</span><h3>{t(`stages.${key}.title`)}</h3><p>{t(`stages.${key}.body`)}</p></li>)}</ol>
    </section>
    <section className="registration-section"><h2>{t("whoTitle")}</h2><p className="registration-intro">{t("whoBody")}</p></section>
    <section className="registration-section registration-faq"><h2>{t("faqTitle")}</h2>{(["privacy", "free", "beta", "pioneer"] as const).map((key) => <details key={key}><summary>{t(`faq.${key}.question`)}</summary><p>{t(`faq.${key}.answer`)}</p></details>)}</section>
    <section className="registration-final"><h2>{t(`markets.${market}.finalTitle`)}</h2><p>{t("finalBody")}</p><div className="registration-actions">{cta}<Link href="/examples" className="registration-secondary">{t("exampleCta")}</Link></div><p className="registration-free">{t("freeNote")}</p></section>
    <p className="registration-buyer">{t("buyerIntro")} <Link href="/contact">{t("buyerCta")}</Link></p>
    <RegistrationFooter />
  </main>;
}
