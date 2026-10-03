import { isStaffRole } from "@/lib/auth/permissions";
import { verifyPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session-core";
import { getUserByEmail } from "@/lib/data/users";
import { clientIpOf, fail, invalidBody, json, readJson, route } from "@/lib/api/v1";
import { isRateLimited, rateLimitDetail } from "@/lib/rate-limit";
import { apiLoginSchema } from "@/lib/validation/api-v1";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/login { email, password } → { token, expiresAt, user }. Same password check and the
 * same failed-attempt limit as the web form (8 per 15 minutes per address and account). Accounts with a
 * second factor are not signed in here (mfa_required); staff accounts never use the bearer API.
 */
export const POST = route(async (request) => {
  const parsed = apiLoginSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  const { email, password } = parsed.data;
  const key = `login:${clientIpOf(request)}:${email.toLowerCase()}`;
  if (isRateLimited(key, 8)) return fail("rate_limited", { retryAfter: 15 * 60 });

  const user = await getUserByEmail(email);
  const blocked = user && (user.disabledAt || (user.staffExpiresAt && user.staffExpiresAt < new Date()));
  if (!user || blocked || !(await verifyPassword(password, user.passwordHash))) {
    const limit = rateLimitDetail(key, 8, 15 * 60 * 1000);
    return limit.ok ? fail("unauthenticated", { reason: "invalidCredentials" }) : fail("rate_limited", { retryAfter: limit.retryAfter });
  }
  if (isStaffRole(user.role)) return fail("forbidden", { reason: "staff" });
  if (user.totpEnabledAt) return fail("mfa_required", { reason: "mfa" });

  const session = await issueSession(user.id);
  return json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: { id: user.id, role: user.role, mfaEnabled: false } }, { status: 201 });
});
