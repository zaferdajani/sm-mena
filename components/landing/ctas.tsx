/* eslint-disable @next/next/no-img-element -- landing images are pre-sized WebP/PNG files with explicit dimensions and lazy loading */
/* Bespoke CTAs: every call to action owns its garment and interaction identity. */
import type { CSSProperties } from "react";
import { appUrl, siteCopy, type IconName, type Lang } from "./copy";

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const style = { "--sw-icon": `url(/assets/icons/${name}.png)` } as CSSProperties;
  return <span aria-hidden="true" className={["sw-icon", className].filter(Boolean).join(" ")} style={style} />;
}

/** Hero primary: an outgoing chat bubble; typing dots run before the arrow on hover. */
export function MatchBubble({ lang }: { lang: Lang }) {
  return (
    <a className="sw-bubble" href={appUrl(lang, "match")}>
      <span className="sw-bubble__label">{siteCopy[lang].cta.match}</span>
      <span aria-hidden="true" className="sw-bubble__typing">
        <i />
        <i />
        <i />
      </span>
      <svg aria-hidden="true" className="sw-bubble__arrow" viewBox="0 0 20 20">
        <path d="M4 10h11M11 5l5 5-5 5" />
      </svg>
    </a>
  );
}

/** Hero secondary: a feed-grid glyph that opens from 2x2 to 3x3 on hover. */
export function GridLink({ lang }: { lang: Lang }) {
  return (
    <a className="sw-gridlink" href={appUrl(lang, "explore")}>
      <span aria-hidden="true" className="sw-gridlink__glyph">
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} />
        ))}
      </span>
      <span className="sw-gridlink__label">{siteCopy[lang].cta.browse}</span>
    </a>
  );
}

/** Trust: a star readout whose five stars fill one by one on hover. */
export function StarReadout({ lang }: { lang: Lang }) {
  return (
    <a className="sw-stars" href={appUrl(lang, "explore")}>
      <span aria-hidden="true" className="sw-stars__row">
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} viewBox="0 0 20 20">
            <path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z" />
          </svg>
        ))}
      </span>
      <span className="sw-stars__label">{siteCopy[lang].cta.reviews}</span>
    </a>
  );
}

/** Agencies: a mini profile card; a story ring draws around the avatar on hover. */
export function ProfileRingCard({ lang }: { lang: Lang }) {
  const c = siteCopy[lang];
  return (
    <a className="sw-profile" href={appUrl(lang, "join")}>
      <span aria-hidden="true" className="sw-profile__ring">
        <img alt="" height={44} src="/assets/brand/mark.png" width={44} />
      </span>
      <span className="sw-profile__text">
        <span className="sw-profile__label">{c.cta.join}</span>
        <span className="sw-profile__handle">
          <bdi>{c.agencies.handle}</bdi>
        </span>
      </span>
      <svg aria-hidden="true" className="sw-profile__chev" viewBox="0 0 20 20">
        <path d="M8 5l5 5-5 5" />
      </svg>
    </a>
  );
}

/** Final: a full-width band that floods from the start edge. */
export function FloodBand({ lang }: { lang: Lang }) {
  const c = siteCopy[lang];
  return (
    <a className="sw-band" href={appUrl(lang, "match")}>
      <span className="sw-band__inner">
        <span className="sw-band__label">{c.cta.match}</span>
        <span className="sw-band__sub">{c.cities.bandSub}</span>
      </span>
      <span aria-hidden="true" className="sw-band__disc">
        <svg viewBox="0 0 20 20">
          <path d="M4 10h11M11 5l5 5-5 5" />
        </svg>
      </span>
    </a>
  );
}

/** Nav: language as a sliding two-position switch. */
export function LangSwitch({ lang }: { lang: Lang }) {
  const c = siteCopy[lang];
  return (
    <a
      aria-label={c.otherLangName}
      className="sw-switch"
      data-lang={lang}
      href={c.otherLangHref}
      hrefLang={lang === "ar" ? "en" : "ar"}
    >
      <span className="sw-switch__knob" aria-hidden="true" />
      <span className="sw-switch__opt" data-on={lang === "ar" || undefined} lang="ar">
        ع
      </span>
      <span className="sw-switch__opt" data-on={lang === "en" || undefined} lang="en">
        EN
      </span>
    </a>
  );
}

export function HeroActions({ lang }: { lang: Lang }) {
  return (
    <>
      <MatchBubble lang={lang} />
      <GridLink lang={lang} />
    </>
  );
}
