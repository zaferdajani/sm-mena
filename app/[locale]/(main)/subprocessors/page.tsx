import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PolicyPage } from "@/components/legal/policy-page";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/subprocessors">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PolicySubprocessors" });
  return pageMeta({ locale, path: "/subprocessors", title: t("title"), description: t("intro") });
}

export default async function Page({ params }: PageProps<"/[locale]/subprocessors">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PolicyPage ns="PolicySubprocessors" sections={8} review={true} />;
}
