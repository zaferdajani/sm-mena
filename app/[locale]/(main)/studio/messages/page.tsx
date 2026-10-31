import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversationList } from "@/components/chat/conversation-list";
import { requireAgency } from "@/lib/auth/guards";
import { listAgencyConversations } from "@/lib/data/conversations";
import { Link } from "@/i18n/navigation";

export default async function StudioMessagesPage({ params }: PageProps<"/[locale]/studio/messages">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const [t, ts] = await Promise.all([getTranslations("Chat"), getTranslations("Studio")]);
  const rows = await listAgencyConversations(agency.id);
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground" data-testid="chats-intro">
        {t("studioIntro")}{" "}
        <Link href="/studio/inbox" className="font-medium text-brand underline underline-offset-4">{ts("inbox")}</Link>
      </p>
      <p className="text-xs text-muted-foreground">{t("notice")}</p>
      <ConversationList rows={rows} side="agency" empty={t("noConversations")} />
    </div>
  );
}
