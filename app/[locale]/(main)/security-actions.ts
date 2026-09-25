"use server";

import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { requireAgency, requireUser } from "@/lib/auth/guards";
import { destroySession } from "@/lib/auth/session";
import { deactivateAgency } from "@/lib/data/deactivation";
import { adminMfaRequired, confirmEnrollment, disableMfa, mfaKeyConfigured, regenerateBackupCodes, startEnrollment, verifySecondFactor } from "@/lib/auth/mfa";
import { verifyPassword } from "@/lib/auth/password";
import { isStaffRole } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { rateLimit } from "@/lib/rate-limit";

export type MfaResult = { error?: string; secret?: string; qr?: string; backupCodes?: string[]; done?: boolean };

const codeOf = (formData: FormData) => String(formData.get("code") ?? "").trim().slice(0, 32);
const limited = (userId: string) => !rateLimit(`mfa-settings:${userId}`, 10, 10 * 60 * 1000);

export async function startMfaAction(): Promise<MfaResult> {
  const user = await requireUser();
  if (!mfaKeyConfigured()) return { error: "notConfigured" };
  if (user.mfaEnabled) return { error: "alreadyOn" };
  const { secret, qrSvg } = await startEnrollment(user.id, user.email);
  return { secret, qr: `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}` };
}

export async function confirmMfaAction(_: MfaResult | undefined, formData: FormData): Promise<MfaResult> {
  const user = await requireUser();
  if (limited(user.id)) return { error: "rateLimited" };
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
