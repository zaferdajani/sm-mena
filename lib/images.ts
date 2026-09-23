import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_POST = 10;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif", "gif"]);

export class ImageError extends Error {
  constructor(public code: "too_large" | "unsupported" | "too_small") {
    super(code);
  }
}

export type ProcessedImage = {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  color: string;
};

function toHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Validates an upload and produces the feed image (max 1080×1350, WebP) and a
 * 480px square thumbnail for grids. EXIF orientation is applied and all
 * metadata (including GPS) is stripped.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageError("too_large");
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ImageError("unsupported");
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) throw new ImageError("unsupported");
  if ((meta.width ?? 0) < 200 || (meta.height ?? 0) < 200) throw new ImageError("too_small");

  const base = sharp(input, { failOn: "error" }).rotate();
  const { data: full, info } = await base
    .clone()
    .resize({ width: 1080, height: 1350, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await base
    .clone()
    .resize({ width: 480, height: 480, fit: "cover", position: "attention" })
    .webp({ quality: 72 })
    .toBuffer();
  const { dominant } = await sharp(thumb).stats();

  return { full, thumb, width: info.width, height: info.height, color: toHex(dominant) };
}

/** Square avatar, 320px WebP. */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageError("too_large");
  try {
    return await sharp(input)
      .rotate()
      .resize({ width: 320, height: 320, fit: "cover", position: "attention" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch {
    throw new ImageError("unsupported");
  }
}

export function newImageKeys(agencyId: string) {
  const id = randomUUID();
  return { key: `posts/${agencyId}/${id}.webp`, thumbKey: `posts/${agencyId}/${id}-t.webp` };
}

export function newAvatarKey(agencyId: string) {
  return `avatars/${agencyId}/${randomUUID()}.webp`;
}
