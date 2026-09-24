import { ScrollScrub } from "./scroll-scrub/scroll-scrub";
import { scrollScrubScenesAr, scrollScrubScenesEn, scrollScrubTheme } from "./scenes";
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
import "./site.css";

export function SawwiqPage({ lang }: { lang: Lang }) {
  return (
    <div className="sw" data-lang={lang}>
      <SiteHeader lang={lang} />
      <main>
        <ScrollScrub scenes={lang === "ar" ? scrollScrubScenesAr : scrollScrubScenesEn} theme={scrollScrubTheme} />
        <WhoSection lang={lang} />
        <PaymentsSection lang={lang} />
        <ServicesSection lang={lang} />
        <TrustSection lang={lang} />
        <AgenciesSection lang={lang} />
        <CitiesSection lang={lang} />
      </main>
      <SiteFooter lang={lang} />
    </div>
  );
}
