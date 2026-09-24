import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HirePage, hireCopy } from "@/components/hire/hire-page";
import { priceGuide, realAgencyCount } from "@/lib/data/hire";
import { capitalize } from "@/lib/hire-content";
import { INDEX_MIN_SERVICE, pageMeta } from "@/lib/seo";
import { isServiceKey } from "@/lib/taxonomy";

export async function generateMetadata({ params }: PageProps<"/[locale]/hire/[service]">): Promise<Metadata> {
  const { locale, service } = await params;
  if (!isServiceKey(service)) return {};
  const [{ t, place, search }, price, real] = await Promise.all([hireCopy(locale, service), priceGuide(service), realAgencyCount(service)]);
  return pageMeta({
    locale,
    path: `/hire/${service}`,
    title: capitalize(t("title", { service: search, place })),
    description: price.min !== null ? t("metaDescription", { count: price.agencies, service: search, place, min: price.min }) : t("metaDescriptionNoPrice", { count: price.agencies, service: search, place }),
    // Indexed once real agencies offer the service (lib/seo.ts).
    noindex: real < INDEX_MIN_SERVICE,
  });
}

export default async function HireServicePage({ params }: PageProps<"/[locale]/hire/[service]">) {
  const { locale, service } = await params;
  setRequestLocale(locale);
  if (!isServiceKey(service)) notFound();
  return <HirePage locale={locale} service={service} />;
}
