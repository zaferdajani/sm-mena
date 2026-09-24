import { getLocale, getTranslations } from "next-intl/server";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatThread } from "@/components/chat/thread";
import { loadThread, openRequestConversation } from "@/lib/data/conversations";
import type { getRequestByToken } from "@/lib/data/requests";
import { serviceLabel } from "@/lib/labels";

type RequestData = NonNullable<Awaited<ReturnType<typeof getRequestByToken>>>;

/**
 * The client's chat with one agency that quoted on their request. Reached from
 * the proposal card, by private link (token) or from the posting device.
 */
export async function RequestChat({ data, handle, token, backHref }: { data: RequestData; handle: string; token?: string; backHref: string }) {
  const t = await getTranslations("Chat");
  const tr = await getTranslations("Requests");
  const locale = await getLocale();
  const proposal = data.proposals.find((p) => p.agency.handle === decodeURIComponent(handle));
  const conversation = proposal ? await openRequestConversation(data.request.id, proposal.agency.id) : null;
  if (!proposal || !conversation) return <p className="px-4 py-20 text-center text-muted-foreground">{tr("notFound")}</p>;
  const thread = await loadThread(conversation, "client");
  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <ChatHeader
        backHref={backHref}
        backLabel={t("back")}
        title={proposal.agency.name}
        subtitle={t("aboutRequest", { services: data.request.services.map((s) => serviceLabel(s, locale)).join(" · ") })}
        avatar={{ name: proposal.agency.name, src: proposal.agency.avatarUrl }}
      />
      <ChatThread conversationId={conversation.id} side="client" token={token} closed={conversation.status !== "open"} {...thread} />
    </div>
  );
}
