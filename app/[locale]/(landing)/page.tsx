import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Lang } from "@/components/landing/copy";
import { SawwiqPage } from "@/components/landing/sawwiq-page";
import { JsonLd } from "@/components/seo/json-ld";
import { pageMeta } from "@/lib/seo";
import { organizationLd, websiteLd } from "@/lib/structured-data";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Seo" });
  return pageMeta({ locale, path: "", title: t("homeTitle"), absoluteTitle: true, description: t("homeDescription") });
}

/**
 * The front page: the landing site (first built on Higgsfield) with its
 * scroll-driven film, who we help, protected payments, services, trust,
 * agencies and cities. Every call to action opens the app (/feed, /match,
 * /explore, /join).
 */
export default async function LandingPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd(locale)]} />
      <SawwiqPage lang={(locale === "en" ? "en" : "ar") as Lang} />
    </>
  );
}
