"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { SUPPORT_KINDS, submitSupportRequest, supportRef } from "@/lib/data/bugs";
import { ImageError, newScreenshotKey, processScreenshot } from "@/lib/images";
import { rateLimit } from "@/lib/rate-limit";
import { releaseInfo } from "@/lib/release";
import { clientIp } from "@/lib/request";
import { storage } from "@/lib/storage";
import { getVisitorId } from "@/lib/visitor";

export type SupportState = { error?: "required" | "invalidEmail" | "rateLimited" | "screenshot"; done?: boolean; ref?: string } | undefined;

const MAX_SCREENSHOTS = 3;

const schema = z.object({
  kind: z.enum(SUPPORT_KINDS),
  message: z.string().trim().min(5).max(4000),
  email: z.union([z.literal(""), z.string().trim().email().max(200)]).optional(),
  from: z.string().max(300).optional(),
  viewport: z.string().regex(/^\d{2,5}x\d{2,5}$/).optional().catch(undefined),
});

/** Validates and stores the attached screenshots; any unreadable image refuses the whole report so nothing is lost silently. */
async function storeScreenshots(files: File[]): Promise<string[] | null> {
  const keys: string[] = [];
  for (const file of files.slice(0, MAX_SCREENSHOTS)) {
    try {
      const webp = await processScreenshot(Buffer.from(await file.arrayBuffer()));
      const key = newScreenshotKey();
      await storage().put(key, webp, "image/webp");
      keys.push(key);
    } catch (e) {
      if (e instanceof ImageError) {
        if (keys.length) await storage().remove(keys).catch(() => {});
        return null;
      }
      throw e;
    }
  }
  return keys;
}

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
  const files = formData.getAll("screenshots").filter((f): f is File => f instanceof File && f.size > 0);
  const screenshots = await storeScreenshots(files);
  if (!screenshots) return { error: "screenshot" };
  const user = await getSessionUser();
  const from = parsed.data.from?.startsWith("/") ? parsed.data.from : null;
  const id = await submitSupportRequest({
    kind: parsed.data.kind,
    message: parsed.data.message,
    email: parsed.data.email || user?.email || null,
    path: from,
    locale: await getLocale(),
    userAgent: (await headers()).get("user-agent"),
    userId: user?.id ?? null,
    visitorId: await getVisitorId(),
    screenshots,
    viewport: parsed.data.viewport ?? null,
    appCommit: releaseInfo().commit,
  });
  return { done: true, ref: supportRef(id) };
}
