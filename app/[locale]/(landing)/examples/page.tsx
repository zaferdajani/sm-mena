import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExampleProfile } from "@/components/registration/example-profile";
import { pageMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: PageProps<"/[locale]/examples">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Registration.examples" });
  return pageMeta({ locale, path: "/examples", title: t("title"), description: t("notice"), noindex: true });
}
export default async function ExamplesPage({ params, searchParams }: PageProps<"/[locale]/examples">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const kind = sp.kind === "freelancer" ? "freelancer" : "agency";
  const tab = sp.tab === "services" || sp.tab === "about" ? sp.tab : "work";
  return <ExampleProfile locale={locale} kind={kind} tab={tab} />;
}
