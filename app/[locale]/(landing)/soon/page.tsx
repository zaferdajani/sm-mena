import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TeaserView } from "@/components/teaser/teaser-view";
import { accountLink } from "@/lib/account-link";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/soon">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Teaser" });
  return pageMeta({
    locale,
    path: "/soon",
    title: t("metaTitle"),
    absoluteTitle: true,
    description: t("metaDescription"),
  });
}

/** The pre-launch teaser (docs/39); also the front page while "prelaunch_home" is on. */
export default async function SoonPage({ params }: PageProps<"/[locale]/soon">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TeaserView locale={locale} account={await accountLink(locale)} />;
}
