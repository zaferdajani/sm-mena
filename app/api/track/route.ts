import { z } from "zod";
import { recordPageView } from "@/lib/data/stats";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getVisitorId } from "@/lib/visitor";

const BOT = /bot|crawler|spider|crawling|headless|lighthouse|preview|facebookexternalhit|whatsapp|slurp/i;

const schema = z.object({
  path: z.string().min(1).max(300),
  locale: z.string().max(5).nullish(),
  landing: z.boolean(),
  utm: z.string().max(60).nullish(),
  referrer: z.string().max(500).nullish(),
  sessionId: z.string().min(8).max(64),
  timezone: z.string().max(60).nullish(),
});

export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new Response(null, { status: 204 });
  if (!rateLimit(`track:${await clientIp()}`, 120, 10 * 60 * 1000)) return new Response(null, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const host = new URL(request.url).host;
  await recordPageView({ ...parsed.data, userAgent: ua, visitorId: await getVisitorId(), ownHost: host }).catch(() => {});
  return new Response(null, { status: 204 });
}
