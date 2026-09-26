import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HirePage, hireCopy } from "@/components/hire/hire-page";
import { countryOfCity, currencyLabel, currencyOf, isCountryCode } from "@/lib/countries";
import { priceGuide, realAgencyCount, type Place } from "@/lib/data/hire";
import { capitalize } from "@/lib/hire-content";
import { INDEX_MIN_CITY, INDEX_MIN_SERVICE, pageMeta } from "@/lib/seo";
import { isServiceKey } from "@/lib/taxonomy";

/** The last segment is a city (/hire/seo/riyadh) or a whole country (/hire/seo/sa). */
function placeOf(segment: string): Place | null {
  if (isCountryCode(segment)) return { country: segment };
  if (countryOfCity(segment)) return { city: segment };
  return null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/hire/[service]/[city]">): Promise<Metadata> {
  const { locale, service, city: segment } = await params;
  const place = placeOf(segment);
  if (!isServiceKey(service) || !place) return {};
  const currency = currencyLabel(currencyOf(place.country ?? countryOfCity(place.city)), locale);
  const [{ t, place: name, search }, price, real] = await Promise.all([hireCopy(locale, service, place), priceGuide(service, place), realAgencyCount(service, place)]);
  return pageMeta({
    locale,
    path: `/hire/${service}/${segment}`,
    title: capitalize(t("title", { service: search, place: name })),
    description:
      price.range
        ? t("metaDescription", { count: price.agencies, service: search, place: name, min: price.range.min, currency })
        : t("metaDescriptionNoPrice", { count: price.agencies, service: search, place: name }),
    // Country pages are indexed like service pages; a city page only when enough real agencies there make it different from its country page.
    noindex: real < (place.country ? INDEX_MIN_SERVICE : INDEX_MIN_CITY),
    country: place.country ?? countryOfCity(place.city) ?? undefined,
  });
}

export default async function HireServicePlacePage({ params }: PageProps<"/[locale]/hire/[service]/[city]">) {
  const { locale, service, city: segment } = await params;
  setRequestLocale(locale);
  const place = placeOf(segment);
  if (!isServiceKey(service) || !place) notFound();
  return <HirePage locale={locale} service={service} city={place.city} country={place.country} />;
}
