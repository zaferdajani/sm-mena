import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loginCodes } from "@/lib/db/schema";

// One-time sign-in codes by email for client accounts (docs/41). Only a keyed
// hash of the code is stored; a code lasts 10 minutes and allows five tries.

const TTL_MS = 10 * 60 * 1000;
export const MAX_TRIES = 5;

/** Tests and local development show the code on screen when no email provider is set. Never in production. */
export const showCodesOnScreen = () => !process.env.RESEND_API_KEY && (process.env.NODE_ENV !== "production" || process.env.AUTH_SHOW_CODES === "true");
export const emailCodesAvailable = () => Boolean(process.env.RESEND_API_KEY) || showCodesOnScreen();

const hashCode = (email: string, code: string) => createHmac("sha256", process.env.MFA_ENCRYPTION_KEY || "sawwiq-login-code").update(`${email}:${code}`).digest("hex");

/** Creates a code for `email` (already lower-cased) and returns it for sending. */
export async function issueCode(email: string, now = new Date()) {
  const db = await getDb();
  // Old codes go: a day is plenty for any record of them.
  await db.delete(loginCodes).where(lt(loginCodes.createdAt, new Date(now.getTime() - 24 * 3600 * 1000)));
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.insert(loginCodes).values({ email, codeHash: hashCode(email, code), expiresAt: new Date(now.getTime() + TTL_MS) });
  return code;
}

export type CodeCheck = "ok" | "badCode" | "expired" | "tooMany";

/** Checks the newest live code for `email`; a right code can be used once. */
export async function checkCode(email: string, code: string, now = new Date()): Promise<CodeCheck> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.email, email), isNull(loginCodes.usedAt), gt(loginCodes.expiresAt, now)))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);
  if (!row) return "expired";
  if (row.attempts >= MAX_TRIES) return "tooMany";
  const a = Buffer.from(hashCode(email, code.trim()));
  const b = Buffer.from(row.codeHash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await db.update(loginCodes).set({ attempts: row.attempts + 1 }).where(eq(loginCodes.id, row.id));
    return row.attempts + 1 >= MAX_TRIES ? "tooMany" : "badCode";
  }
  const [used] = await db.update(loginCodes).set({ usedAt: now }).where(and(eq(loginCodes.id, row.id), isNull(loginCodes.usedAt))).returning({ id: loginCodes.id });
  return used ? "ok" : "expired";
}

/** Emails the code (Arabic and English). The address is never logged. */
export async function sendCodeEmail(to: string, code: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const text = [`رمز الدخول إلى سوّق: ${code}`, "صالح لمدة 10 دقائق. إذا لم تطلبه، تجاهل هذه الرسالة.", "", `Your Sawwiq sign-in code: ${code}`, "It works for 10 minutes. If you didn't ask for it, ignore this email."].join("\n");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "Sawwiq <noreply@sawwiq.org>", to, subject: `${code} · سوّق Sawwiq`, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
