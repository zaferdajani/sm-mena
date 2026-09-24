import "server-only";
import type { ChatSide } from "@/lib/chat";
import { getCurrentAgency, getSessionUser } from "@/lib/auth/session";
import { conversationForAgency, conversationForClient, type Actor } from "@/lib/data/conversations";
import type { Recipient } from "@/lib/data/notifications";
import type { Conversation } from "@/lib/db/schema";
import { getVisitorId } from "@/lib/visitor";

/**
 * Who is reading or writing a conversation, checked on every call:
 * - agency: the signed-in agency that owns the conversation;
 * - client: the device that posted the request or inquiry (visitor cookie),
 *   or the holder of the request's private link (token).
 */
export async function resolveParticipant(
  conversationId: string,
  side: ChatSide,
  token?: string | null,
  { createVisitor = false } = {},
): Promise<{ conversation: Conversation; actor: Actor } | null> {
  if (side === "agency") {
    const [user, agency] = await Promise.all([getSessionUser(), getCurrentAgency()]);
    if (!user || !agency) return null;
    const conversation = await conversationForAgency(agency.id, conversationId);
    return conversation ? { conversation, actor: { userId: user.id } } : null;
  }
  const visitorId = await getVisitorId({ create: createVisitor });
  const conversation = await conversationForClient(conversationId, { visitorId, token });
  return conversation ? { conversation, actor: { visitorId } } : null;
}

/** Whose notifications the current browser shows: the signed-in agency, else this device. */
export async function currentRecipient(): Promise<{ recipient: Recipient; kind: "agency" | "visitor" } | null> {
  const agency = await getCurrentAgency();
  if (agency) return { recipient: { agencyId: agency.id }, kind: "agency" };
  const visitorId = await getVisitorId();
  return visitorId ? { recipient: { visitorId }, kind: "visitor" } : null;
}
