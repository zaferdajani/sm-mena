"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { submitSupportRequest } from "@/lib/data/bugs";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { getVisitorId } from "@/lib/visitor";

export type SupportState = { error?: "required" | "invalidEmail" | "rateLimited"; done?: boolean } | undefined;

const schema = z.object({
  kind: z.enum(["bug", "question", "suggestion"]),
  message: z.string().trim().min(5).max(4000),
  email: z.union([z.literal(""), z.string().trim().email().max(200)]).optional(),
  from: z.string().max(300).optional(),
});

export async function submitSupportAction(_: SupportState, formData: FormData): Promise<SupportState> {
  if (!rateLimit(`support:${await clientIp()}`, 5, 60 * 60 * 1000)) return { error: "rateLimited" };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].path[0] === "email" ? "invalidEmail" : "required" };
  const user = await getSessionUser();
  const from = parsed.data.from?.startsWith("/") ? parsed.data.from : null;
  await submitSupportRequest({
    kind: parsed.data.kind,
    message: parsed.data.message,
    email: parsed.data.email || user?.email || null,
    path: from,
    locale: await getLocale(),
    userAgent: (await headers()).get("user-agent"),
    userId: user?.id ?? null,
    visitorId: await getVisitorId(),
  });
  return { done: true };
}
