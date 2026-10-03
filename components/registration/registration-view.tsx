import Image from "next/image";
import { BriefcaseBusiness, Images, UsersRound, Sparkles, ArrowUpLeft, ArrowLeft, Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "@/components/brand-lockup";
import { CountryPicker } from "@/components/country-picker";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ReleaseStamp } from "@/components/release-stamp";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationLd } from "@/lib/structured-data";
import { Link } from "@/i18n/navigation";
import { accountLink } from "@/lib/account-link";
import { COUNTRIES } from "@/lib/countries";
import { chosenCountry, currentCountry } from "@/lib/country-choice";

export async function RegistrationHeader({ locale }: { locale: string }) {
  const [h, country, chosen, account] = await Promise.all([getTranslations("Header"), currentCountry(), chosenCountry(), accountLink(locale)]);
  return <header className="registration-header">
    <Link href="/" aria-label={h("brand")}><BrandLockup label={h("brand")} /></Link>
    <div className="registration-tools">
      <CountryPicker current={country} chosen={chosen !== null} options={COUNTRIES.map((c) => ({ code: c.code, name: locale === "ar" ? c.ar : c.en, flag: c.flag }))} label={h("country")} locateLabel={h("useLocation")} />
      <LocaleSwitcher label={h("switchLocale")} ariaLabel={h("switchLocaleLabel")} />
      <ThemeToggle labels={{ dark: h("themeDark"), light: h("themeLight") }} />
    </div>
    <a href={account.href} className="registration-login" data-testid="registration-account">{account.label}</a>
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

/** Registration-phase landing: calm product-first hierarchy with one launch moment. */
export async function RegistrationView({ locale }: { locale: string }) {
  const [t, country] = await Promise.all([getTranslations("Registration"), currentCountry()]);
  const market = country === "jo" || country === "sa" || country === "eg" ? country : "gulf";
  const cta = <Link href="/join" className="sw-invitation-cta" data-testid="registration-cta">{t("cta")}</Link>;
  const trust = <ul className="launch-trust" data-testid="launch-trust">{(["free", "noCard", "private"] as const).map((key) => <li key={key}><Check className="size-4" aria-hidden />{t(`trust.${key}`)}</li>)}</ul>;
  return <main className="registration-site registration-site-v2" data-testid="registration-page" data-launch-phase="registration" data-country={country}>
    <JsonLd data={[organizationLd()]} />
    <aside className="launch-strip" aria-label={t("launch.label")} data-testid="launch-strip"><p><span className="launch-strip-kicker"><span aria-hidden>✦</span> {t("launch.kicker")}</span><span className="launch-strip-body">{t("launch.body")}</span><Link href="/join" className="launch-strip-link" data-testid="launch-strip-link">{t("launch.link")}<ArrowLeft className="size-4 shrink-0 ltr:rotate-180" aria-hidden /></Link></p></aside>
    <RegistrationHeader locale={locale} />
    <section className="registration-hero registration-hero-v2" aria-labelledby="registration-title">
      <div className="registration-hero-copy"><p className="launch-badge" data-testid="launch-badge"><span className="launch-badge-kicker">{t("cohort.kicker")}</span><strong>{t("cohort.name")}</strong><span className="launch-badge-year">{t("cohort.year")}</span></p><p className="registration-eyebrow launch-eyebrow"><Sparkles className="size-4" aria-hidden />{t("eyebrow")}</p><h1 id="registration-title">{t(`markets.${market}.title`)}<span>{t(`markets.${market}.titleEnd`)}</span></h1><p className="registration-lead">{t(`markets.${market}.intro`)}</p><div className="registration-actions">{cta}<Link href="/examples" className="registration-secondary" data-testid="registration-example">{t("exampleCta")}<ArrowUpLeft className="size-4 ltr:rotate-90" aria-hidden /></Link></div>{trust}</div>
      <div className="registration-hero-photo registration-hero-product"><Image src="/assets/photos/agency.webp" alt="" fill priority sizes="(min-width: 900px) 48vw, 92vw" /><div className="registration-photo-caption"><strong>{t("photoTitle")}</strong><span>{t("photoBody")}</span></div></div>
    </section>
    <section className="registration-audiences" aria-labelledby="registration-value"><div className="registration-section-heading"><p className="registration-eyebrow">{t("visionEyebrow")}</p><h2 id="registration-value">{t("visionTitle")}</h2><p className="registration-intro">{t("visionBody")}</p></div><div className="registration-audience-grid">
      <article className="registration-audience-card"><BriefcaseBusiness className="registration-icon" aria-hidden /><h3>{t("buyerIntro")}</h3><p>{t("values.opportunities.body")}</p><Link href="/contact" className="registration-text-link">{t("buyerCta")}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden /></Link></article>
      <article className="registration-audience-card registration-audience-card--accent"><Images className="registration-icon" aria-hidden /><h3>{t("values.portfolio.title")}</h3><p>{t("values.portfolio.body")}</p><Link href="/join" className="registration-text-link">{t("cta")}<ArrowLeft className="size-4 ltr:rotate-180" aria-hidden /></Link></article>
    </div></section>
    <section className="launch-early launch-early-v2" aria-labelledby="launch-early-title" data-testid="why-early"><div className="launch-early-copy"><p className="registration-eyebrow">{t("early.eyebrow")}</p><h2 id="launch-early-title">{t("early.title")}</h2><p className="registration-intro">{t("early.body")}</p><div className="registration-actions">{cta}</div></div><ul className="launch-early-points">{(["prepare", "organise", "ready", "community"] as const).map((key, i) => <li key={key}><span className="launch-early-number" aria-hidden>{i + 1}</span>{t(`early.points.${key}`)}</li>)}</ul><p className="registration-note launch-early-note">{t("early.note")}</p></section>
    <section className="registration-proof" aria-labelledby="registration-proof-title" data-testid="pioneer-invitation"><div><p className="registration-eyebrow">{t("pioneersEyebrow")}</p><h2 id="registration-proof-title">{t(`markets.${market}.pioneerTitle`)}</h2><p className="registration-intro">{t("pioneersBody")}</p></div><div className="registration-proof-list"><div><Images aria-hidden /><span>{t("pioneerTools")}</span></div><div><UsersRound aria-hidden /><span>{t("pioneerOpportunity")}</span></div><div><Sparkles aria-hidden /><span>{t("pioneerVoice")}</span></div></div></section>
    <section className="registration-how" aria-labelledby="registration-stages"><div className="registration-section-heading"><h2 id="registration-stages">{t("stagesTitle")}</h2></div><ol className="registration-stages registration-stages-v2">{(["registration", "discovery", "full"] as const).map((key, i) => <li key={key} data-current={key === "registration"}><span className="registration-step-number">0{i + 1}</span><h3>{t(`stages.${key}.title`)}</h3><p>{t(`stages.${key}.body`)}</p></li>)}</ol></section>
    <section className="registration-section registration-faq registration-faq-v2"><div className="registration-section-heading"><h2>{t("faqTitle")}</h2></div>{(["privacy", "free", "beta", "pioneer"] as const).map((key) => <details key={key}><summary>{t(`faq.${key}.question`)}</summary><p>{t(`faq.${key}.answer`)}</p></details>)}</section>
    <section className="registration-final registration-final-v2"><p className="registration-eyebrow">{t("cohort.kicker")}</p><h2>{t(`markets.${market}.finalTitle`)}</h2><p>{t("finalBody")}</p><div className="registration-actions">{cta}<Link href="/examples" className="registration-secondary">{t("exampleCta")}</Link></div>{trust}</section><RegistrationFooter />
  </main>;
}
