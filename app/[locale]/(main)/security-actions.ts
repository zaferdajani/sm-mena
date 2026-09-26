"use server";

import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/guards";
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
