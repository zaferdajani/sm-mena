import { protectedPaymentsLive } from "@/lib/payments/readiness";
import { BadgeCheck, Compass, MessageCircle, Sparkles } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { RatingBadge } from "@/components/reviews/stars";
import { ContactLink } from "@/components/post/contact-link";
import { buttonVariants } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { EmptySupply } from "@/components/demo/empty-supply";
import { demoMode } from "@/lib/demo-mode";
import { COUNTRIES, countryName, countryOf, countryOfCity, currencyLabel, currencyOf } from "@/lib/countries";
import { citiesForService, countriesForService, hireCards, packageFacts, priceGuide, type Place } from "@/lib/data/hire";
import { formatJod } from "@/lib/format";
import { capitalize, hireContent, isOnSite, searchPhrase, serviceLinkText } from "@/lib/hire-content";
import { serviceLabel } from "@/lib/labels";
import { SITE_URL } from "@/lib/site";
import { breadcrumbLd, faqLd, hireServiceLd } from "@/lib/structured-data";
import { taxonomy } from "@/lib/taxonomy";
import { whatsappLink } from "@/lib/text";
import { cn } from "@/lib/utils";
import { agencyName } from "@/lib/content-lang";
import { canUse } from "@/lib/feature-gate";
import { ClosestMatches } from "@/components/closest/closest-matches";
import { closestAgencies } from "@/lib/matching/closest";

export async function hireCopy(locale: string, service: string, where: Place = {}) {
  const t = await getTranslations({ locale, namespace: "Hire" });
  const tCity = await getTranslations({ locale, namespace: "Cities" });
  const place = where.city ? tCity(where.city) : where.country ? countryName(where.country, locale) : t("region");
  // Titles and headings use the phrase people search; the catalogue name stays in the chips.
  return { t, place, serviceName: serviceLabel(service, locale), search: searchPhrase(service, locale), content: hireContent(service, locale) };
}

/**
 * A service in a place: a city (/hire/seo/riyadh), a country (/hire/seo/sa)
 * or every country Sawwiq serves (/hire/seo). Prices only make sense within
 * one country (one currency), so the region page lists countries instead.
 */
export async function HirePage({ locale, service, city, country: countryParam }: { locale: string; service: string; city?: string; country?: string }) {
  const where: Place = city ? { city } : countryParam ? { country: countryParam } : {};
  const country = countryParam ?? countryOfCity(city) ?? undefined;
  const currency = currencyOf(country);
  const { t, place, search, content } = await hireCopy(locale, service, where);
  const tc = await getTranslations("Common");
  const tp = await getTranslations("Post");
  const tr = await getTranslations("Requests");
  const tCity = await getTranslations("Cities");
  const td = await getTranslations("Demo");
  const includeDemo = await demoMode();
  const canRequest = await canUse("quote_requests");
  const [cards, price, cities, facts, byCountry] = await Promise.all([
    hireCards(service, where, { includeDemo }),
    priceGuide(service, where),
    country ? citiesForService(service, country) : Promise.resolve([]),
    country ? packageFacts(service, where) : Promise.resolve(null),
    country ? Promise.resolve([]) : countriesForService(service),
  ]);
  const category = taxonomy.categories.find((c) => c.services.some((s) => s.key === service));
  const related = category?.services.filter((s) => s.key !== service) ?? [];
  // Two questions written for this service, then the two about Sawwiq itself
  // (the same answers on every page would be a duplicate-content smell).
  const shared = [2, 3, ...(city && isOnSite(service) ? [4] : [])];
  const faqs = [
    ...(content?.faq ?? [{ q: t("faq1q", { service: search }), a: t("faq1a") }]),
    // The payments answer follows the readiness switch (lib/payments/readiness.ts).
    ...shared.map((n) => ({ q: t(`faq${n}q`, { service: search }), a: t(n === 3 && !protectedPaymentsLive() ? "faq3aTest" : `faq${n}a`) })),
  ];
  const title = capitalize(t("title", { service: search, place }));
  const placePath = city ?? countryParam;
  const pageUrl = `${SITE_URL}/${locale}/hire/${service}${placePath ? `/${placePath}` : ""}`;
  // Structured data, counts and prices only ever describe real agencies (docs/31).
  const real = cards.filter((a) => !a.isDemo);
  // No agency here offers it: the closest ones (another city, a similar service), with what differs (docs/35).
  const closest = !cards.length && country ? await closestAgencies({ services: [service], city: city ?? null, country }, { includeDemo }) : null;
  const range = country ? price.range : null;
  const priceDate = price.updatedAt ? new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { month: "long", year: "numeric" }).format(price.updatedAt) : "";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-6 sm:py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: title,
            url: pageUrl,
            numberOfItems: real.length,
            itemListElement: real.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/${locale}/a/${a.handle}`, name: agencyName(a, locale) })),
          },
          hireServiceLd({
            locale,
            url: pageUrl,
            name: title,
            serviceName: search,
            place,
            city: Boolean(city),
            country: country ? countryOf(country).en : null,
            // Prices only from real agencies' published prices, and only with enough of them.
            offers: range ? { min: range.min, max: range.max, count: range.n, currency } : null,
          }),
          breadcrumbLd([
            { name: t("indexTitle"), path: `/${locale}/hire` },
            { name: capitalize(search), path: `/${locale}/hire/${service}` },
            ...(country ? [{ name: countryName(country, locale), path: `/${locale}/hire/${service}/${country}` }] : []),
            ...(city ? [{ name: place, path: `/${locale}/hire/${service}/${city}` }] : []),
          ]),
          faqLd(faqs),
        ]}
      />

      <header className="space-y-3">
        <nav className="text-xs text-muted-foreground">
          <Link href="/hire" className="hover:underline">{t("indexTitle")}</Link>
          {placePath && <> · <Link href={`/hire/${service}`} className="hover:underline">{capitalize(search)}</Link></>}
          {city && country && <> · <Link href={`/hire/${service}/${country}`} className="hover:underline">{countryName(country, locale)}</Link></>}
        </nav>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
        {content && <p className="max-w-2xl leading-relaxed text-muted-foreground">{content.intro}</p>}
        {price.agencies > 0 && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <BadgeCheck className="size-4 text-sky-500" />
            {t("summary", { count: price.agencies, verified: price.verified })}
            {range && ` · ${tc("from", { price: formatJod(range.min, locale, currency) })}`}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {canRequest && (
            <Link href={{ pathname: "/request/new", query: { service, ...(city ? { city } : {}) } }} className={buttonVariants({ className: "h-10 gap-2" })} data-testid="hire-get-quotes">
              <Sparkles className="size-4" />
              {tr("formTitle")}
            </Link>
          )}
          <Link href={{ pathname: "/explore", query: { service, ...(city ? { city } : {}) } }} className={buttonVariants({ variant: "outline", className: "h-10 gap-2" })}>
            <Compass className="size-4" />
            {t("browseWork")}
          </Link>
        </div>
      </header>

      <section>
        {cards.length ? (
          <ul className="grid gap-4 sm:grid-cols-2" data-testid="hire-cards">
            {cards.map((a) => (
              <li key={a.id} className="flex flex-col rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <AgencyAvatar name={agencyName(a, locale)} src={a.avatarUrl} size={52} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/a/${a.handle}`} className="flex items-center gap-1 font-semibold">
                      <span className="truncate">{agencyName(a, locale)}</span>
                      {a.isVerified && <VerifiedBadge label={tc("verified")} />}
                      {a.isDemo && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100" data-testid="demo-badge">{td("badge")}</span>}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <span dir="ltr">@{a.handle}</span> · {countryOf(a.country).flag} {tCity(a.city)} · {t("posts", { count: a.postCount })}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3">
                      {a.ratingAverage !== null && <RatingBadge average={a.ratingAverage} count={a.ratingCount} />}
                      {a.googleRating !== null && <RatingBadge average={a.googleRating} count={a.googleRatingCount ?? 0} label="Google" />}
                    </div>
                    {a.startingPriceJod !== null && <p className="mt-1 text-sm font-semibold">{tc("from", { price: formatJod(a.startingPriceJod, locale, currencyOf(a.country)) })}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.services.slice(0, 4).map((s) => (
                    <span key={s} className={`rounded-full px-2 py-0.5 text-[11px] ${s === service ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"}`}>
                      {serviceLabel(s, locale)}
                    </span>
                  ))}
                </div>
                {a.thumbs.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-1 overflow-hidden rounded-lg">
                    {a.thumbs.map((th) => (
                      <Link key={th.postId} href={`/p/${th.postId}`} className="relative aspect-square" style={{ backgroundColor: th.color }}>
                        <Image src={th.url} alt="" fill unoptimized sizes="120px" className="object-cover" />
                      </Link>
                    ))}
                  </div>
                )}
                <div className="mt-auto flex gap-2 pt-3">
                  <Link href={`/a/${a.handle}`} className={buttonVariants({ variant: "outline", className: "h-9 flex-1" })}>
                    {t("viewProfile")}
                  </Link>
                  {a.whatsapp && (
                    <ContactLink
                      agencyId={a.id}
                      channel="whatsapp"
                      href={whatsappLink(a.whatsapp, `${tp("whatsappMessage")} ${SITE_URL}/${locale}/a/${a.handle}`)}
                      className={cn(buttonVariants(), "h-9 flex-1 gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]")}
                    >
                      <MessageCircle className="size-4" />
                      {tp("whatsapp")}
                    </ContactLink>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          closest && closest.length ? (
            <ClosestMatches
              matches={closest}
              currency={currency}
              viewCountry={country!}
              variant="hire"
              sendHref={canRequest ? { pathname: "/request/new", query: { service, ...(city ? { city } : {}) } } : null}
            />
          ) : (
          <div className="rounded-xl border">
            <EmptySupply text={t("noAgencies")}>
              {city && country && (
                <Link href={`/hire/${service}/${country}`} className="mt-3 inline-block text-sm font-medium text-brand">
                  {countryName(country, locale)}
                </Link>
              )}
            </EmptySupply>
          </div>
          )
        )}
      </section>

      {content && (
        <section className="grid gap-5 sm:grid-cols-[3fr_2fr]" data-testid="hire-included">
          <div>
            <h2 className="mb-3 text-lg font-bold">{t("includedTitle", { service: search })}</h2>
            <ul className="grid gap-2 text-sm">
              {content.includes.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <aside className="rounded-xl border p-4 text-sm">
            <h3 className="mb-1 font-semibold">{t("notForTitle")}</h3>
            <p className="leading-relaxed text-muted-foreground">{content.notFor}</p>
          </aside>
        </section>
      )}

      {!country && (
        <section className="rounded-xl bg-muted p-5" data-testid="hire-countries">
          <h2 className="text-lg font-bold">{t("pickCountry", { service: search })}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {COUNTRIES.map((c) => {
              const n = byCountry.find((x) => x.country === c.code)?.n ?? 0;
              return (
                <li key={c.code}>
                  <Link href={`/hire/${service}/${c.code}`} className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-muted">
                    <span aria-hidden="true">{c.flag}</span>
                    {locale === "ar" ? c.ar : c.en}
                    <span className="text-xs text-muted-foreground">({n})</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {country && (
      <section className="rounded-xl bg-muted p-5">
        <h2 className="text-lg font-bold">{t("priceTitle", { service: search, place })}</h2>
        {range ? (
          <>
            <p className="mt-2 text-sm leading-relaxed">{t("priceBody", { count: range.n, min: range.min, max: range.max, median: range.median, currency: currencyLabel(currency, locale) })}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              {([["priceMin", range.min], ["priceMedian", range.median], ["priceMax", range.max]] as const).map(([k, v]) => (
                <div key={k} className="flex flex-col-reverse rounded-lg bg-background p-3">
                  <dt className="text-xs text-muted-foreground">{t(k)}</dt>
                  <dd className="text-lg font-bold">{formatJod(v, locale, currency)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground" data-testid="price-label">{t("priceLabel", { count: range.n, date: priceDate })}</p>
          </>
        ) : (
          <p className="mt-2 text-sm" data-testid="price-none">{price.n ? t("priceTooFew") : t("priceNone")}</p>
        )}
        {facts && (
          <p className="mt-4 text-sm leading-relaxed" data-testid="package-facts">
            {facts.monthly && t("packagesMonthly", { count: facts.count, min: facts.monthly.min, median: facts.monthly.median, max: facts.monthly.max, currency: currencyLabel(currency, locale) })}{" "}
            {facts.oneOff && t("packagesOneOff", { min: facts.oneOff.min, max: facts.oneOff.max, currency: currencyLabel(currency, locale) })}{" "}
            {facts.deliveryDays && t("packagesDelivery", { days: facts.deliveryDays })}
          </p>
        )}
        {content && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{content.priceDrivers}</p>}
      </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">{t("howTitle")}</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li key={n} className="rounded-xl border p-4 text-sm">
              <span className="mb-2 flex size-7 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">{n}</span>
              {t(`how${n}`)}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t("faqTitle")}</h2>
        <div className="divide-y rounded-xl border">
          {faqs.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer list-none font-medium">{f.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        {cities.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">{t("relatedCities", { service: search })}</h2>
            <ul className="flex flex-wrap gap-2">
              {cities.filter((c) => c.city !== city).map((c) => (
                <li key={c.city}>
                  <Link href={`/hire/${service}/${c.city}`} className="inline-block rounded-full border px-3 py-1 text-sm hover:bg-muted">
                    {tCity(c.city)} ({c.n})
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {related.length > 0 && (
          <div>
            <h2 className="mb-2 text-sm font-semibold">{t("relatedServices")}</h2>
            <ul className="flex flex-wrap gap-2">
              {related.map((s) => (
                <li key={s.key}>
                  <Link href={`/hire/${s.key}${placePath ? `/${placePath}` : ""}`} className="inline-block rounded-full border px-3 py-1 text-sm hover:bg-muted">
                    {serviceLinkText(s.key, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <p className="text-center text-sm">
        <Link href="/join" className="font-medium text-brand">{t("forAgencies")}</Link>
      </p>
    </div>
  );
}
