import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { isReferralCode, normalizeCode, REFERRAL_COOKIE, REFERRAL_COOKIE_DAYS } from "@/lib/referrals";

/**
 * An agent's personal link, sawwiq.org/j/<code> (docs/42): remembers their code for the sign-up
 * form and opens it. A code that isn't valid still opens sign-up, without it.
 */
export async function GET(request: Request, { params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale: raw, code } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const res = NextResponse.redirect(new URL(`/${locale}/join`, request.url));
  if (isReferralCode(code)) {
    res.cookies.set(REFERRAL_COOKIE, normalizeCode(code), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: REFERRAL_COOKIE_DAYS * 24 * 3600 });
  }
  return res;
}
