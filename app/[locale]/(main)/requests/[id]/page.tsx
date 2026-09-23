import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestView } from "@/components/requests/request-view";
import { getRequestForVisitor } from "@/lib/data/requests";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { robots: { index: false } };

export default async function MyRequestPage({ params }: PageProps<"/[locale]/requests/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const data = await getRequestForVisitor(id, await getVisitorId());
  if (!data) {
    const t = await getTranslations("Requests");
    return <p className="px-4 py-20 text-center text-muted-foreground">{t("notFound")}</p>;
  }
  return <RequestView {...data} access={{ requestId: id }} />;
}
