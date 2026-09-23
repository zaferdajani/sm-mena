import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestView } from "@/components/requests/request-view";
import { getRequestByToken } from "@/lib/data/requests";

export const metadata: Metadata = { robots: { index: false } };

export default async function RequestByTokenPage({ params }: PageProps<"/[locale]/r/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const data = await getRequestByToken(token);
  if (!data) {
    const t = await getTranslations("Requests");
    return <p className="px-4 py-20 text-center text-muted-foreground">{t("notFound")}</p>;
  }
  return <RequestView {...data} access={{ token }} />;
}
