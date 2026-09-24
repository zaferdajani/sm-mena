import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HirePage, hireCopy } from "@/components/hire/hire-page";
import { priceGuide, realAgencyCount } from "@/lib/data/hire";
import { capitalize } from "@/lib/hire-content";
import { INDEX_MIN_CITY, pageMeta } from "@/lib/seo";
import { CITIES } from "@/lib/labels";
import { isServiceKey } from "@/lib/taxonomy";

const isCity = (c: string) => (CITIES as readonly string[]).includes(c);

export async function generateMetadata({ params }: PageProps<"/[locale]/hire/[service]/[city]">): Promise<Metadata> {
  const { locale, service, city } = await params;
  if (!isServiceKey(service) || !isCity(city)) return {};
  const [{ t, place, search }, price, real] = await Promise.all([hireCopy(locale, service, city), priceGuide(service, city), realAgencyCount(service, city)]);
  return pageMeta({
    locale,
    path: `/hire/${service}/${city}`,
    title: capitalize(t("title", { service: search, place })),
    description: price.min !== null ? t("metaDescription", { count: price.agencies, service: search, place, min: price.min }) : t("metaDescriptionNoPrice", { count: price.agencies, service: search, place }),
    // A city page earns its place in search only when enough real agencies there make it different from the Jordan-wide page.
    noindex: real < INDEX_MIN_CITY,
  });
}

export default async function HireServiceCityPage({ params }: PageProps<"/[locale]/hire/[service]/[city]">) {
  const { locale, service, city } = await params;
  setRequestLocale(locale);
  if (!isServiceKey(service) || !isCity(city)) notFound();
  return <HirePage locale={locale} service={service} city={city} />;
}
