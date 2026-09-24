import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatThread } from "@/components/chat/thread";
import { Link } from "@/i18n/navigation";
import { conversationForClient, loadThread, threadContext } from "@/lib/data/conversations";
import { serviceLabel } from "@/lib/labels";
import { mediaUrl } from "@/lib/storage";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { robots: { index: false } };

export default async function ClientChatPage({ params }: PageProps<"/[locale]/chats/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Chat");
  const conversation = await conversationForClient(id, { visitorId: await getVisitorId() });
  const context = conversation ? await threadContext(conversation) : null;
  const agency = context?.agency;
  if (!conversation || !agency) {
    const tr = await getTranslations("Requests");
    return <p className="px-4 py-20 text-center text-muted-foreground">{tr("notFound")}</p>;
  }
  const lang = await getLocale();
  const request = context?.request ?? null;
  const subtitle = request ? t("aboutRequest", { services: request.services.map((s) => serviceLabel(s, lang)).join(" · ") }) : null;
  const thread = await loadThread(conversation, "client");
  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <ChatHeader
        backHref="/chats"
        backLabel={t("back")}
        title={agency.name}
        subtitle={subtitle}
        avatar={{ name: agency.name, src: mediaUrl(agency.avatarKey) }}
        action={
          request ? (
            <Link href={`/requests/${request.id}`} className="shrink-0 text-xs text-brand hover:underline">
              {t("viewRequest")}
            </Link>
          ) : null
        }
      />
      <ChatThread conversationId={conversation.id} side="client" closed={conversation.status !== "open"} {...thread} />
    </div>
  );
}
