import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversationList } from "@/components/chat/conversation-list";
import { requireAgency } from "@/lib/auth/guards";
import { listAgencyConversations } from "@/lib/data/conversations";

export default async function StudioMessagesPage({ params }: PageProps<"/[locale]/studio/messages">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Chat");
  const rows = await listAgencyConversations(agency.id);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("notice")}</p>
      <ConversationList rows={rows} side="agency" empty={t("noConversations")} />
    </div>
  );
}
