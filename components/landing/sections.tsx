/* eslint-disable @next/next/no-img-element -- landing images are pre-sized WebP/PNG files with explicit dimensions and lazy loading */
/* Page sections that follow the scroll journey. Chrome is bespoke per section. */
import { CountryPicker } from "@/components/country-picker";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { FloodBand, Icon, LangSwitch, ProfileRingCard, StarReadout } from "./ctas";
import { MilestoneLedger } from "./ledger";
import { appUrl, landingCopy, siteCopy, type Lang, type WhoItem } from "./copy";

export function SiteHeader({ lang, country, chosen }: { lang: Lang; country: CountryCode; chosen: boolean }) {
  const c = siteCopy[lang];
  return (
    <header className="sw-header">
      <a className="sw-header__brand" href={`/${lang}`}>
        <img alt="" height={32} src="/assets/brand/mark.png" width={32} />
        <span>{c.brand}</span>
      </a>
      <nav aria-label={lang === "ar" ? "أقسام الصفحة" : "Page sections"} className="sw-header__nav">
        {c.nav.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="sw-header__tools">
        <CountryPicker
          chosen={chosen}
          current={country}
          label={c.country.label}
          locateLabel={c.country.locate}
          options={COUNTRIES.map((x) => ({ code: x.code, name: lang === "ar" ? x.ar : x.en, flag: x.flag }))}
          variant="landing"
        />
        <LangSwitch lang={lang} />
      </div>
    </header>
  );
}

export function PaymentsSection({ lang, country }: { lang: Lang; country: CountryCode }) {
  const p = landingCopy(lang, country).payments;
  return (
    <section aria-labelledby="payments-title" className="sw-pay" id="payments">
      <div className="sw-pay__text">
        <p className="sw-eyebrow">{p.eyebrow}</p>
        <h2 className="sw-h2" id="payments-title">
          {p.title}
        </h2>
        <p className="sw-lead">{p.body}</p>
        <ul className="sw-pay__points">
          {p.points.map((pt) => (
            <li key={pt.title}>
              <Icon name={pt.icon} />
              <div>
                <h3>{pt.title}</h3>
                <p>{pt.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="sw-pay__direct">{p.direct}</p>
      </div>
      <div className="sw-pay__panel">
        <MilestoneLedger country={country} lang={lang} />
      </div>
    </section>
  );
}

function BizCard({ item, lang }: { item: WhoItem; lang: Lang }) {
  return (
    <a className="sw-biz" href={appUrl(lang, `explore?service=${item.service}`)}>
      <img alt="" className="sw-biz__img" height={1024} loading="lazy" src={`/assets/photos/${item.photo}.webp`} width={768} />
      <span className="sw-biz__text">
        <span className="sw-biz__title">{item.title}</span>
        <span className="sw-biz__example">{item.example}</span>
      </span>
      <span className="sw-biz__tag">
        <span>{item.serviceLabel}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20">
          <path d="M4 10h11M11 5l5 5-5 5" />
        </svg>
      </span>
    </a>
  );
}

export function WhoSection({ lang, country }: { lang: Lang; country: CountryCode }) {
  const w = landingCopy(lang, country).who;
  return (
    <section aria-labelledby="who-title" className="sw-who" id="who">
      <div className="sw-who__head">
        <h2 className="sw-h2" id="who-title">
          {w.title}
        </h2>
        <p className="sw-lead">{w.sub}</p>
      </div>
      <div aria-labelledby="who-health" className="sw-who__group sw-who__group--health" role="group">
        <div className="sw-who__grouphead">
          <h3 className="sw-who__grouptitle" id="who-health">
            <Icon name="shield" />
            {w.healthTitle}
          </h3>
          <p className="sw-who__note">{w.healthNote}</p>
        </div>
        <ul className="sw-who__row">
          {w.health.map((item) => (
            <li className="sw-who__cell" key={item.slug}>
              <BizCard item={item} lang={lang} />
            </li>
          ))}
        </ul>
      </div>
      <div aria-labelledby="who-general" className="sw-who__group" role="group">
        <div className="sw-who__grouphead">
          <h3 className="sw-who__grouptitle" id="who-general">
            {w.generalTitle}
          </h3>
        </div>
        <ul className="sw-who__grid">
          {w.items.map((item) => (
            <li className="sw-who__cell" key={item.slug}>
              <BizCard item={item} lang={lang} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ServicesSection({ lang }: { lang: Lang }) {
  const s = siteCopy[lang].services;
  return (
    <section aria-labelledby="services-title" className="sw-svc" id="services">
      <div className="sw-svc__head">
        <h2 className="sw-h2" id="services-title">
          {s.title}
        </h2>
        <p className="sw-lead">{s.sub}</p>
      </div>
      <ul className="sw-svc__list">
        {s.rows.map((row) => (
          <li key={row.slug}>
            <a className="sw-svc__row" href={appUrl(lang, `explore?service=${row.slug}`)}>
              <Icon className="sw-svc__icon" name={row.icon} />
              <span className="sw-svc__title">{row.title}</span>
              <span className="sw-svc__items">{row.items}</span>
              <span aria-hidden="true" className="sw-svc__route">
                <svg viewBox="0 0 20 20">
                  <path d="M4 10h11M11 5l5 5-5 5" />
                </svg>
              </span>
              <img alt="" className="sw-svc__peek" height={300} loading="lazy" src={`/assets/photos/${row.photo}.webp`} width={400} />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrustSection({ lang, country }: { lang: Lang; country: CountryCode }) {
  const t = landingCopy(lang, country).trust;
  return (
    <section aria-labelledby="trust-title" className="sw-trust" id="trust">
      <h2 className="sw-h2 sw-trust__title" id="trust-title">
        {t.title}
      </h2>
      <div className="sw-bento">
        <article className="sw-bento__review">
          <span className="sw-tag">{t.example}</span>
          <img alt="" className="sw-bento__face" height={128} loading="lazy" src="/assets/photos/review.webp" width={128} />
          <div className="sw-bento__reviewbody">
            <p aria-hidden="true" className="sw-bento__stars">★★★★★</p>
            <blockquote>
              <p>{lang === "ar" ? `«${t.review.quote}»` : `“${t.review.quote}”`}</p>
            </blockquote>
            <p className="sw-bento__who">{t.review.name}</p>
            <p className="sw-bento__badge">
              <Icon name="review" />
              {t.review.badge}
            </p>
            <p className="sw-bento__note">{t.review.note}</p>
            <StarReadout lang={lang} />
          </div>
        </article>
        <article className="sw-bento__rating">
          <span className="sw-tag">{t.example}</span>
          <p className="sw-bento__numeral">
            <bdi>4.8</bdi>
          </p>
          <div>
            <p className="sw-bento__ratinglabel">{t.rating.label}</p>
            <p aria-hidden="true" className="sw-bento__stars">★★★★★</p>
            <p className="sw-bento__caption">{t.rating.caption}</p>
          </div>
        </article>
        <figure className="sw-bento__photo sw-bento__photo--contract">
          <img alt="" height={900} loading="lazy" src="/assets/photos/contract.webp" width={1200} />
          <figcaption>
            <Icon name="contract" />
            <span>
              <strong>{t.contract.title}</strong>
              {t.contract.body}
            </span>
          </figcaption>
        </figure>
        <figure className="sw-bento__photo sw-bento__photo--team">
          <img alt="" height={900} loading="lazy" src="/assets/photos/team.webp" width={1200} />
          <figcaption>
            <Icon name="shield" />
            <span>
              <strong>{t.team.title}</strong>
              {t.team.body}
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export function AgenciesSection({ lang, country }: { lang: Lang; country: CountryCode }) {
  const a = landingCopy(lang, country).agencies;
  return (
    <section aria-labelledby="agencies-title" className="sw-agency" id="agencies">
      <div className="sw-agency__frame">
        <img alt="" height={1400} loading="lazy" src="/assets/photos/agency.webp" width={1050} />
      </div>
      <div className="sw-agency__text">
        <h2 className="sw-h2" id="agencies-title">
          {a.title}
        </h2>
        <p className="sw-lead">{a.body}</p>
        <ul className="sw-agency__rail">
          {a.features.map((f) => (
            <li key={f.text}>
              <Icon name={f.icon} />
              {f.text}
            </li>
          ))}
        </ul>
        <ProfileRingCard lang={lang} />
      </div>
    </section>
  );
}

export function CitiesSection({ lang, country }: { lang: Lang; country: CountryCode }) {
  const c = landingCopy(lang, country).cities;
  return (
    <section aria-labelledby="cities-title" className="sw-cities" id="cities">
      <h2 className="sw-cities__title" id="cities-title">
        {c.title}
      </h2>
      <ul className="sw-cities__list">
        {c.list.map((city) => (
          <li key={city.slug}>
            <a className="sw-city" href={appUrl(lang, `explore?city=${city.slug}`)}>
              <span className="sw-city__name">{city.name}</span>
              <span className="sw-city__alt">{city.alt}</span>
            </a>
          </li>
        ))}
      </ul>
      <FloodBand lang={lang} />
    </section>
  );
}

export function SiteFooter({ lang, country }: { lang: Lang; country: CountryCode }) {
  const f = landingCopy(lang, country).footer;
  const c = siteCopy[lang];
  return (
    <footer className="sw-footer">
      <div className="sw-footer__brand">
        <img alt="" height={36} loading="lazy" src="/assets/brand/mark.png" width={36} />
        <div>
          <p className="sw-footer__name">{c.brand}</p>
          <p className="sw-footer__tagline">{f.tagline}</p>
        </div>
      </div>
      <nav aria-label={lang === "ar" ? "روابط" : "Links"} className="sw-footer__links">
        {f.links.map((l) => (
          <a href={appUrl(lang, l.href)} key={l.href}>
            {l.label}
          </a>
        ))}
        <a href={c.otherLangHref} hrefLang={lang === "ar" ? "en" : "ar"}>
          {c.otherLangName}
        </a>
      </nav>
      <p className="sw-footer__rights">{f.rights}</p>
    </footer>
  );
}
