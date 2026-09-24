import "server-only";
import { createHash } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, conversationMessages, conversations, inquiries, projectRequests, proposals, type Conversation, type ConversationMessage, type Inquiry } from "@/lib/db/schema";
import { CHAT_NOTICE_VERSION, messageBodySchema, type ChatMessage, type ChatSide } from "@/lib/chat";
import { notifyNewMessage } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { addNotifications, markConversationNotificationsRead, notifyMessage, type Executor } from "./notifications";
import { hashToken } from "./reviews";

const UUID = /^[0-9a-f-]{36}$/i;
const EMAIL_EVERY_MS = 15 * 60 * 1000;
export const MESSAGE_RETENTION_MONTHS = 24;

/** Pseudonymous sender network address, kept as evidence for disputes. */
const ipHash = (ip: string) => createHash("sha256").update(`sawwiq-chat:${ip}`).digest("hex");

// ---------------------------------------------------------------------------
// Opening a conversation
// ---------------------------------------------------------------------------

/**
 * The conversation between a request's client and one agency. Only exists once
 * the agency sent a proposal: briefs stay anonymous to agencies until then.
 */
export async function openRequestConversation(requestId: string, agencyId: string): Promise<Conversation | null> {
  if (!UUID.test(requestId) || !UUID.test(agencyId)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ proposalId: proposals.id, clientName: projectRequests.clientName, visitorId: projectRequests.visitorId })
    .from(proposals)
    .innerJoin(projectRequests, eq(proposals.requestId, projectRequests.id))
    .where(and(eq(proposals.requestId, requestId), eq(proposals.agencyId, agencyId)));
  if (!row) return null;
  await db
    .insert(conversations)
    .values({ agencyId, requestId, proposalId: row.proposalId, clientVisitorId: row.visitorId, clientName: row.clientName, noticeVersion: CHAT_NOTICE_VERSION })
    .onConflictDoNothing();
  const [conv] = await db.select().from(conversations).where(and(eq(conversations.requestId, requestId), eq(conversations.agencyId, agencyId)));
  return conv ?? null;
}

/**
 * A visitor's inquiry becomes the first message of a conversation, so the
 * agency can answer inside Sawwiq as well as on WhatsApp.
 */
export async function openInquiryConversation(inquiry: Inquiry, ex?: Executor) {
  const db = ex ?? (await getDb());
  const [conv] = await db
    .insert(conversations)
    .values({ agencyId: inquiry.agencyId, inquiryId: inquiry.id, clientVisitorId: inquiry.visitorId, clientName: inquiry.name, noticeVersion: CHAT_NOTICE_VERSION })
    .onConflictDoNothing()
    .returning();
  if (!conv) return null;
  const body = inquiry.message.trim().slice(0, 2000) || "…";
  const [message] = await db
    .insert(conversationMessages)
    .values({ conversationId: conv.id, side: "client", senderVisitorId: inquiry.visitorId, body })
    .returning();
  await db
    .update(conversations)
    .set({ lastMessageId: message.id, lastMessageAt: message.createdAt, clientLastReadId: message.id })
    .where(eq(conversations.id, conv.id));
  await addNotifications([{ agencyId: inquiry.agencyId, kind: "inquiry", href: `/studio/messages/${conv.id}`, params: { name: inquiry.name }, conversationId: conv.id }], db);
  return conv;
}

export async function getConversation(id: string): Promise<Conversation | null> {
  if (!UUID.test(id)) return null;
  const db = await getDb();
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  return conv ?? null;
}

/** The conversation, if this agency is part of it. */
export async function conversationForAgency(agencyId: string, id: string) {
  const conv = await getConversation(id);
  return conv && conv.agencyId === agencyId ? conv : null;
}

/** The conversation, if this browser is its client: the posting device, or the holder of the request's private link. */
export async function conversationForClient(id: string, access: { visitorId: string | null; token?: string | null }) {
  const conv = await getConversation(id);
  if (!conv) return null;
  return (await clientMayAccess(conv, access)) ? conv : null;
}

export async function clientMayAccess(conv: Conversation, access: { visitorId: string | null; token?: string | null }) {
  if (access.visitorId && conv.clientVisitorId === access.visitorId) return true;
  if (access.token && conv.requestId && /^[A-Za-z0-9_-]{20,40}$/.test(access.token)) {
    const db = await getDb();
    const [request] = await db.select({ id: projectRequests.id }).from(projectRequests).where(eq(projectRequests.tokenHash, hashToken(access.token)));
    return request?.id === conv.requestId;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export type Actor = { userId?: string | null; visitorId?: string | null; ip?: string | null };

export type SendResult = { message: ChatMessage } | { error: "invalid" | "closed" | "rateLimited" };

/** Adds a message, moves both cursors and tells the other side (and, throttled, emails the agency). */
export async function sendMessage(conv: Conversation, side: ChatSide, rawBody: string, actor: Actor): Promise<SendResult> {
  const parsed = messageBodySchema.safeParse(rawBody);
  if (!parsed.success) return { error: "invalid" };
  if (conv.status !== "open") return { error: "closed" };
  const who = actor.userId ?? actor.visitorId ?? actor.ip ?? "anon";
  if (!rateLimit(`chat:${side}:${who}:${conv.id}`, 20, 60_000) || !rateLimit(`chat:${actor.ip ?? who}`, 300, 24 * 3600 * 1000)) return { error: "rateLimited" };

  const db = await getDb();
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, conv.agencyId));
  if (!agency) return { error: "closed" };
  const message = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(conversationMessages)
      .values({
        conversationId: conv.id,
        side,
        senderUserId: side === "agency" ? (actor.userId ?? null) : null,
        senderVisitorId: side === "client" ? (actor.visitorId ?? null) : null,
        body: parsed.data,
        ipHash: actor.ip ? ipHash(actor.ip) : null,
      })
      .returning();
    await tx
      .update(conversations)
      .set({
        lastMessageId: sql`greatest(${conversations.lastMessageId}, ${row.id})`,
        lastMessageAt: row.createdAt,
        ...(side === "agency" ? { agencyLastReadId: sql`greatest(${conversations.agencyLastReadId}, ${row.id})` } : { clientLastReadId: sql`greatest(${conversations.clientLastReadId}, ${row.id})` }),
      })
      .where(eq(conversations.id, conv.id));
    if (side === "client") {
      await notifyMessage({ agencyId: conv.agencyId }, conv.id, `/studio/messages/${conv.id}`, { name: conv.clientName }, tx);
    } else if (conv.clientVisitorId) {
      await notifyMessage({ visitorId: conv.clientVisitorId }, conv.id, `/chats/${conv.id}`, { name: agency.name }, tx);
    }
    return row;
  });

  if (side === "client") {
    // Atomic throttle: only the request that moves agency_emailed_at sends the email.
    const claimed = await db
      .update(conversations)
      .set({ agencyEmailedAt: new Date() })
      .where(and(eq(conversations.id, conv.id), sql`(${conversations.agencyEmailedAt} is null or ${conversations.agencyEmailedAt} < ${new Date(Date.now() - EMAIL_EVERY_MS)})`))
      .returning({ id: conversations.id });
    if (claimed.length) await notifyNewMessage(agency, conv).catch(() => {});
  }
  return { message: toChatMessage(message) };
}

export function toChatMessage(m: ConversationMessage): ChatMessage {
  const hidden = m.hiddenAt !== null;
  return { id: m.id, side: m.side, body: hidden ? "" : m.body, hidden, createdAt: m.createdAt.toISOString() };
}

/** Keyset pages: newer than `afterId`, older than `beforeId`, or the latest `limit`. Always oldest first. */
export async function listMessages(conversationId: string, opts: { afterId?: number; beforeId?: number; limit?: number } = {}): Promise<ConversationMessage[]> {
  const db = await getDb();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  if (opts.afterId !== undefined) {
    return db
      .select()
      .from(conversationMessages)
      .where(and(eq(conversationMessages.conversationId, conversationId), gt(conversationMessages.id, opts.afterId)))
      .orderBy(asc(conversationMessages.id))
      .limit(limit);
  }
  const conditions = [eq(conversationMessages.conversationId, conversationId)];
  if (opts.beforeId !== undefined) conditions.push(lt(conversationMessages.id, opts.beforeId));
  const rows = await db
    .select()
    .from(conversationMessages)
    .where(and(...conditions))
    .orderBy(desc(conversationMessages.id))
    .limit(limit);
  return rows.reverse();
}

/** Moves a side's read cursor forward (never back) and clears that side's notifications for the conversation. */
export async function markRead(conv: Conversation, side: ChatSide, upToId: number) {
  const db = await getDb();
  const target = Math.min(upToId, Number.MAX_SAFE_INTEGER);
  const column = side === "agency" ? conversations.agencyLastReadId : conversations.clientLastReadId;
  await db
    .update(conversations)
    .set(side === "agency" ? { agencyLastReadId: sql`greatest(${column}, least(${target}, ${conversations.lastMessageId}))` } : { clientLastReadId: sql`greatest(${column}, least(${target}, ${conversations.lastMessageId}))` })
    .where(eq(conversations.id, conv.id));
  if (side === "agency") await markConversationNotificationsRead({ agencyId: conv.agencyId }, conv.id);
  else if (conv.clientVisitorId) await markConversationNotificationsRead({ visitorId: conv.clientVisitorId }, conv.id);
}

/** Who and what a thread is about, for its header. */
export async function threadContext(conv: Conversation) {
  const db = await getDb();
  const [agency] = await db.select({ name: agencies.name, handle: agencies.handle, avatarKey: agencies.avatarKey }).from(agencies).where(eq(agencies.id, conv.agencyId));
  const [request] = conv.requestId
    ? await db.select({ id: projectRequests.id, services: projectRequests.services, status: projectRequests.status }).from(projectRequests).where(eq(projectRequests.id, conv.requestId))
    : [];
  return { agency: agency ?? null, request: request ?? null };
}

/** First page of a thread for server rendering; opening it counts as reading it. */
export async function loadThread(conv: Conversation, side: ChatSide) {
  const rows = await listMessages(conv.id, { limit: 50 });
  await markRead(conv, side, conv.lastMessageId);
  return {
    initialMessages: rows.map(toChatMessage),
    initialOtherLastReadId: side === "agency" ? conv.clientLastReadId : conv.agencyLastReadId,
    hasEarlier: rows.length === 50,
  };
}

/** The other side's read cursor, for "seen" ticks. */
export async function otherLastReadId(conversationId: string, side: ChatSide) {
  const db = await getDb();
  const [row] = await db
    .select({ agency: conversations.agencyLastReadId, client: conversations.clientLastReadId })
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  if (!row) return 0;
  return side === "agency" ? row.client : row.agency;
}

// ---------------------------------------------------------------------------
// Unread counts and lists
// ---------------------------------------------------------------------------

/** Conversations with messages the agency has not read. */
export async function unreadForAgency(agencyId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(conversations)
    .where(and(eq(conversations.agencyId, agencyId), sql`${conversations.lastMessageId} > ${conversations.agencyLastReadId}`));
  return row?.n ?? 0;
}

/** Conversations with messages this client device has not read. */
export async function unreadForVisitor(visitorId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(conversations)
    .where(and(eq(conversations.clientVisitorId, visitorId), sql`${conversations.lastMessageId} > ${conversations.clientLastReadId}`));
  return row?.n ?? 0;
}

/** Unread conversations per request, for the client's request list. */
export async function unreadByRequest(visitorId: string, requestIds: string[]) {
  if (!requestIds.length) return new Map<string, number>();
  const db = await getDb();
  const rows = await db
    .select({ requestId: conversations.requestId, n: sql<number>`count(*)::int` })
    .from(conversations)
    .where(and(inArray(conversations.requestId, requestIds), eq(conversations.clientVisitorId, visitorId), sql`${conversations.lastMessageId} > ${conversations.clientLastReadId}`))
    .groupBy(conversations.requestId);
  return new Map(rows.map((r) => [r.requestId!, r.n]));
}

/** Unread conversations per agency on one request (client's proposal cards). */
export async function unreadByAgencyForRequest(requestId: string) {
  const db = await getDb();
  const rows = await db
    .select({ agencyId: conversations.agencyId })
    .from(conversations)
    .where(and(eq(conversations.requestId, requestId), sql`${conversations.lastMessageId} > ${conversations.clientLastReadId}`));
  return new Set(rows.map((r) => r.agencyId));
}

const preview = sql<string | null>`(select case when m.hidden_at is null then left(m.body, 140) else null end from conversation_messages m where m.id = ${conversations.lastMessageId})`;
const lastSide = sql<string | null>`(select m.side::text from conversation_messages m where m.id = ${conversations.lastMessageId})`;

export type ConversationRow = {
  conversation: Conversation;
  agency: { name: string; handle: string; avatarKey: string | null };
  preview: string | null;
  lastSide: string | null;
  unread: boolean;
};

/** An agency's conversations with at least one message, newest first. */
export async function listAgencyConversations(agencyId: string, limit = 100): Promise<ConversationRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ conversation: conversations, agency: { name: agencies.name, handle: agencies.handle, avatarKey: agencies.avatarKey }, preview, lastSide })
    .from(conversations)
    .innerJoin(agencies, eq(conversations.agencyId, agencies.id))
    .where(and(eq(conversations.agencyId, agencyId), gt(conversations.lastMessageId, 0)))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, unread: r.conversation.lastMessageId > r.conversation.agencyLastReadId }));
}

/** A client device's conversations, newest first. */
export async function listVisitorConversations(visitorId: string, limit = 100): Promise<ConversationRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ conversation: conversations, agency: { name: agencies.name, handle: agencies.handle, avatarKey: agencies.avatarKey }, preview, lastSide })
    .from(conversations)
    .innerJoin(agencies, eq(conversations.agencyId, agencies.id))
    .where(and(eq(conversations.clientVisitorId, visitorId), gt(conversations.lastMessageId, 0)))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);
  return rows.map((r) => ({ ...r, unread: r.conversation.lastMessageId > r.conversation.clientLastReadId }));
}

/** Conversation started from each inquiry (the inbox links to it). */
export async function conversationsForInquiries(inquiryIds: string[]) {
  if (!inquiryIds.length) return new Map<string, string>();
  const db = await getDb();
  const rows = await db.select({ id: conversations.id, inquiryId: conversations.inquiryId }).from(conversations).where(inArray(conversations.inquiryId, inquiryIds));
  return new Map(rows.map((r) => [r.inquiryId!, r.id]));
}

/** For an agency opening a thread that came from an inquiry: the inquiry counts as read. */
export async function markInquiryRead(conv: Conversation) {
  if (!conv.inquiryId) return;
  const db = await getDb();
  await db.update(inquiries).set({ status: "read" }).where(and(eq(inquiries.id, conv.inquiryId), eq(inquiries.status, "new")));
}

// ---------------------------------------------------------------------------
// Staff (read-only audit view with moderation)
// ---------------------------------------------------------------------------

export async function listConversationsForStaff(filter: { agency?: string } = {}, limit = 100) {
  const db = await getDb();
  const conditions = [gt(conversations.lastMessageId, 0)];
  if (filter.agency) conditions.push(eq(agencies.handle, filter.agency.replace(/^@/, "").toLowerCase()));
  return db
    .select({
      conversation: conversations,
      agency: { name: agencies.name, handle: agencies.handle },
      messageCount: sql<number>`(select count(*)::int from conversation_messages m where m.conversation_id = ${conversations.id})`,
      hiddenCount: sql<number>`(select count(*)::int from conversation_messages m where m.conversation_id = ${conversations.id} and m.hidden_at is not null)`,
    })
    .from(conversations)
    .innerJoin(agencies, eq(conversations.agencyId, agencies.id))
    .where(and(...conditions))
    .orderBy(desc(conversations.lastMessageAt))
    .limit(limit);
}

export async function getConversationForStaff(id: string) {
  const conv = await getConversation(id);
  if (!conv) return null;
  const db = await getDb();
  const [agency] = await db.select({ name: agencies.name, handle: agencies.handle }).from(agencies).where(eq(agencies.id, conv.agencyId));
  const messages = await db.select().from(conversationMessages).where(eq(conversationMessages.conversationId, id)).orderBy(asc(conversationMessages.id)).limit(2000);
  return { conversation: conv, agency, messages };
}

/** Hides or restores a message for participants. The text itself is never changed. */
export async function setMessageHidden(messageId: number, staffUserId: string, hidden: boolean) {
  const db = await getDb();
  const [row] = await db
    .update(conversationMessages)
    .set(hidden ? { hiddenAt: new Date(), hiddenBy: staffUserId } : { hiddenAt: null, hiddenBy: null })
    .where(eq(conversationMessages.id, messageId))
    .returning({ id: conversationMessages.id, conversationId: conversationMessages.conversationId });
  return row ?? null;
}

/** Retention: messages older than 24 months are deleted (the trigger allows only these). */
export async function purgeOldMessages(now = new Date()) {
  const db = await getDb();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - MESSAGE_RETENTION_MONTHS);
  const rows = await db
    .delete(conversationMessages)
    .where(lt(conversationMessages.createdAt, cutoff))
    .returning({ id: conversationMessages.id });
  return rows.length;
}
