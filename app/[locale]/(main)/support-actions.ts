"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { SUPPORT_KINDS, submitSupportRequest, supportRef } from "@/lib/data/bugs";
import { notifySupportReceived } from "@/lib/data/support-notify";
import { ImageError, newScreenshotKey, processScreenshot } from "@/lib/images";
import { rateLimit } from "@/lib/rate-limit";
import { releaseInfo } from "@/lib/release";
import { clientIp } from "@/lib/request";
import { storage } from "@/lib/storage";
import { AUDIO_MAX_BYTES, sniffMedia, VIDEO_MAX_BYTES } from "@/lib/support-media";
import { getVisitorId } from "@/lib/visitor";

export type SupportState = { error?: "required" | "invalidEmail" | "rateLimited" | "screenshot" | "media"; done?: boolean; ref?: string } | undefined;

const MAX_SCREENSHOTS = 3;

const schema = z.object({
  kind: z.enum(SUPPORT_KINDS),
  // May be empty when a voice note or a recording says it all; checked below.
  message: z.string().trim().max(4000),
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

type Attachment = { key: string; kind: "audio" | "video"; type: string };

/** One voice note and one screen recording at most, identified by their bytes. Null: refuse the report. */
async function storeMedia(formData: FormData): Promise<Attachment[] | null> {
  const out: Attachment[] = [];
  for (const [field, kind, max] of [["voice", "audio", AUDIO_MAX_BYTES], ["video", "video", VIDEO_MAX_BYTES]] as const) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    const body = Buffer.from(await file.arrayBuffer());
    const sniffed = body.byteLength <= max ? sniffMedia(body, kind) : null;
    if (!sniffed) {
      if (out.length) await storage().remove(out.map((a) => a.key)).catch(() => {});
      return null;
    }
    const key = `support/${randomUUID()}.${sniffed.ext}`;
    await storage().put(key, body, sniffed.type);
    out.push({ key, kind, type: sniffed.type });
  }
  return out;
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
  const hasMedia = ["voice", "video"].some((f) => { const v = formData.get(f); return v instanceof File && v.size > 0; });
  if (parsed.data.message.length < 5 && !hasMedia) return { error: "required" };
  const files = formData.getAll("screenshots").filter((f): f is File => f instanceof File && f.size > 0);
  const screenshots = await storeScreenshots(files);
  if (!screenshots) return { error: "screenshot" };
  const attachments = await storeMedia(formData);
  if (!attachments) {
    if (screenshots.length) await storage().remove(screenshots).catch(() => {});
    return { error: "media" };
  }
  const user = await getSessionUser();
  const from = parsed.data.from?.startsWith("/") ? parsed.data.from : null;
  const id = await submitSupportRequest({
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
  return { done: true, ref: supportRef(id) };
}
