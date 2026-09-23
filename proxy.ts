import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);
const VISITOR_COOKIE = "sw_vid";

// Next.js 16 renamed middleware to proxy. This keeps the locale in the URL
// ("/" opens Arabic) and gives every browser an anonymous visitor id used for
// likes, saves and follows without an account.
export function proxy(request: NextRequest) {
  const response = intl(request);
  if (!request.cookies.get(VISITOR_COOKIE)) {
    response.cookies.set(VISITOR_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except API routes, media, Next.js internals and static files.
    "/((?!api|media|_next|_vercel|.*\\..*).*)",
    // Agency handles may contain dots (e.g. /ar/a/nakhla.studio), which the
    // rule above would mistake for files.
    "/(ar|en)/a/:handle*",
    "/a/:handle*",
  ],
};
