import "server-only";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { audit } from "@/lib/data/agencies";
import { getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { mfaKeyConfigured, seal, tryOpen } from "./secret-box";
import { generateBackupCodes, generateSecret, hashBackupCode, otpauthUri, verifyTotp } from "./totp";

export { mfaKeyConfigured };

/**
 * Admins must use two-factor sign-in in production (ADMIN_REQUIRE_2FA=false
 * turns it off; =true forces it in development). Needs MFA_ENCRYPTION_KEY.
 */
export function adminMfaRequired() {
  const flag = process.env.ADMIN_REQUIRE_2FA;
  if (flag === "false") return false;
  if (!mfaKeyConfigured()) return false; // can't enrol without a key; the admin console shows a warning
  return flag === "true" || process.env.NODE_ENV === "production";
}

async function getUser(userId: string) {
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return u ?? null;
}

export async function mfaStatus(userId: string) {
  const u = await getUser(userId);
  return { enabled: Boolean(u?.totpEnabledAt), enabledAt: u?.totpEnabledAt ?? null, backupCodesLeft: u?.backupCodeHashes.length ?? 0 };
}

/** Starts (or restarts) enrolment: a fresh secret held as pending until confirmed. */
export async function startEnrollment(userId: string, email: string) {
  const secret = generateSecret();
  const db = await getDb();
  await db.update(users).set({ totpPendingEnc: seal(secret) }).where(eq(users.id, userId));
  const uri = otpauthUri(secret, email);
  const qrSvg = await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return { secret, uri, qrSvg };
}

/** Confirms enrolment with a code from the app. Returns backup codes (shown once). */
export async function confirmEnrollment(userId: string, code: string): Promise<{ backupCodes: string[] } | { error: "noPending" | "badCode" }> {
  const u = await getUser(userId);
  if (!u?.totpPendingEnc) return { error: "noPending" };
  const secret = tryOpen(u.totpPendingEnc);
  if (!secret) return { error: "noPending" };
  const step = verifyTotp(secret, code);
  if (step === null) return { error: "badCode" };
  const backupCodes = generateBackupCodes();
  const db = await getDb();
  await db
    .update(users)
    .set({ totpSecretEnc: u.totpPendingEnc, totpPendingEnc: null, totpEnabledAt: new Date(), totpLastStep: step, backupCodeHashes: backupCodes.map(hashBackupCode) })
    .where(eq(users.id, userId));
  await audit(userId, "mfa.enable", "user", userId);
  return { backupCodes };
}

/**
 * Checks a second factor: an authenticator code (not reused) or an unused
 * backup code (consumed). Returns which one matched.
 */
export async function verifySecondFactor(userId: string, code: string): Promise<"totp" | "backup" | null> {
  const u = await getUser(userId);
  if (!u?.totpSecretEnc) return null;
  const db = await getDb();
  // A secret sealed with an earlier MFA_ENCRYPTION_KEY can't be read; backup codes (hashes) still work.
  const secret = tryOpen(u.totpSecretEnc);
  const step = secret ? verifyTotp(secret, code, u.totpLastStep) : null;
  if (step !== null) {
    await db.update(users).set({ totpLastStep: step }).where(eq(users.id, userId));
    return "totp";
  }
  const hash = hashBackupCode(code);
  if (code.replace(/\s/g, "").length >= 8 && u.backupCodeHashes.includes(hash)) {
    await db.update(users).set({ backupCodeHashes: u.backupCodeHashes.filter((h) => h !== hash) }).where(eq(users.id, userId));
    await audit(userId, "mfa.backup_code_used", "user", userId, { left: u.backupCodeHashes.length - 1 });
    return "backup";
  }
  return null;
}

export async function regenerateBackupCodes(userId: string) {
  const backupCodes = generateBackupCodes();
  const db = await getDb();
  await db.update(users).set({ backupCodeHashes: backupCodes.map(hashBackupCode) }).where(eq(users.id, userId));
  await audit(userId, "mfa.backup_codes_regenerated", "user", userId);
  return backupCodes;
}

const cleared = { totpSecretEnc: null, totpPendingEnc: null, totpEnabledAt: null, totpLastStep: 0, backupCodeHashes: [] as string[] };

export async function disableMfa(userId: string) {
  const db = await getDb();
  await db.update(users).set(cleared).where(eq(users.id, userId));
  await audit(userId, "mfa.disable", "user", userId);
}

/** Admin recovery for a user who lost their phone and backup codes: clears 2FA and signs them out everywhere. */
export async function adminResetMfa(adminId: string, userId: string) {
  const db = await getDb();
  await db.update(users).set(cleared).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await audit(adminId, "mfa.reset_by_admin", "user", userId);
}
