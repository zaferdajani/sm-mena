import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HirePage, hireCopy } from "@/components/hire/hire-page";
import { priceGuide } from "@/lib/data/hire";
import { CITIES } from "@/lib/labels";
import { isServiceKey } from "@/lib/taxonomy";

const isCity = (c: string) => (CITIES as readonly string[]).includes(c);

export async function generateMetadata({ params }: PageProps<"/[locale]/hire/[service]/[city]">): Promise<Metadata> {
  const { locale, service, city } = await params;
  if (!isServiceKey(service) || !isCity(city)) return {};
  const [{ t, place, serviceName }, price] = await Promise.all([hireCopy(locale, service, city), priceGuide(service, city)]);
  return {
    title: t("title", { service: serviceName, place }),
    description: t("metaDescription", { count: price.agencies, service: serviceName, place, min: price.min ?? "—" }),
    alternates: { canonical: `/${locale}/hire/${service}/${city}`, languages: { ar: `/ar/hire/${service}/${city}`, en: `/en/hire/${service}/${city}` } },
    // thin pages (no agencies yet) stay out of the index until they have content
    robots: price.agencies === 0 ? { index: false } : undefined,
  };
}

export default async function HireServiceCityPage({ params }: PageProps<"/[locale]/hire/[service]/[city]">) {
  const { locale, service, city } = await params;
  setRequestLocale(locale);
  if (!isServiceKey(service) || !isCity(city)) notFound();
  return <HirePage locale={locale} service={service} city={city} />;
}
