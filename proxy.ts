import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { LANG_COOKIE, routing } from "./i18n/routing";

const intl = createMiddleware(routing);
const VISITOR_COOKIE = "sw_vid";
// The canonical host. Any other host serving the app (Vercel preview and
// *.vercel.app addresses) tells search engines not to index it, so only one
// copy of each page competes in results.
const CANONICAL_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "").host;
  } catch {
    return "";
  }
})();

// Next.js 16 renamed middleware to proxy. This keeps the locale in the URL
// ("/" opens Arabic) and gives every browser an anonymous visitor id used for
// likes, saves and follows without an account.
export function proxy(request: NextRequest) {
  // "/" opens the language the visitor chose before (switcher or offer), else
  // Arabic. Only a saved choice redirects; bots have no cookie and always get
  // the default, and explicit /ar or /en URLs are never changed.
  const saved = request.cookies.get(LANG_COOKIE)?.value;
  if (request.nextUrl.pathname === "/" && saved && saved !== routing.defaultLocale && (routing.locales as readonly string[]).includes(saved)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${saved}`;
    return NextResponse.redirect(url);
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (process.env.NODE_ENV === "production" && CANONICAL_HOST && host && host !== CANONICAL_HOST) {
    // www sends people and search engines to the bare domain (permanently, keeping the path).
    if (host === `www.${CANONICAL_HOST}`) {
      const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${CANONICAL_HOST}`);
      return NextResponse.redirect(url, 308);
    }
  }
  const response = intl(request);
  if (process.env.NODE_ENV === "production" && CANONICAL_HOST && host && host !== CANONICAL_HOST) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
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
    // Client chat pages end with the agency handle too.
    "/(ar|en)/r/:token/chat/:handle*",
    "/(ar|en)/requests/:id/chat/:handle*",
  ],
};
