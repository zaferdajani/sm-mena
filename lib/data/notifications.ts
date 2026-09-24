import { and, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { getDb, type DB } from "@/lib/db";
import { notifications, type Notification } from "@/lib/db/schema";
import type { NotificationKind } from "@/lib/chat";

/** The database or an open transaction. */
export type Executor = Pick<DB, "select" | "insert" | "update" | "delete">;

/** Who a notification is for: an agency (studio) or a client's device (visitor cookie). */
export type Recipient = { agencyId: string } | { visitorId: string };

export type NewNotification = {
  kind: NotificationKind;
  href: string;
  params?: Record<string, string | number>;
  requestId?: string | null;
  conversationId?: string | null;
} & ({ agencyId: string; visitorId?: undefined } | { visitorId: string; agencyId?: undefined });

export const NOTIFICATION_RETENTION_DAYS = 90;

const recipientWhere = (r: Recipient) => ("agencyId" in r ? eq(notifications.agencyId, r.agencyId) : eq(notifications.visitorId, r.visitorId));

export async function addNotifications(rows: NewNotification[], ex?: Executor) {
  if (!rows.length) return;
  const db = ex ?? (await getDb());
  await db.insert(notifications).values(
    rows.map((r) => ({
      agencyId: r.agencyId ?? null,
      visitorId: r.visitorId ?? null,
      kind: r.kind,
      href: r.href,
      params: r.params ?? {},
      requestId: r.requestId ?? null,
      conversationId: r.conversationId ?? null,
    })),
  );
}

/**
 * New chat message: one unread notification per conversation and recipient
 * (a burst of messages bumps it instead of adding one per message).
 */
export async function notifyMessage(recipient: Recipient, conversationId: string, href: string, params: Record<string, string | number>, ex?: Executor) {
  const db = ex ?? (await getDb());
  const bumped = await db
    .update(notifications)
    .set({ createdAt: new Date(), params: sql`${notifications.params} || ${JSON.stringify({ ...params })}::jsonb || jsonb_build_object('count', coalesce((${notifications.params}->>'count')::int, 1) + 1)` })
    .where(and(recipientWhere(recipient), eq(notifications.conversationId, conversationId), eq(notifications.kind, "message"), isNull(notifications.readAt)))
    .returning({ id: notifications.id });
  if (bumped.length) return;
  await addNotifications([{ ...recipient, kind: "message", href, params: { ...params, count: 1 }, conversationId } as NewNotification], db);
}

export async function listNotifications(recipient: Recipient, limit = 50): Promise<Notification[]> {
  const db = await getDb();
  return db.select().from(notifications).where(recipientWhere(recipient)).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(limit);
}

export async function unreadNotificationCount(recipient: Recipient) {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(recipientWhere(recipient), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

/** Marks the given notifications (or all of them) as read. */
export async function markNotificationsRead(recipient: Recipient, ids?: number[]) {
  const db = await getDb();
  const conditions = [recipientWhere(recipient), isNull(notifications.readAt)];
  if (ids) {
    if (!ids.length) return;
    conditions.push(inArray(notifications.id, ids));
  }
  await db.update(notifications).set({ readAt: new Date() }).where(and(...conditions));
}

/** Opening a conversation clears its notifications for that reader. */
export async function markConversationNotificationsRead(recipient: Recipient, conversationId: string) {
  const db = await getDb();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(recipientWhere(recipient), eq(notifications.conversationId, conversationId), isNull(notifications.readAt)));
}

/** Retention: notifications are removed after 90 days. */
export async function purgeOldNotifications(now = new Date()) {
  const db = await getDb();
  const cutoff = new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * 24 * 3600 * 1000);
  const rows = await db
    .delete(notifications)
    .where(lt(notifications.createdAt, cutoff))
    .returning({ id: notifications.id });
  return rows.length;
}
