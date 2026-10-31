import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, notifications, supportRequests } from "@/lib/db/schema";
import { addNotifications, type Executor, type Recipient } from "@/lib/data/notifications";

// In-app notices to the person who sent a report (docs/63): the receipt, each status change and
// each reply land in their notification centre (the Studio bell for an agency, the device bell for
// everyone else), beside the email. Never the report text: the number and a link to their thread.
// No "server-only" import: the Bug queue workflow (lib/db/bug-queue.ts) writes these too.

export type SupportNotice = "support_received" | "support_update" | "support_reply";

const supportRef = (id: string) => id.slice(0, 8).toUpperCase();

/** Who to tell: the agency the reporter owns, else the device the report came from; nobody when neither is known. */
async function reporterRecipient(db: Executor, row: { userId: string | null; visitorId: string | null }): Promise<Recipient | null> {
  if (row.userId) {
    const [a] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.ownerUserId, row.userId));
    if (a) return { agencyId: a.id };
  }
  return row.visitorId ? { visitorId: row.visitorId } : null;
}

export async function notifyReporter(requestId: string, kind: SupportNotice, ex?: Executor): Promise<boolean> {
  const db = ex ?? (await getDb());
  const [row] = await db
    .select({ id: supportRequests.id, userId: supportRequests.userId, visitorId: supportRequests.visitorId, token: supportRequests.accessToken, status: supportRequests.status })
    .from(supportRequests)
    .where(eq(supportRequests.id, requestId));
  if (!row) return false;
  const recipient = await reporterRecipient(db, row);
  if (!recipient) return false;
  const href = row.token ? `/support/t/${row.token}` : "/support";
  // One unread notice per report and kind: a second update replaces the first instead of stacking.
  await db
    .delete(notifications)
    .where(and("agencyId" in recipient ? eq(notifications.agencyId, recipient.agencyId) : eq(notifications.visitorId, recipient.visitorId), eq(notifications.href, href), eq(notifications.kind, kind), isNull(notifications.readAt)));
  await addNotifications([{ ...recipient, kind, href, params: { ref: supportRef(row.id), status: row.status } }], db);
  return true;
}
