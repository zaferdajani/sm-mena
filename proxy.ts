import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16 renamed middleware to proxy. This redirects "/" to the
// visitor's locale (Arabic by default) and keeps the locale in the URL.
export const proxy = createMiddleware(routing);

export const config = {
  // Skip API routes, Next.js internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
