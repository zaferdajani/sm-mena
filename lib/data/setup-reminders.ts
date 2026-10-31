import "server-only";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { createTranslator } from "use-intl";
import { getDb } from "@/lib/db";
import { agencies, packages, users } from "@/lib/db/schema";
import { pageStrength } from "@/lib/core/rules/page-strength";
import { publicationFor } from "@/lib/data/publication";
import { sendPlainEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

// Setup reminders (docs/65 stage 4). Only for owners who ticked the box at sign-up; at most three emails,
// a day, three days and a week after sign-up; none once the page is match-ready; each sent once (the count
// is claimed before sending). The email names the next step, never logs the address, and says how to stop.

/** Hours after sign-up for the first, second and third reminder. */
export const REMINDER_HOURS = [24, 72, 168] as const;

export async function setSetupReminders(ownerUserId: string, agencyId: string, optIn: boolean) {
  const db = await getDb();
  const [row] = await db.update(agencies).set({ setupRemindersOptIn: optIn }).where(and(eq(agencies.id, agencyId), eq(agencies.ownerUserId, ownerUserId))).returning({ id: agencies.id });
  return Boolean(row);
}

export function reminderEmail(lang: "ar" | "en", next: string | null, studioUrl: string) {
  const t = createTranslator({ locale: lang, messages: lang === "ar" ? ar : en, namespace: "SetupReminderEmail" });
  const steps = createTranslator({ locale: lang, messages: lang === "ar" ? ar : en, namespace: "PageStrength.steps" });
  const step = next ? steps(next as never) : "";
  return { subject: t("subject"), lines: [...t("body", { step }).split("\n"), "", studioUrl, "", t("stop")] };
}

/** Sends the reminders that are due; returns how many went out. Safe to run as often as you like. */
export async function sendSetupReminders(limit = 50, now = new Date()): Promise<number> {
  const db = await getDb();
  const candidates = await db
    .select({ id: agencies.id, sent: agencies.setupRemindersSent, createdAt: agencies.createdAt, lang: agencies.contentLang, ownerUserId: agencies.ownerUserId })
    .from(agencies)
    .where(and(eq(agencies.setupRemindersOptIn, true), eq(agencies.status, "active"), eq(agencies.isDemo, false), lt(agencies.setupRemindersSent, REMINDER_HOURS.length), inArray(agencies.setupRemindersSent, [0, 1, 2])))
    .limit(limit * 4);
  let sent = 0;
  for (const c of candidates) {
    if (sent >= limit) break;
    const due = new Date(c.createdAt.getTime() + REMINDER_HOURS[c.sent] * 3_600_000);
    if (due > now) continue;
    const [agency] = await db.select().from(agencies).where(eq(agencies.id, c.id));
    if (!agency) continue;
    const [publication, [pkg]] = await Promise.all([publicationFor(agency.id), db.select({ n: sql<number>`count(*)::int` }).from(packages).where(eq(packages.agencyId, agency.id))]);
    const strength = pageStrength({
      visibility: publication.visibility, services: agency.services, city: agency.city, whatsapp: agency.whatsapp, postCount: agency.postCount, bio: agency.bio,
      avatarKey: agency.avatarKey, platforms: agency.platforms, startingPriceJod: agency.startingPriceJod, packageCount: pkg?.n ?? 0,
      acceptingProjects: agency.acceptingProjects, acceptingUpdatedAt: agency.acceptingUpdatedAt, createdAt: agency.createdAt,
    });
    if (strength.matchReady) {
      // Done: no more reminders, whatever the count.
      await db.update(agencies).set({ setupRemindersOptIn: false }).where(eq(agencies.id, agency.id));
      continue;
    }
    // Claim this reminder before sending so two runs never send the same one.
    const [claimed] = await db.update(agencies).set({ setupRemindersSent: c.sent + 1, setupReminderAt: now }).where(and(eq(agencies.id, agency.id), eq(agencies.setupRemindersSent, c.sent))).returning({ id: agencies.id });
    if (!claimed) continue;
    const [owner] = await db.select({ email: users.email }).from(users).where(eq(users.id, agency.ownerUserId));
    const lang = agency.contentLang === "en" ? "en" : "ar";
    const mail = reminderEmail(lang, strength.next, `${SITE_URL}/${lang}/studio`);
    await sendPlainEmail(owner?.email, mail.subject, mail.lines, "setup-reminder");
    sent++;
  }
  return sent;
}
