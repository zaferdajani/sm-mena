import { ScrollScrub } from "./scroll-scrub/scroll-scrub";
import type { CountryCode } from "@/lib/countries";
import { scrollScrubScenes, scrollScrubTheme } from "./scenes";
import type { Lang } from "./copy";
import {
  AgenciesSection, CitiesSection, PaymentsSection, ServicesSection,
  SiteFooter, SiteHeader, TrustSection, WhoSection,
} from "./sections";
import { WelcomeChooser } from "@/components/welcome-chooser";
import { ReleaseStamp } from "@/components/release-stamp";
import { IntroSting } from "./intro-sting";
import "./site.css";
import rhythm from "./layout-rhythm.module.css";

/** Landing, retaining the visitor's saved country and locale. */
export function SawwiqPage({ lang, country, chosen, account, paymentsLive = false }: { lang: Lang; country: CountryCode; chosen: boolean; account: { href: string; label: string }; paymentsLive?: boolean }) {
  return (
    <>
      <IntroSting />
      <WelcomeChooser />
      <div className={`sw ${rhythm.page}`} data-country={country} data-lang={lang} data-design-surface="landing">
        <SiteHeader account={account} chosen={chosen} country={country} lang={lang} />
        <main>
          <ScrollScrub scenes={scrollScrubScenes(lang, country)} theme={scrollScrubTheme} />
          <WhoSection country={country} lang={lang} />
          <PaymentsSection country={country} lang={lang} live={paymentsLive} />
          <ServicesSection lang={lang} />
          <TrustSection country={country} lang={lang} />
          <AgenciesSection country={country} lang={lang} />
          <CitiesSection country={country} lang={lang} />
        </main>
        <SiteFooter country={country} lang={lang} />
        <div className={rhythm.release}><ReleaseStamp /></div>
      </div>
    </>
  );
}
