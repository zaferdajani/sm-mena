import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatThread } from "@/components/chat/thread";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { conversationForAgency, loadThread, markInquiryRead, threadContext } from "@/lib/data/conversations";
import { serviceLabel } from "@/lib/labels";

export default async function StudioThreadPage({ params }: PageProps<"/[locale]/studio/messages/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const conversation = await conversationForAgency(agency.id, id);
  if (!conversation) notFound();
  const t = await getTranslations("Chat");
  const lang = await getLocale();
  const { request } = await threadContext(conversation);
  const [thread] = await Promise.all([loadThread(conversation, "agency"), markInquiryRead(conversation)]);
  const subtitle = request ? t("aboutRequest", { services: request.services.map((s) => serviceLabel(s, lang)).join(" · ") }) : conversation.inquiryId ? t("fromInquiry") : null;
  return (
    <div className="mx-auto max-w-2xl">
      <ChatHeader
        backHref="/studio/messages"
        backLabel={t("back")}
        title={conversation.clientName}
        subtitle={subtitle}
        avatar={{ name: conversation.clientName, src: null }}
        action={
          request ? (
            <Link href={`/studio/opportunities/${request.id}`} className="shrink-0 text-xs text-brand hover:underline">
              {t("viewRequest")}
            </Link>
          ) : conversation.inquiryId ? (
            <Link href="/studio/inbox" className="shrink-0 text-xs text-brand hover:underline">
              {t("viewInquiry")}
            </Link>
          ) : null
        }
      />
      <ChatThread conversationId={conversation.id} side="agency" closed={conversation.status !== "open"} {...thread} />
    </div>
  );
}
