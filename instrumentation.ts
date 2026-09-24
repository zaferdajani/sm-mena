import type { Instrumentation } from "next";

// Server-side errors (pages, route handlers, server actions) go to the same
// error journal as browser errors (Admin → Bugs).
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { recordError } = await import("@/lib/data/bugs");
    const err = error as Error & { digest?: string };
    if (err.digest?.startsWith("NEXT_")) return; // notFound() / redirect() are not errors
    await recordError({
      source: "server",
      kind: `server_${context.routeType}`,
      message: err.message || String(error),
      stack: err.stack ?? null,
      // The route file (e.g. /[locale]/r/[token]) rather than the URL, so
      // private tokens in paths are never stored.
      path: context.routePath,
      userAgent: String(request.headers["user-agent"] ?? ""),
    });
  } catch {
    // never let error reporting break a request
  }
};
