"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { MESSAGE_MAX, type ChatMessage } from "@/lib/chat";
import { resolveParticipant } from "@/lib/chat-access";
import { openRequestConversation, sendMessage } from "@/lib/data/conversations";
import { blockConversation, reportConversation } from "@/lib/data/conversation-reports";
import { notifyStaff } from "@/lib/data/staff-notify";
import { rateLimit } from "@/lib/rate-limit";
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

export type ChatSafetyResult = { ok: true } | { error: "invalid" | "forbidden" | "rateLimited" };

const safetySchema = z.object({
  conversationId: z.string().uuid(),
  side: z.enum(["client", "agency"]),
  token: z.string().max(60).optional(),
});
const reportSchema = safetySchema.extend({
  reason: z.enum(["spam", "inappropriate", "misleading", "underage", "other"]),
  details: z.string().trim().max(1000).optional(),
});

/** Report this chat to staff (App Store 1.2). Either side may report. */
export async function reportChatAction(input: z.input<typeof reportSchema>): Promise<ChatSafetyResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { conversationId, side, token, reason, details } = parsed.data;
  const participant = await resolveParticipant(conversationId, side, token, { createVisitor: true });
  if (!participant) return { error: "forbidden" };
  const who = participant.actor.userId ?? participant.actor.visitorId ?? "anon";
  if (!rateLimit(`chat-report:${who}`, 10, 24 * 3600 * 1000)) return { error: "rateLimited" };
  await reportConversation(participant.conversation, reason, details ?? "", { visitorId: participant.actor.visitorId ?? null, userId: participant.actor.userId ?? null });
  await notifyStaff("postReport");
  return { ok: true };
}

/** Block the other side: the chat closes and no new messages are accepted. */
export async function blockChatAction(input: z.input<typeof safetySchema>): Promise<ChatSafetyResult> {
  const parsed = safetySchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const { conversationId, side, token } = parsed.data;
  const participant = await resolveParticipant(conversationId, side, token);
  if (!participant) return { error: "forbidden" };
  await blockConversation(participant.conversation, participant.actor.userId ?? null);
  return { ok: true };
}
