"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { SUPPORT_KINDS, submitSupportRequest, supportRef } from "@/lib/data/bugs";
import { notifySupportReceived } from "@/lib/data/support-notify";
import { rateLimit } from "@/lib/rate-limit";
import { releaseInfo } from "@/lib/release";
import { clientIp } from "@/lib/request";
import { getVisitorId } from "@/lib/visitor";
import { discardFiles, hasMedia, storeMedia, storeScreenshots } from "@/lib/data/support-files";

export type SupportState = { error?: "required" | "invalidEmail" | "rateLimited" | "screenshot" | "media"; done?: boolean; ref?: string; token?: string } | undefined;

const schema = z.object({
  kind: z.enum(SUPPORT_KINDS),
  // May be empty when a voice note or a recording says it all; checked below.
  message: z.string().trim().max(4000),
  email: z.union([z.literal(""), z.string().trim().email().max(200)]).optional(),
  from: z.string().max(300).optional(),
  viewport: z.string().regex(/^\d{2,5}x\d{2,5}$/).optional().catch(undefined),
});

export async function submitSupportAction(_: SupportState, formData: FormData): Promise<SupportState> {
  if (!rateLimit(`support:${await clientIp()}`, 5, 60 * 60 * 1000)) return { error: "rateLimited" };
  const parsed = schema.safeParse({
    kind: formData.get("kind"),
    message: formData.get("message"),
    email: formData.get("email") ?? undefined,
    from: formData.get("from") ?? undefined,
    viewport: formData.get("viewport") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].path[0] === "email" ? "invalidEmail" : "required" };
  if (parsed.data.message.length < 5 && !hasMedia(formData)) return { error: "required" };
  const screenshots = await storeScreenshots(formData);
  if (!screenshots) return { error: "screenshot" };
  const attachments = await storeMedia(formData);
  if (!attachments) {
    await discardFiles(screenshots);
    return { error: "media" };
  }
  const user = await getSessionUser();
  const from = parsed.data.from?.startsWith("/") ? parsed.data.from : null;
  const { id, accessToken } = await submitSupportRequest({
    kind: parsed.data.kind,
    message: parsed.data.message || "(voice note or recording only)",
    email: parsed.data.email || user?.email || null,
    path: from,
    locale: await getLocale(),
    userAgent: (await headers()).get("user-agent"),
    userId: user?.id ?? null,
    visitorId: await getVisitorId(),
    screenshots,
    attachments,
    viewport: parsed.data.viewport ?? null,
    appCommit: releaseInfo().commit,
  });
  // The receipt email is a courtesy; the report is already stored.
  await notifySupportReceived(id).catch((e) => console.warn("[support] receipt email:", e instanceof Error ? e.message : e));
  return { done: true, ref: supportRef(id), token: accessToken ?? undefined };
}
