"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { MESSAGE_MAX, type ChatMessage } from "@/lib/chat";
import { resolveParticipant } from "@/lib/chat-access";
import { openRequestConversation, sendMessage } from "@/lib/data/conversations";
import { clientIp } from "@/lib/request";

export type ChatSendResult = { message: ChatMessage } | { error: "invalid" | "closed" | "rateLimited" | "forbidden" | "generic" };

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  side: z.enum(["client", "agency"]),
  // Length is checked again (after trimming) by the data layer.
  body: z.string().max(MESSAGE_MAX + 200),
  token: z.string().max(60).optional(),
});

/** Sends a chat message as the client or the agency of a conversation. */
export async function sendChatMessageAction(input: z.input<typeof sendSchema>): Promise<ChatSendResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { conversationId, side, body, token } = parsed.data;
  const participant = await resolveParticipant(conversationId, side, token, { createVisitor: true });
  if (!participant) return { error: "forbidden" };
  try {
    return await sendMessage(participant.conversation, side, body, { ...participant.actor, ip: await clientIp() });
  } catch {
    return { error: "generic" };
  }
}

/** "Message the client" on an opportunity the agency already quoted on. */
export async function openClientChatAction(requestId: string) {
  const { agency } = await requireAgency();
  const locale = await getLocale();
  const conversation = await openRequestConversation(z.string().uuid().parse(requestId), agency.id);
  if (!conversation) return redirect({ href: `/studio/opportunities/${requestId}`, locale });
  return redirect({ href: `/studio/messages/${conversation.id}`, locale });
}
