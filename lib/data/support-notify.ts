import "server-only";
import { and, eq, inArray, isNotNull, isNull, ne, or, sql } from "drizzle-orm";
import { createTranslator } from "use-intl";
import { getDb } from "@/lib/db";
import { supportRequests } from "@/lib/db/schema";
import { sendPlainEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { supportRef } from "./bugs";

// Emails to the person who sent a report (docs/61), only when they left an
// address or were signed in: a receipt when it arrives, then one email when it
// is being worked on (planned) and one when it has been handled (done). The
// email names the report number only, never the report text. Each status is
// emailed once: notified_status records the last one sent, and is claimed
// before sending so two runs never send the same email twice.

export type SupportEmailKind = "received" | "planned" | "done";
const UPDATE_STATUSES = ["planned", "done"] as const;

export function supportEmail(kind: SupportEmailKind, ref: string, locale: string | null, token?: string | null) {
  const lang = locale === "en" ? "en" : "ar";
  const t = createTranslator({ locale: lang, messages: lang === "ar" ? ar : en, namespace: "SupportEmail" });
  return {
    subject: t(`${kind}.subject`, { ref }),
    // The footer links to the reporter's conversation (docs/63) when there is one.
    lines: [...t(`${kind}.body`, { ref }).split("\n"), "", t("footer", { link: token ? `${SITE_URL}/${lang}/support/t/${token}` : `${SITE_URL}/${lang}/support` })],
  };
}

async function send(kind: SupportEmailKind, row: { id: string; email: string | null; locale: string | null; token?: string | null }) {
  const mail = supportEmail(kind, supportRef(row.id), row.locale, row.token);
  await sendPlainEmail(row.email, mail.subject, mail.lines, `support-${kind}`);
}

/** The receipt, right after a report is stored. */
export async function notifySupportReceived(id: string) {
  const db = await getDb();
  const [row] = await db
    .update(supportRequests)
    .set({ notifiedStatus: "new" })
    .where(and(eq(supportRequests.id, id), isNotNull(supportRequests.email), isNull(supportRequests.notifiedStatus)))
    .returning({ id: supportRequests.id, email: supportRequests.email, locale: supportRequests.locale, token: supportRequests.accessToken });
  if (row) await send("received", row);
}

/**
 * Emails every reporter whose report moved to planned or done since their last
 * email. Called after a person changes a status, by the daily job and by the
 * half-hourly site check (the bug agent's status changes are written from
 * GitHub Actions, where no email key is kept). Returns how many were sent.
 */
export async function sendSupportUpdates(limit = 25) {
  const db = await getDb();
  const due = await db
    .select({ id: supportRequests.id })
    .from(supportRequests)
    .where(
      and(
        isNotNull(supportRequests.email),
        inArray(supportRequests.status, [...UPDATE_STATUSES]),
        or(isNull(supportRequests.notifiedStatus), ne(supportRequests.notifiedStatus, sql`${supportRequests.status}::text`)),
      ),
    )
    .limit(limit);
  let sent = 0;
  for (const { id } of due) {
    const [row] = await db
      .update(supportRequests)
      .set({ notifiedStatus: sql`${supportRequests.status}::text` })
      .where(and(eq(supportRequests.id, id), or(isNull(supportRequests.notifiedStatus), ne(supportRequests.notifiedStatus, sql`${supportRequests.status}::text`))))
      .returning({ id: supportRequests.id, email: supportRequests.email, locale: supportRequests.locale, status: supportRequests.status, token: supportRequests.accessToken });
    if (!row || (row.status !== "planned" && row.status !== "done")) continue;
    await send(row.status, row);
    sent++;
  }
  return sent;
}
