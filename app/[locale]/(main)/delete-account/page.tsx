import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PolicyPage } from "@/components/legal/policy-page";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/delete-account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PolicyDelete" });
  return pageMeta({ locale, path: "/delete-account", title: t("title"), description: t("intro") });
}

export default async function Page({ params }: PageProps<"/[locale]/delete-account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PolicyPage ns="PolicyDelete" sections={4} review={false} />;
}
