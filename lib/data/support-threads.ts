import "server-only";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { createTranslator } from "use-intl";
import { getDb } from "@/lib/db";
import { supportMessages, supportRequests } from "@/lib/db/schema";
import { sendPlainEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { supportRef, type SupportStatus } from "./bugs";
import type { Attachment } from "./support-files";

// The conversation on a problem report (docs/63). The reporter opens it with
// the private link /support/t/<token> (from the help chat, "My reports" or an
// email); the bug agent's replies arrive through the Bug queue workflow and
// staff can reply from Admin → Bugs. A reply from the reporter reopens the
// report for the agent's next run; "It works now" closes it as confirmed.

export type ThreadSummary = { ref: string; token: string; status: SupportStatus; unread: boolean; kind: string; createdAt: string };

/** The reports this browser or account sent, newest first. Nobody else's. */
export async function reportsForViewer(visitorId: string | null, userId: string | null, limit = 20): Promise<ThreadSummary[]> {
  const mine = [visitorId ? eq(supportRequests.visitorId, visitorId) : undefined, userId ? eq(supportRequests.userId, userId) : undefined].filter((c) => c !== undefined);
  if (!mine.length) return [];
  const db = await getDb();
  const rows = await db
    .select({ id: supportRequests.id, token: supportRequests.accessToken, status: supportRequests.status, unread: supportRequests.reporterUnread, kind: supportRequests.kind, createdAt: supportRequests.createdAt })
    .from(supportRequests)
    .where(or(...mine))
    .orderBy(desc(supportRequests.createdAt))
    .limit(limit);
  return rows.filter((r) => r.token).map((r) => ({ ref: supportRef(r.id), token: r.token!, status: r.status, unread: r.unread, kind: r.kind, createdAt: r.createdAt.toISOString() }));
}

export async function threadByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const db = await getDb();
  const [request] = await db.select().from(supportRequests).where(eq(supportRequests.accessToken, token));
  if (!request) return null;
  const messages = await db.select().from(supportMessages).where(eq(supportMessages.requestId, request.id)).orderBy(asc(supportMessages.createdAt));
  return { request, messages };
}

export async function markThreadRead(requestId: string) {
  const db = await getDb();
  await db.update(supportRequests).set({ reporterUnread: false }).where(eq(supportRequests.id, requestId));
}

/** The reporter writes again: the report goes back to the agent (status new). */
export async function addReporterMessage(requestId: string, body: string, screenshots: string[], attachments: Attachment[]) {
  const db = await getDb();
  await db.insert(supportMessages).values({ requestId, author: "reporter", body: body.slice(0, 4000), screenshots, attachments });
  await db.update(supportRequests).set({ status: "new", reporterUnread: false, confirmedAt: null, notifiedStatus: "new" }).where(eq(supportRequests.id, requestId));
}

/** Stored in English for the bug agent; the thread page shows it translated. */
export const CONFIRMED_NOTE = "(confirmed: it works now)";

/** "It works now": the reporter confirms the fix. */
export async function confirmFixed(requestId: string) {
  const db = await getDb();
  await db.insert(supportMessages).values({ requestId, author: "reporter", body: CONFIRMED_NOTE });
  // notified_status matches, so no "handled" email follows the reporter's own confirmation.
  await db.update(supportRequests).set({ status: "done", confirmedAt: new Date(), reporterUnread: false, notifiedStatus: "done" }).where(eq(supportRequests.id, requestId));
}

/** A reply from staff in Admin → Bugs (the bug agent's come through lib/db/bug-queue.ts). */
export async function addStaffReply(requestId: string, body: string, status?: SupportStatus) {
  const db = await getDb();
  await db.insert(supportMessages).values({ requestId, author: "staff", body: body.slice(0, 4000) });
  await db.update(supportRequests).set({ reporterUnread: true, ...(status ? { status, handledAt: new Date() } : {}) }).where(eq(supportRequests.id, requestId));
}

export function replyEmail(ref: string, locale: string | null, token: string) {
  const lang = locale === "en" ? "en" : "ar";
  const t = createTranslator({ locale: lang, messages: lang === "ar" ? ar : en, namespace: "SupportThread.email" });
  return { subject: t("subject", { ref }), lines: [...t("body", { ref }).split("\n"), "", `${SITE_URL}/${lang}/support/t/${token}`] };
}

/**
 * Emails a link (never the text) for each reply not emailed yet, once per
 * report per batch. Runs with sendSupportUpdates (app/api/support/updates):
 * after a staff reply, after the Bug queue writes the agent's replies, and on
 * the half-hourly site check. The reply email stands in for the status email.
 */
export async function sendSupportReplies(limit = 25) {
  const db = await getDb();
  const due = await db
    .select({ id: supportMessages.id, requestId: supportMessages.requestId })
    .from(supportMessages)
    .where(and(isNull(supportMessages.emailedAt), or(eq(supportMessages.author, "agent"), eq(supportMessages.author, "staff"))))
    .limit(limit * 4);
  const seen = new Set<string>();
  let sent = 0;
  for (const m of due) {
    // Claim first so two runs never email the same reply.
    const [claimed] = await db.update(supportMessages).set({ emailedAt: new Date() }).where(and(eq(supportMessages.id, m.id), isNull(supportMessages.emailedAt))).returning({ id: supportMessages.id });
    if (!claimed || seen.has(m.requestId) || sent >= limit) continue;
    seen.add(m.requestId);
    const [r] = await db.select({ id: supportRequests.id, email: supportRequests.email, locale: supportRequests.locale, token: supportRequests.accessToken, status: supportRequests.status }).from(supportRequests).where(eq(supportRequests.id, m.requestId));
    if (!r?.email || !r.token) continue;
    await db.update(supportRequests).set({ notifiedStatus: r.status }).where(eq(supportRequests.id, r.id));
    const mail = replyEmail(supportRef(r.id), r.locale, r.token);
    await sendPlainEmail(r.email, mail.subject, mail.lines, "support-reply");
    sent++;
  }
  return sent;
}

/** Conversations for Admin → Bugs, keyed by report id. */
export async function messagesFor(requestIds: string[]) {
  const out = new Map<string, (typeof supportMessages.$inferSelect)[]>();
  if (!requestIds.length) return out;
  const db = await getDb();
  const rows = await db.select().from(supportMessages).where(inArray(supportMessages.requestId, requestIds)).orderBy(asc(supportMessages.createdAt));
  for (const m of rows) out.set(m.requestId, [...(out.get(m.requestId) ?? []), m]);
  return out;
}
