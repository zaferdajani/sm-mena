import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversationList } from "@/components/chat/conversation-list";
import { listVisitorConversations } from "@/lib/data/conversations";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { robots: { index: false } };

/** The client's chats with agencies on this device (no account needed). */
export default async function MyChatsPage({ params }: PageProps<"/[locale]/chats">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Chat");
  const visitorId = await getVisitorId();
  const rows = visitorId ? await listVisitorConversations(visitorId) : [];
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">{t("clientTitle")}</h1>
      <ConversationList rows={rows} side="client" empty={t("noClientConversations")} />
    </div>
  );
}
