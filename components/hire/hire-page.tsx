import { BadgeCheck, Compass, MessageCircle } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AgencyAvatar } from "@/components/agency-avatar";
import { ContactLink } from "@/components/post/contact-link";
import { buttonVariants } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { citiesForService, hireCards, priceGuide } from "@/lib/data/hire";
import { formatJod } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { SITE_URL } from "@/lib/site";
import { taxonomy } from "@/lib/taxonomy";
import { whatsappLink } from "@/lib/text";
import { cn } from "@/lib/utils";

function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export async function hireCopy(locale: string, service: string, city?: string) {
  const t = await getTranslations({ locale, namespace: "Hire" });
  const tCity = await getTranslations({ locale, namespace: "Cities" });
  const place = city ? tCity(city) : t("jordan");
  return { t, place, serviceName: serviceLabel(service, locale) };
}

export async function HirePage({ locale, service, city }: { locale: string; service: string; city?: string }) {
  const { t, place, serviceName } = await hireCopy(locale, service, city);
  const tc = await getTranslations("Common");
  const tp = await getTranslations("Post");
  const tCity = await getTranslations("Cities");
  const [cards, price, cities] = await Promise.all([hireCards(service, city), priceGuide(service, city), citiesForService(service)]);
  const category = taxonomy.categories.find((c) => c.services.some((s) => s.key === service));
  const related = category?.services.filter((s) => s.key !== service) ?? [];
  const faqs = [1, 2, 3, 4].map((n) => ({ q: t(`faq${n}q`, { service: serviceName }), a: t(`faq${n}a`) }));
  const pageUrl = `${SITE_URL}/${locale}/hire/${service}${city ? `/${city}` : ""}`;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-10 px-4 py-6 sm:py-10">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: t("title", { service: serviceName, place }),
            url: pageUrl,
            itemListElement: cards.map((a, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/${locale}/a/${a.handle}`, name: a.name })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />

      <header className="space-y-3">
        <nav className="text-xs text-muted-foreground">
          <Link href="/hire" className="hover:underline">{t("indexTitle")}</Link>
          {city && <> · <Link href={`/hire/${service}`} className="hover:underline">{serviceName}</Link></>}
        </nav>
        <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{t("title", { service: serviceName, place })}</h1>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <BadgeCheck className="size-4 text-sky-500" />
          {t("summary", { count: price.agencies, verified: price.verified })}
          {price.min !== null && ` · ${tc("from", { price: formatJod(price.min, locale) })}`}
        </p>
        <Link href={{ pathname: "/explore", query: { service, ...(city ? { city } : {}) } }} className={buttonVariants({ className: "h-10 gap-2" })}>
          <Compass className="size-4" />
          {t("browseWork")}
        </Link>
      </header>

      <section>
        {cards.length ? (
          <ul className="grid gap-4 sm:grid-cols-2" data-testid="hire-cards">
            {cards.map((a) => (
              <li key={a.id} className="flex flex-col rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <AgencyAvatar name={a.name} src={a.avatarUrl} size={52} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/a/${a.handle}`} className="flex items-center gap-1 font-semibold">
                      <span className="truncate">{a.name}</span>
                      {a.isVerified && <VerifiedBadge label={tc("verified")} />}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <span dir="ltr">@{a.handle}</span> · {tCity(a.city)} · {t("posts", { count: a.postCount })}
                    </p>
                    {a.startingPriceJod !== null && <p className="mt-1 text-sm font-semibold">{tc("from", { price: formatJod(a.startingPriceJod, locale) })}</p>}
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
          <div className="rounded-xl border p-6 text-center text-sm text-muted-foreground">
            <p>{t("noAgencies")}</p>
            {city && <Link href={`/hire/${service}`} className="mt-2 inline-block font-medium text-brand">{t("seeAllJordan")}</Link>}
          </div>
        )}
      </section>

      <section className="rounded-xl bg-muted p-5">
        <h2 className="text-lg font-bold">{t("priceTitle", { service: serviceName, place })}</h2>
        {price.min !== null && price.max !== null && price.median !== null ? (
          <>
            <p className="mt-2 text-sm leading-relaxed">{t("priceBody", { count: price.n, min: price.min, max: price.max, median: price.median })}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
              {([["priceMin", price.min], ["priceMedian", price.median], ["priceMax", price.max]] as const).map(([k, v]) => (
                <div key={k} className="flex flex-col-reverse rounded-lg bg-background p-3">
                  <dt className="text-xs text-muted-foreground">{t(k)}</dt>
                  <dd className="text-lg font-bold">{formatJod(v, locale)}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="mt-2 text-sm">{t("priceNone")}</p>
        )}
      </section>

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
            <h2 className="mb-2 text-sm font-semibold">{t("relatedCities", { service: serviceName })}</h2>
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
                  <Link href={`/hire/${s.key}${city ? `/${city}` : ""}`} className="inline-block rounded-full border px-3 py-1 text-sm hover:bg-muted">
                    {serviceLabel(s.key, locale)}
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
