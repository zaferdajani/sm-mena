import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { conversations, reports, type Conversation } from "@/lib/db/schema";
import { audit } from "./agencies";

// Report and block inside a chat (App Store guideline 1.2). Messages are never
// edited or deleted (docs/23); a report points staff at the conversation, and a
// block closes it for both sides until support reopens it.

export type ChatReportReason = "spam" | "inappropriate" | "misleading" | "underage" | "other";

export async function reportConversation(conversation: Conversation, reason: ChatReportReason, details: string, reporter: { visitorId: string | null; userId: string | null }) {
  const db = await getDb();
  const [row] = await db
    .insert(reports)
    .values({ conversationId: conversation.id, agencyId: conversation.agencyId, reason, details, visitorId: reporter.visitorId })
    .returning({ id: reports.id });
  await audit(reporter.userId, "chat.reported", "conversation", conversation.id, { reason });
  return row;
}

/** Closes the chat so the other side can no longer write. Returns false when it was not open. */
export async function blockConversation(conversation: Conversation, actorUserId: string | null) {
  const db = await getDb();
  const [row] = await db.update(conversations).set({ status: "blocked" }).where(eq(conversations.id, conversation.id)).returning({ id: conversations.id });
  if (row) await audit(actorUserId, "chat.blocked", "conversation", conversation.id, {});
  return Boolean(row);
}
