import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const VISITOR_COOKIE = "sw_vid";
const VISITOR_PATTERN = /^[0-9a-f-]{36}$/;

/**
 * Anonymous visitor id used for likes, saves, follows and view de-duplication.
 * The proxy sets it on first visit. In a Server Action it is created if missing.
 */
export async function getVisitorId(options: { create?: boolean } = {}): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(VISITOR_COOKIE)?.value;
  if (existing && VISITOR_PATTERN.test(existing)) return existing;
  if (!options.create) return null;
  const id = randomUUID();
  store.set(VISITOR_COOKIE, id, visitorCookieOptions());
  return id;
}

export function visitorCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

/**
 * Who follows, likes and saves: a signed-in account only ("u:<user id>";
 * docs/41). Null for visitors who haven't signed in; they're asked to.
 */
export async function interactionKey(): Promise<string | null> {
  const { getSessionUser } = await import("@/lib/auth/session");
  const user = await getSessionUser();
  return user ? `u:${user.id}` : null;
}
