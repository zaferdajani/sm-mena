"use server";

import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { redirect } from "@/i18n/navigation";
import { checkCode, emailCodesAvailable, issueCode, sendCodeEmail, showCodesOnScreen } from "@/lib/auth/email-code";
import { hashPassword } from "@/lib/auth/password";
import { createSession, destroyAllSessions } from "@/lib/auth/session";
import { audit, getAgencyByOwner } from "@/lib/data/agencies";
import { mergeDeviceInteractions } from "@/lib/data/interactions";
import { getUserByEmail } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getVisitorId } from "@/lib/visitor";

// Forgotten password (docs/61, report EABF5BB4): a 6-digit code to the
// account's email, then a new password. The answer never says whether an
// account exists. Providers and referral agents only: business owners sign in
// with codes already, and staff recover through the owner (docs/17).

export type ForgotState = { step?: "code"; email?: string; shownCode?: string; error?: string } | undefined;

const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });
const resetSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(200),
    code: z.string().trim().regex(/^\d{6}$/),
    password: z.string().min(8).max(200),
    confirm: z.string().max(200),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"] });

type Account = NonNullable<Awaited<ReturnType<typeof getUserByEmail>>>;
const resettable = (u: Account | null | undefined): u is Account =>
  !!u && (u.role === "agency" || u.role === "agent") && !u.disabledAt;

export async function requestResetAction(_: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "email" };
  const { email } = parsed.data;
  if (!emailCodesAvailable()) return { error: "unavailable" };
  const ip = await clientIp();
  if (!rateLimit(`reset:${ip}`, 10, 60 * 60 * 1000) || !rateLimit(`reset:${email}`, 5, 60 * 60 * 1000)) return { error: "rateLimited" };
  const user = await getUserByEmail(email);
  if (!resettable(user)) return { step: "code", email };
  const code = await issueCode(email);
  if (showCodesOnScreen()) return { step: "code", email, shownCode: code };
  if (!(await sendCodeEmail(email, code, "reset"))) return { error: "sendFailed" };
  return { step: "code", email };
}

export async function resetPasswordAction(_: ForgotState, formData: FormData): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const field = parsed.error.issues[0].path[0];
    return { step: "code", email, error: field === "password" ? "short" : field === "confirm" ? "mismatch" : "badCode" };
  }
  if (!rateLimit(`reset-verify:${await clientIp()}`, 30, 15 * 60 * 1000)) return { step: "code", email, error: "rateLimited" };
  const user = await getUserByEmail(parsed.data.email);
  // No account: the same answer as a wrong code, so the form reveals nothing.
  if (!resettable(user)) return { step: "code", email, error: "badCode" };
  const result = await checkCode(parsed.data.email, parsed.data.code);
  if (result !== "ok") return { step: "code", email, error: result };

  const db = await getDb();
  await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password) }).where(eq(users.id, user.id));
  await destroyAllSessions(user.id);
  await audit(user.id, "account.password_reset", "user", user.id);
  const locale = await getLocale();
  if (user.totpEnabledAt) {
    // A reset never skips the second factor.
    await createSession(user.id, { mfaPending: true });
    return redirect({ href: "/login/verify", locale });
  }
  await createSession(user.id);
  await mergeDeviceInteractions(await getVisitorId(), user.id);
  const home = user.role === "agent" ? "/agent" : (await getAgencyByOwner(user.id)) ? "/studio" : "/";
  return redirect({ href: home, locale });
}
