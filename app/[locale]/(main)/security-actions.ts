"use server";

import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAgency, requireUser } from "@/lib/auth/guards";
import { createSession, destroyAllSessions, destroySession } from "@/lib/auth/session";
import { changeEmailSchema, changePasswordSchema } from "@/lib/account-schema";
import { changeEmail, changePassword, type AccountError } from "@/lib/data/account";
import { deactivateAgency } from "@/lib/data/deactivation";
import { adminMfaRequired, confirmEnrollment, disableMfa, mfaKeyConfigured, regenerateBackupCodes, startEnrollment, verifySecondFactor } from "@/lib/auth/mfa";
import { verifyPassword } from "@/lib/auth/password";
import { isStaffRole } from "@/lib/auth/permissions";
import { getAgencyByOwner } from "@/lib/data/agencies";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";

export type MfaResult = { error?: string; secret?: string; qr?: string; backupCodes?: string[]; done?: boolean };

const codeOf = (formData: FormData) => String(formData.get("code") ?? "").trim().slice(0, 32);
const limited = (userId: string) => !rateLimit(`mfa-settings:${userId}`, 10, 10 * 60 * 1000);
/** Demo agencies are shared by every demo visitor (lib/demo.ts): a second factor would lock the others out. */
const sharedDemoAccount = async (userId: string) => Boolean((await getAgencyByOwner(userId))?.isDemo);

export async function startMfaAction(): Promise<MfaResult> {
  const user = await requireUser();
  if (!mfaKeyConfigured()) return { error: "notConfigured" };
  if (user.mfaEnabled) return { error: "alreadyOn" };
  if (await sharedDemoAccount(user.id)) return { error: "demo" };
  const { secret, qrSvg } = await startEnrollment(user.id, user.email);
  return { secret, qr: `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}` };
}

export async function confirmMfaAction(_: MfaResult | undefined, formData: FormData): Promise<MfaResult> {
  const user = await requireUser();
  if (limited(user.id)) return { error: "rateLimited" };
  if (await sharedDemoAccount(user.id)) return { error: "demo" };
  const result = await confirmEnrollment(user.id, codeOf(formData));
  if ("error" in result) return { error: result.error };
  return { backupCodes: result.backupCodes };
}

export async function regenerateCodesAction(_: MfaResult | undefined, formData: FormData): Promise<MfaResult> {
  const user = await requireUser();
  if (limited(user.id)) return { error: "rateLimited" };
  if ((await verifySecondFactor(user.id, codeOf(formData))) !== "totp") return { error: "badCode" };
  return { backupCodes: await regenerateBackupCodes(user.id) };
}

export async function disableMfaAction(_: MfaResult | undefined, formData: FormData): Promise<MfaResult> {
  const user = await requireUser();
  if (isStaffRole(user.role) && adminMfaRequired()) return { error: "requiredForAdmins" };
  if (limited(user.id)) return { error: "rateLimited" };
  const db = await getDb();
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!row || !(await verifyPassword(String(formData.get("password") ?? ""), row.hash))) return { error: "badPassword" };
  if (!(await verifySecondFactor(user.id, codeOf(formData)))) return { error: "badCode" };
  await disableMfa(user.id);
  return { done: true };
}

export type DeactivateResult = { error?: "badPassword" | "confirm" | "openContracts" | "rateLimited"; contracts?: string[] };

/**
 * Agency: close my account (docs/32). Needs the password and the handle typed
 * as confirmation. Refused while a real contract is running or real money is
 * held for it; test contracts never block and stay on record as test.
 */
export async function deactivateAccountAction(_: DeactivateResult | undefined, formData: FormData): Promise<DeactivateResult> {
  const { user, agency } = await requireAgency();
  if (!rateLimit(`deactivate:${user.id}`, 5, 10 * 60 * 1000)) return { error: "rateLimited" };
  if (String(formData.get("handle") ?? "").trim().toLowerCase().replace(/^@/, "") !== agency.handle) return { error: "confirm" };
  const db = await getDb();
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!row || !(await verifyPassword(String(formData.get("password") ?? ""), row.hash))) return { error: "badPassword" };
  const r = await deactivateAgency(agency.id, "self", user.id);
  if ("error" in r) return { error: r.error === "openContracts" ? "openContracts" : "confirm", contracts: "openContracts" in r ? r.openContracts : undefined };
  await destroySession();
  const locale = await getLocale();
  return redirect({ href: "/login?closed=1", locale });
}

export type AccountResult = { error?: AccountError | "invalid" | "short" | "mismatch" | "rateLimited" | "demo"; done?: "email" | "password" };

/** Security → sign-in details: a new email (the username you sign in with). */
export async function changeEmailAction(_: AccountResult | undefined, formData: FormData): Promise<AccountResult> {
  const user = await requireUser();
  if (!rateLimit(`account:${user.id}`, 8, 15 * 60 * 1000)) return { error: "rateLimited" };
  if (await sharedDemoAccount(user.id)) return { error: "demo" };
  const parsed = changeEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const error = await changeEmail(user.id, parsed.data);
  return error ? { error } : { done: "email" };
}

/** Security → sign-in details: a new password. Every other device is signed out; this one stays in. */
export async function changePasswordAction(_: AccountResult | undefined, formData: FormData): Promise<AccountResult> {
  const user = await requireUser();
  if (!rateLimit(`account:${user.id}`, 8, 15 * 60 * 1000)) return { error: "rateLimited" };
  if (await sharedDemoAccount(user.id)) return { error: "demo" };
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    return { error: path === "newPassword" ? "short" : path === "confirm" ? "mismatch" : "invalid" };
  }
  const error = await changePassword(user.id, parsed.data);
  if (error) return { error };
  await destroyAllSessions(user.id);
  await createSession(user.id);
  return { done: "password" };
}
