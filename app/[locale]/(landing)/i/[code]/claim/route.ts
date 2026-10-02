import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { introVideoDeployed, invitationByCode } from "@/lib/data/pioneers";
import { PIONEER } from "@/lib/pioneers";

/**
 * "Claim my seal" on a letter's page: remembers the letter's code and opens sign-up
 * (docs/57). The seal is given to the page created from that sign-up, once.
 */
export async function GET(request: Request, { params }: { params: Promise<{ locale: string; code: string }> }) {
  const { locale: raw, code } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const inv = await invitationByCode(code);
  // The medal is earned: the introduction must have played to the end on this letter's page.
  const ready = inv?.state === "open" && (Boolean(inv.watchedAt) || !introVideoDeployed());
  const res = NextResponse.redirect(new URL(ready ? `/${locale}/join` : `/${locale}/i/${code}`, request.url));
  if (ready && inv) {
    res.cookies.set(PIONEER.cookie, inv.code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: PIONEER.cookieDays * 24 * 3600 });
  }
  return res;
}
