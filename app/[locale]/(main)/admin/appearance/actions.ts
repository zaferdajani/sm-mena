"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { audit } from "@/lib/data/agencies";
import { DISPLAY, encodeSameQuality, STORED_EXT, STORED_TYPE } from "@/lib/images";
import { addBackground, BACKGROUND_SCOPES, removeBackground, setBackgroundEnabled } from "@/lib/theme/backgrounds";

export type AppearanceState = { error?: string; ok?: boolean } | undefined;

const MAX_IMAGE = 15 * 1024 * 1024;
// The browser compresses background videos to ~3.5 MB with ffmpeg.wasm before
// sending them (components/theme/background-form.tsx). Anything bigger was not
// compressed, and on Vercel a request body cannot exceed ~4.5 MB anyway.
const MAX_VIDEO = 4 * 1024 * 1024;
const refresh = () => revalidatePath("/[locale]", "layout");

const formSchema = z.object({
  label: z.string().trim().min(1).max(80),
  scope: z.enum(BACKGROUND_SCOPES),
  startsOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  endsOn: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  veil: z.coerce.number().int().min(0).max(95),
});

/** Recognises the upload by its bytes, not its name: an image (any sharp input) or an MP4/WebM video. */
function videoKind(b: Buffer): "mp4" | "webm" | null {
  if (b.length > 12 && b.subarray(4, 8).toString("latin1") === "ftyp") return "mp4";
  if (b.length > 4 && b.readUInt32BE(0) === 0x1a45dfa3) return "webm";
  return null;
}

export async function addBackgroundAction(_: AppearanceState, formData: FormData): Promise<AppearanceState> {
  const user = await requireStaff("appearance.manage");
  const parsed = formSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  if (d.startsOn && d.endsOn && d.endsOn < d.startsOn) return { error: "dates" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "file" };
  const body = Buffer.from(await file.arrayBuffer());
  const video = videoKind(body);
  let media: { body: Buffer; ext: "webp" | "jpg" | "png" | "mp4" | "webm"; contentType: string };
  if (video) {
    if (body.byteLength > MAX_VIDEO) return { error: "videoTooLarge" };
    media = { body, ext: video, contentType: `video/${video}` };
  } else {
    if (body.byteLength > MAX_IMAGE) return { error: "tooLarge" };
    try {
      // Smallest size at the same visible quality (lib/images.ts); metadata stripped.
      const out = await encodeSameQuality(body, DISPLAY.background, { allowOriginal: true });
      media = { body: out.data, ext: STORED_EXT[out.format], contentType: STORED_TYPE[out.format] };
    } catch {
      return { error: "file" };
    }
  }
  const bg = await addBackground(
    { label: d.label, scope: d.scope, kind: video ? "video" : "image", startsOn: d.startsOn || null, endsOn: d.endsOn || null, veil: d.veil, enabled: true },
    media,
    user.id,
  );
  await audit(user.id, "appearance.background_add", "background", bg.id, { scope: bg.scope, kind: bg.kind, startsOn: bg.startsOn, endsOn: bg.endsOn });
  refresh();
  return { ok: true };
}

export async function toggleBackgroundAction(formData: FormData) {
  const user = await requireStaff("appearance.manage");
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "1";
  await setBackgroundEnabled(id, enabled, user.id);
  await audit(user.id, enabled ? "appearance.background_on" : "appearance.background_off", "background", id);
  refresh();
}

export async function removeBackgroundAction(formData: FormData) {
  const user = await requireStaff("appearance.manage");
  const id = String(formData.get("id") ?? "");
  await removeBackground(id, user.id);
  await audit(user.id, "appearance.background_remove", "background", id);
  refresh();
}
