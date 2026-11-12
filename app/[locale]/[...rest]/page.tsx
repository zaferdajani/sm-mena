import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

// Unknown paths inside a language get that language's 404 page
// (app/[locale]/not-found.tsx) instead of the framework's English default.
// The tab title says the page was not found, not the homepage's title (QA M-04).
export async function generateMetadata({ params }: PageProps<"/[locale]/[...rest]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "NotFound" });
  return { title: t("title"), robots: { index: false, follow: true } };
}

export default function CatchAll() {
  notFound();
}
