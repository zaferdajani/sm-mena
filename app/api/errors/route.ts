import { z } from "zod";
import { recordError } from "@/lib/data/bugs";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

const BOT = /bot|crawler|spider|crawling|headless|lighthouse|preview/i;

const schema = z.object({
  kind: z.enum(["js_error", "unhandled_rejection", "render_error", "resource_error"]),
  message: z.string().min(1).max(2000),
  stack: z.string().max(8000).nullish(),
  path: z.string().max(500).nullish(),
});

// Browser error reports (components/error-reporter.tsx). Public, so it is
// rate limited and keeps no personal data: path without query, user agent.
export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (BOT.test(ua)) return new Response(null, { status: 204 });
  if (!rateLimit(`errors:${await clientIp()}`, 30, 10 * 60 * 1000)) return new Response(null, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  await recordError({ source: "client", ...parsed.data, userAgent: ua }).catch(() => {});
  return new Response(null, { status: 204 });
}
