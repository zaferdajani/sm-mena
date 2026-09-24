import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SupportForm } from "@/components/support/support-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/support">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Support" });
  return { title: t("title"), robots: { index: false } };
}

export default async function SupportPage({ params, searchParams }: PageProps<"/[locale]/support">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { from, kind } = await searchParams;
  const t = await getTranslations("Support");
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <SupportForm from={typeof from === "string" ? from : ""} kind={kind === "question" || kind === "suggestion" ? kind : "bug"} />
    </div>
  );
}
