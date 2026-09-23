import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { HirePage, hireCopy } from "@/components/hire/hire-page";
import { priceGuide } from "@/lib/data/hire";
import { isServiceKey } from "@/lib/taxonomy";

export async function generateMetadata({ params }: PageProps<"/[locale]/hire/[service]">): Promise<Metadata> {
  const { locale, service } = await params;
  if (!isServiceKey(service)) return {};
  const [{ t, place, serviceName }, price] = await Promise.all([hireCopy(locale, service), priceGuide(service)]);
  return {
    title: t("title", { service: serviceName, place }),
    description: t("metaDescription", { count: price.agencies, service: serviceName, place, min: price.min ?? "—" }),
    alternates: { canonical: `/${locale}/hire/${service}`, languages: { ar: `/ar/hire/${service}`, en: `/en/hire/${service}` } },
  };
}

export default async function HireServicePage({ params }: PageProps<"/[locale]/hire/[service]">) {
  const { locale, service } = await params;
  setRequestLocale(locale);
  if (!isServiceKey(service)) notFound();
  return <HirePage locale={locale} service={service} />;
}
