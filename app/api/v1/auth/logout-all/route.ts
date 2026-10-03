import { bearerUser, fail, json, route } from "@/lib/api/v1";
import { revokeAllForUser } from "@/lib/auth/session-core";

export const dynamic = "force-dynamic";

/** POST /api/v1/auth/logout-all: signs the account out of every device and browser. */
export const POST = route(async (request) => {
  const bearer = await bearerUser(request);
  if (!bearer) return fail("unauthenticated");
  await revokeAllForUser(bearer.user.id);
  return json({ ok: true });
});
