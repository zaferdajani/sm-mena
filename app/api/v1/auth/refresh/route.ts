import { bearerUser, fail, json, route } from "@/lib/api/v1";
import { rotateSession } from "@/lib/auth/session-core";

export const dynamic = "force-dynamic";

/** POST /api/v1/auth/refresh: a fresh token with a new 30-day window; the old one stops working at once. */
export const POST = route(async (request) => {
  const bearer = await bearerUser(request);
  if (!bearer) return fail("unauthenticated");
  const next = await rotateSession(bearer.token);
  if (!next) return fail("unauthenticated");
  return json({ token: next.token, expiresAt: next.expiresAt.toISOString() }, { status: 201 });
});
