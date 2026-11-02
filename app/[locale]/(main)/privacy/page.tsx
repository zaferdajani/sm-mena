import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PolicyPage } from "@/components/legal/policy-page";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PolicyPrivacy" });
  return pageMeta({ locale, path: "/privacy", title: t("title"), description: t("intro") });
}

export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PolicyPage ns="PolicyPrivacy" sections={6} review={true} />;
}
