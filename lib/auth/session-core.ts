import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

// Sessions without a transport (docs/architecture/mobile-and-api-roadmap.md §3 step 6): the cookie
// binding (lib/auth/session.ts) and the bearer API (app/api/v1) both issue, look up and revoke rows
// of the same `sessions` table through these functions. Only the sha256 of a token is ever stored.

export const SESSION_DAYS = 30;
export const PENDING_MINUTES = 10;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Disabled accounts and staff whose access period ended have no valid sessions. */
export const accountActive = () => and(isNull(users.disabledAt), or(isNull(users.staffExpiresAt), gt(users.staffExpiresAt, new Date())));

export type SessionUser = { id: string; email: string; role: (typeof users.role.enumValues)[number]; mfaEnabled: boolean };
export type IssuedSession = { token: string; expiresAt: Date; mfaPending: boolean };

/**
 * Starts a session and returns the raw token once. With mfaPending the session only lets the
 * user finish the two-factor step (see pendingMfaUserByToken) and expires after 10 minutes.
 */
export async function issueSession(userId: string, { mfaPending = false } = {}): Promise<IssuedSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (mfaPending ? PENDING_MINUTES * 60 * 1000 : SESSION_DAYS * 24 * 3600 * 1000));
  const db = await getDb();
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt, mfaPending });
  if (!mfaPending) await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  return { token, expiresAt, mfaPending };
}

/** The signed-in user behind a full (not pending) session token, or null. */
export async function sessionUserByToken(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role, totpEnabledAt: users.totpEnabledAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(sessions.mfaPending, false), accountActive()));
  return row ? { id: row.id, email: row.email, role: row.role, mfaEnabled: Boolean(row.totpEnabledAt) } : null;
}

/** The user whose password was accepted but who still owes a two-factor code. */
export async function pendingMfaUserByToken(token: string | null | undefined) {
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(sessions.mfaPending, true), accountActive()));
  return row ?? null;
}

/** Ends one session (sign-out on one device). Unknown tokens are a no-op. */
export async function revokeToken(token: string | null | undefined) {
  if (!token) return;
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

/** Signs a user out everywhere (role change, disable, ownership transfer, "log out all devices"). */
export async function revokeAllForUser(userId: string) {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Replaces a valid full session with a fresh token and a new 30-day window; the old token stops working. */
export async function rotateSession(token: string | null | undefined): Promise<IssuedSession | null> {
  const user = await sessionUserByToken(token);
  if (!user) return null;
  const next = await issueSession(user.id);
  await revokeToken(token);
  return next;
}
