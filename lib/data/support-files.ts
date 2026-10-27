import "server-only";
import { randomUUID } from "node:crypto";
import { ImageError, newScreenshotKey, processScreenshot } from "@/lib/images";
import { storage } from "@/lib/storage";
import { AUDIO_MAX_BYTES, sniffMedia, VIDEO_MAX_BYTES } from "@/lib/support-media";

// Files on a problem report or a reply in its conversation (docs/61, docs/63):
// up to 3 screenshots, one voice note and one screen recording, all private.

const MAX_SCREENSHOTS = 3;
export type Attachment = { key: string; kind: "audio" | "video"; type: string };

export const hasMedia = (formData: FormData) => ["voice", "video"].some((f) => { const v = formData.get(f); return v instanceof File && v.size > 0; });

export async function discardFiles(keys: string[]) {
  if (keys.length) await storage().remove(keys).catch(() => {});
}

/** Validates and stores the attached screenshots; any unreadable image refuses the whole report so nothing is lost silently. */
export async function storeScreenshots(formData: FormData): Promise<string[] | null> {
  const files = formData.getAll("screenshots").filter((f): f is File => f instanceof File && f.size > 0);
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

/** One voice note and one screen recording at most, identified by their bytes. Null: refuse the report. */
export async function storeMedia(formData: FormData): Promise<Attachment[] | null> {
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

