import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestChat } from "@/components/chat/request-chat";
import { getRequestByToken } from "@/lib/data/requests";

export const metadata: Metadata = { robots: { index: false } };

export default async function RequestChatByTokenPage({ params }: PageProps<"/[locale]/r/[token]/chat/[handle]">) {
  const { locale, token, handle } = await params;
  setRequestLocale(locale);
  const data = await getRequestByToken(token);
  if (!data) {
    const t = await getTranslations("Requests");
    return <p className="px-4 py-20 text-center text-muted-foreground">{t("notFound")}</p>;
  }
  return <RequestChat data={data} handle={handle} token={token} backHref={`/r/${token}`} />;
}
