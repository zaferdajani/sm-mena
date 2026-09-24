import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestChat } from "@/components/chat/request-chat";
import { getRequestForVisitor } from "@/lib/data/requests";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { robots: { index: false } };

export default async function MyRequestChatPage({ params }: PageProps<"/[locale]/requests/[id]/chat/[handle]">) {
  const { locale, id, handle } = await params;
  setRequestLocale(locale);
  const data = await getRequestForVisitor(id, await getVisitorId());
  if (!data) {
    const t = await getTranslations("Requests");
    return <p className="px-4 py-20 text-center text-muted-foreground">{t("notFound")}</p>;
  }
  return <RequestChat data={data} handle={handle} backHref={`/requests/${id}`} />;
}
