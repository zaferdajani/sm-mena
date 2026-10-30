import { issueSession } from "@/lib/auth/session-core";
import { COUNTRIES } from "@/lib/core/catalog/countries";
import { registerProvider } from "@/lib/data/provider-signup";
import { CONSENT_VERSION } from "@/lib/data/users";
import { clientIpOf, fail, invalidBody, json, readJson, route } from "@/lib/api/v1";
import { rateLimit } from "@/lib/rate-limit";
import { apiSignupSchema } from "@/lib/validation/api-v1";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/signup → what the app's sign-up form offers: the countries and cities Sawwiq serves (with
 * their phone codes) and the consent version the person agrees to. Public and the same for everyone.
 */
export const GET = route(async () =>
  json({
    consentVersion: CONSENT_VERSION,
    countries: COUNTRIES.map((c) => ({ code: c.code, ar: c.ar, en: c.en, flag: c.flag, dial: c.dial, cities: c.cities })),
  }),
);

/**
 * POST /api/v1/auth/signup → 201 { token, expiresAt, user }. A new provider account on this site, with exactly the
 * web sign-up's rules (lib/data/provider-signup.ts): consent and age confirmed, handle and email unique, the
 * WhatsApp number valid. The same limit as the web form: 5 sign-ups an hour per address.
 */
export const POST = route(async (request) => {
  if (!rateLimit(`join:${clientIpOf(request)}`, 5, 60 * 60 * 1000)) return fail("rate_limited", { retryAfter: 60 * 60 });
  const parsed = apiSignupSchema.safeParse(await readJson(request));
  if (!parsed.success) return invalidBody(parsed.error);
  const created = await registerProvider(parsed.data);
  if ("error" in created) {
    const taken = created.error === "handleTaken" || created.error === "emailTaken";
    return fail(taken ? "conflict" : "invalid", { reason: created.error });
  }
  const session = await issueSession(created.userId);
  return json({ token: session.token, expiresAt: session.expiresAt.toISOString(), user: { id: created.userId, role: "agency", mfaEnabled: false } }, { status: 201 });
});
