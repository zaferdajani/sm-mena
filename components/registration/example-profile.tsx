import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ProfileHeader, type ProfileData } from "@/components/profile/profile-header";
import { RegistrationHeader, RegistrationFooter } from "./registration-view";
import { Link } from "@/i18n/navigation";
import { currentCountry } from "@/lib/country-choice";
import { countryOf } from "@/lib/countries";

/** Static demonstration fixtures, never registered accounts and never fed into matching or statistics. */
export async function ExampleProfile({ locale, kind, tab }: { locale: string; kind: "agency" | "freelancer"; tab: "work" | "services" | "about" }) {
  const [t, country] = await Promise.all([getTranslations("Registration"), currentCountry()]);
  const data: ProfileData = {
    id: "00000000-0000-0000-0000-000000000000", handle: `example.${kind}`, name: t(`examples.${kind}.name`), bio: t(`examples.${kind}.bio`),
    country, city: countryOf(country).cities[0].key, kind, avatarUrl: "/brand/mark-192.png", isVerified: false, isDemo: true,
    postCount: 0, followerCount: 0, services: kind === "agency" ? ["smm_management", "brand_identity", "ads_meta"] : ["photography", "video_production"],
    startingPriceJod: null, whatsapp: null, phone: null, email: null, website: null, instagram: null, ratingAverage: null, ratingCount: 0, googleRating: null, googleRatingCount: null, googleMapsUrl: null,
  };
  return <main className="registration-site" data-testid="example-page"><RegistrationHeader locale={locale} />
    <section className="registration-example-notice"><h2>{t("examples.title")}</h2><p>{t("examples.notice")}</p><div className="registration-actions">{(["agency", "freelancer"] as const).map((k) => <Link key={k} href={{ pathname: "/examples", query: { kind: k, tab } }} aria-current={kind === k ? "page" : undefined} className="registration-secondary" data-testid={`example-${k}`}>{t(`examples.${k}.label`)}</Link>)}</div></section>
    <section className="registration-example" data-testid="example-profile"><ProfileHeader agency={data} following={false} previewOnly />
      <nav className="registration-example-tabs" aria-label={t("examples.tabsLabel")}>{(["work", "services", "about"] as const).map((key) => <Link key={key} href={{ pathname: "/examples", query: { kind, tab: key } }} aria-current={tab === key ? "page" : undefined} data-testid={`example-tab-${key}`}>{t(`examples.tabs.${key}`)}</Link>)}</nav>
      {tab === "work" && <><p className="registration-note">{t("examples.mediaNotice")}</p><div className="registration-grid">{["agency", "ads", "biz-restaurant"].map((image, i) => <article key={image} className="registration-card registration-example-work"><div><Image src={`/assets/photos/${image}.webp`} alt={t("examples.imageAlt")} fill sizes="(min-width: 900px) 320px, 85vw" /></div><h3>{t(`examples.projects.${i}.title`)}</h3><p>{t(`examples.projects.${i}.body`)}</p></article>)}</div></>}
      {tab === "services" && <div className="registration-grid">{["brief", "deliver", "collaborate"].map((key) => <article key={key} className="registration-card"><h3>{t(`examples.services.${key}.title`)}</h3><p>{t(`examples.services.${key}.body`)}</p></article>)}</div>}
      {tab === "about" && <article className="registration-card"><h2>{t("examples.aboutTitle")}</h2><p>{t(`examples.${kind}.about`)}</p></article>}
    </section><section className="registration-final"><h2>{t("examples.yourTurn")}</h2><p>{t("examples.yourTurnBody")}</p><Link href="/join" className="sw-invitation-cta">{t("cta")}</Link></section><RegistrationFooter />
  </main>;
}
