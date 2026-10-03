import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getAgencyByOwner } from "@/lib/data/agencies";
import { hashToken, issueSession, pendingMfaUserByToken, revokeAllForUser, revokeToken, sessionUserByToken } from "./session-core";

// The browser binding of lib/auth/session-core.ts: the same sessions, carried by an httpOnly cookie.

const SESSION_COOKIE = "sw_session";

const cookieToken = async () => (await cookies()).get(SESSION_COOKIE)?.value;

/**
 * Starts a session in this browser. With mfaPending the session only lets the user finish the
 * two-factor step (see getPendingMfaUser) and expires after 10 minutes.
 */
export async function createSession(userId: string, { mfaPending = false } = {}) {
  const { token, expiresAt } = await issueSession(userId, { mfaPending });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

/** The current browser session's id (a hash of its cookie), to bind short flows such as platform consent to it. */
export async function currentSessionId(): Promise<string | null> {
  const token = await cookieToken();
  return token ? hashToken(token) : null;
}

export const getSessionUser = cache(async () => sessionUserByToken(await cookieToken()));

/** The user whose password was accepted but who still owes a two-factor code. */
export async function getPendingMfaUser() {
  return pendingMfaUserByToken(await cookieToken());
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
  await revokeAllForUser(userId);
}

export async function destroySession() {
  const store = await cookies();
  await revokeToken(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
}
