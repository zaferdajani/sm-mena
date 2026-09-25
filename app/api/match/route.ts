import { z } from "zod";
import { currentCountry } from "@/lib/country-choice";
import { runMatchmaker } from "@/lib/ai/agent";
import { wizardNeedSchema } from "@/lib/match-wizard-schema";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getVisitorId } from "@/lib/visitor";

const body = z.object({
  locale: z.enum(["ar", "en"]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(30)
    .refine((m) => m[0].role === "user" && m.at(-1)!.role === "user", "must start and end with a user message"),
  // The guided chat's answers so far (merged with what the text says).
  need: wizardNeedSchema.optional(),
  // The last message is a tapped choice already applied to `need`.
  picked: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const visitorId = await getVisitorId({ create: true });
  const ip = await clientIp();
  if (!rateLimit(`match:${visitorId}`, 20, 10 * 60 * 1000) || !rateLimit(`match-ip:${ip}`, 60, 10 * 60 * 1000)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  try {
    const { messages, locale, need, picked } = parsed.data;
    const result = await runMatchmaker(messages, locale, visitorId, await currentCountry(), { need, picked });
    return Response.json(result);
  } catch (error) {
    console.error("[api/match]", error);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
