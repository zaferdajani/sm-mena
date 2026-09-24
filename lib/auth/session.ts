import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getAgencyByOwner } from "@/lib/data/agencies";
import { getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

const SESSION_COOKIE = "sw_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const PENDING_MINUTES = 10;

/** Disabled accounts and staff whose access period ended have no valid sessions. */
const accountActive = () => and(isNull(users.disabledAt), or(isNull(users.staffExpiresAt), gt(users.staffExpiresAt, new Date())));

/**
 * Starts a session. With mfaPending the session only lets the user finish the
 * two-factor step (see getPendingMfaUser) and expires after 10 minutes.
 */
export async function createSession(userId: string, { mfaPending = false } = {}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (mfaPending ? PENDING_MINUTES * 60 * 1000 : SESSION_DAYS * 24 * 3600 * 1000));
  const db = await getDb();
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt, mfaPending });
  if (!mfaPending) await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role, totpEnabledAt: users.totpEnabledAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(sessions.mfaPending, false), accountActive()));
  return row ? { id: row.id, email: row.email, role: row.role, mfaEnabled: Boolean(row.totpEnabledAt) } : null;
});

/** The user whose password was accepted but who still owes a two-factor code. */
export async function getPendingMfaUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(sessions.mfaPending, true), accountActive()));
  return row ?? null;
}

/** Second factor verified: replace the pending session with a full one. */
export async function completeMfaSession(userId: string) {
  await destroySession();
  await createSession(userId);
}

export const getCurrentAgency = cache(async () => {
  const user = await getSessionUser();
  return user ? getAgencyByOwner(user.id) : null;
});

/** Signs a user out everywhere (role change, disable, ownership transfer). */
export async function destroyAllSessions(userId: string) {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  }
  store.delete(SESSION_COOKIE);
}
