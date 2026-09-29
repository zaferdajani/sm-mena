import { createHash } from "node:crypto";

// Shared by the app (lib/data/bugs.ts) and the GitHub Actions site-check runner,
// which runs outside Next: no "server-only" here.

/** Paths without query strings, ids or handles collapsed so similar pages group together. */
export const normalizePath = (path: string | null | undefined) =>
  path ? path.split(/[?#]/)[0].replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/:id").replace(/\/(a|p|r|review)\/[^/]+/g, "/$1/:x").slice(0, 200) : null;

/** One row per distinct error: same source, kind, normalised path and message with digits collapsed. */
export function errorFingerprint(e: { source: string; kind: string; message: string; path?: string | null }) {
  const message = e.message.replace(/\d+/g, "N").slice(0, 300);
  return createHash("md5").update(`${e.source}|${e.kind}|${normalizePath(e.path) ?? ""}|${message}`).digest("hex");
}
