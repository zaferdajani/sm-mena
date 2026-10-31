import { z } from "zod";
import { getCurrentAgency } from "@/lib/auth/session";
import { FUNNEL_STEPS, recordFunnel } from "@/lib/data/funnel";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

// A funnel step the browser reports (docs/65 stage 5): only "link shared" today, only for the signed-in
// provider, a count and nothing else.
const schema = z.object({ step: z.enum(FUNNEL_STEPS) });

export async function POST(request: Request) {
  if (!rateLimit(`funnel:${await clientIp()}`, 60, 10 * 60 * 1000)) return new Response(null, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.step !== "link_shared") return new Response(null, { status: 400 });
  const agency = await getCurrentAgency();
  if (!agency) return new Response(null, { status: 401 });
  await recordFunnel("link_shared", agency.id);
  return new Response(null, { status: 204 });
}
