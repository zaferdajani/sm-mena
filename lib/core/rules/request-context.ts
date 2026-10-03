// Request context as an interface (docs/architecture/mobile-and-api-roadmap.md §3 step 8): what the
// platform reads from a request, without the platform. Next binds it over headers()/cookies()
// (lib/request-context.ts); route handlers bind it over the Request they were given; tests pass a map.

export type RequestContext = {
  header(name: string): string | null;
  cookie(name: string): string | null;
};

/** The caller's address from the proxy headers Vercel sets, else "local" (development, tests). */
export function clientIpFrom(ctx: RequestContext): string {
  return ctx.header("x-forwarded-for")?.split(",")[0]?.trim() || ctx.header("x-real-ip") || "local";
}

/** The bearer token of an API request, or null. Cookies are never consulted here: the API has no cookie fallback. */
export function bearerTokenFrom(ctx: RequestContext): string | null {
  const value = ctx.header("authorization");
  const match = value && /^Bearer\s+([A-Za-z0-9_-]{16,512})$/.exec(value.trim());
  return match ? match[1] : null;
}

/** A context over plain maps (tests, scripts). Header names are case-insensitive. */
export function contextFrom(headers: Record<string, string | undefined>, cookies: Record<string, string | undefined> = {}): RequestContext {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { header: (name) => lower[name.toLowerCase()] ?? null, cookie: (name) => cookies[name] ?? null };
}

/** A context over a web Request (route handlers): headers and the Cookie header, parsed once. */
export function requestContext(request: Request): RequestContext {
  let parsed: Record<string, string> | null = null;
  const cookies = () => {
    if (!parsed) {
      parsed = {};
      for (const part of (request.headers.get("cookie") ?? "").split(";")) {
        const i = part.indexOf("=");
        if (i > 0) parsed[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
      }
    }
    return parsed;
  };
  return { header: (name) => request.headers.get(name), cookie: (name) => cookies()[name] ?? null };
}
