import "server-only";
import { and, eq, ne } from "drizzle-orm";
import { verifySecondFactor } from "@/lib/auth/mfa";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { audit } from "@/lib/data/agencies";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type AccountError = "badPassword" | "badCode" | "emailTaken" | "samePassword";

/**
 * Proves it is really the owner changing sign-in details: the current
 * password, plus a code from the authenticator app when two-factor is on.
 */
async function checkOwner(userId: string, password: string, code: string): Promise<AccountError | null> {
  const db = await getDb();
  const [row] = await db.select({ hash: users.passwordHash, totp: users.totpEnabledAt }).from(users).where(eq(users.id, userId));
  if (!row || !(await verifyPassword(password, row.hash))) return "badPassword";
  if (row.totp && !(await verifySecondFactor(userId, code))) return "badCode";
  return null;
}

/** New sign-in email. The audit entry never holds the addresses (docs/08). */
export async function changeEmail(userId: string, input: { email: string; password: string; code: string }): Promise<AccountError | null> {
  const denied = await checkOwner(userId, input.password, input.code);
  if (denied) return denied;
  const db = await getDb();
  const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(users.email, input.email), ne(users.id, userId)));
  if (taken) return "emailTaken";
  await db.update(users).set({ email: input.email }).where(eq(users.id, userId));
  await audit(userId, "account.email_changed", "user", userId);
  return null;
}

/** New password; the caller signs every other session out. */
export async function changePassword(userId: string, input: { password: string; newPassword: string; code: string }): Promise<AccountError | null> {
  const denied = await checkOwner(userId, input.password, input.code);
  if (denied) return denied;
  if (input.password === input.newPassword) return "samePassword";
  const db = await getDb();
  await db.update(users).set({ passwordHash: await hashPassword(input.newPassword) }).where(eq(users.id, userId));
  await audit(userId, "account.password_changed", "user", userId);
  return null;
}
