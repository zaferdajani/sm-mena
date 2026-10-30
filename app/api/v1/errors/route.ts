import { z } from "zod";
import { clientIpOf, fail, route } from "@/lib/api/v1";
import { redactContact } from "@/lib/bug-queue";
import { recordError } from "@/lib/data/bugs";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["js_error", "unhandled_rejection", "render_error", "resource_error"]),
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).nullish(),
  path: z.string().max(500).nullish(),
});

/**
 * POST /api/v1/errors → 204. A crash report from the native app, filed in the same error journal as the web
 * (Admin → Bugs) with source "client" and the app's version and platform as the user agent. Public on purpose:
 * a crash can happen before anyone signs in. Rate limited per address; emails and phone numbers in the text are
 * removed before it is stored, so no personal data is kept.
 */
export const POST = route(async (request) => {
  const ip = clientIpOf(request);
  if (!rateLimit(`errors-v1:${ip}`, 30, 10 * 60 * 1000)) return fail("rate_limited", { retryAfter: 600 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid");
  await recordError({
    source: "client",
    kind: parsed.data.kind,
    message: redactContact(parsed.data.message),
    stack: parsed.data.stack ? redactContact(parsed.data.stack) : parsed.data.stack,
    path: parsed.data.path ? redactContact(parsed.data.path) : parsed.data.path,
    userAgent: request.headers.get("x-sawwiq-app")?.slice(0, 120) ?? "native",
  });
  return new Response(null, { status: 204, headers: { "cache-control": "private, no-store", "x-robots-tag": "noindex" } });
});
