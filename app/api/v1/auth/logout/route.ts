import { bearerUser, json, route } from "@/lib/api/v1";
import { revokeToken } from "@/lib/auth/session-core";

export const dynamic = "force-dynamic";

/** POST /api/v1/auth/logout: ends this token. Unknown or expired tokens answer the same way. */
export const POST = route(async (request) => {
  const bearer = await bearerUser(request);
  if (bearer) await revokeToken(bearer.token);
  return json({ ok: true });
});
