import { ScrollScrub } from "./scroll-scrub/scroll-scrub";
import type { CountryCode } from "@/lib/countries";
import { scrollScrubScenes, scrollScrubTheme } from "./scenes";
import type { Lang } from "./copy";
import {
  AgenciesSection,
  CitiesSection,
  PaymentsSection,
  ServicesSection,
  SiteFooter,
  SiteHeader,
  TrustSection,
  WhoSection,
} from "./sections";
import { WelcomeChooser } from "@/components/welcome-chooser";
import "./site.css";

/**
 * The landing page for a language and the visitor's country (their saved
 * choice, else the country of their IP address, else Jordan). `chosen` tells
 * the header's country picker whether the visitor saved a choice yet.
 */
export function SawwiqPage({ lang, country, chosen, account, paymentsLive = false }: { lang: Lang; country: CountryCode; chosen: boolean; account: { href: string; label: string }; paymentsLive?: boolean }) {
  return (
    <>
      {/* Outside .sw so the landing styles don't restyle the dialog. */}
      <WelcomeChooser />
      <div className="sw" data-country={country} data-lang={lang}>
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
      </div>
    </>
  );
}
