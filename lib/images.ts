import { randomUUID } from "node:crypto";
import sharp, { type OutputInfo, type Sharp, type WebpOptions } from "sharp";
import { searchSmallestPassing } from "./media/size-search";
import { lumaPlane, SSIM_FLOOR, ssimLuma, type Pixels } from "./media/ssim";
import { stripMetadata } from "./media/strip-metadata";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES_PER_POST = 10;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif", "gif"]);

export class ImageError extends Error {
  constructor(public code: "too_large" | "unsupported" | "too_small") {
    super(code);
  }
}

/** What an image is stored as. Almost always WebP; an upload that is already smallest keeps its own format. */
export type StoredFormat = "webp" | "jpeg" | "png";
export const STORED_EXT: Record<StoredFormat, "webp" | "jpg" | "png"> = { webp: "webp", jpeg: "jpg", png: "png" };
export const STORED_TYPE: Record<StoredFormat, string> = { webp: "image/webp", jpeg: "image/jpeg", png: "image/png" };

export type ProcessedImage = {
  full: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  color: string;
  /** Format of `full` (the thumbnail is always WebP). Missing means WebP. */
  fullFormat?: StoredFormat;
};

function toHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The sizes we display. Scaling down to them is not a quality loss (nobody
 * ever sees more pixels than this); everything else is "same quality".
 */
export const DISPLAY = {
  feed: { maxWidth: 1080, maxHeight: 1350, fit: "inside" },
  thumb: { maxWidth: 480, maxHeight: 480, fit: "cover" },
  // Logos are cropped from the centre, exactly as the upload preview shows them.
  avatar: { maxWidth: 320, maxHeight: 320, fit: "cover", position: "centre" },
  background: { maxWidth: 2400, maxHeight: 2400, fit: "inside" },
} as const;

/**
 * Lossy WebP qualities probed, starting in the middle: graphics usually pass
 * at 70 and then at 40 (OneClickConvert's WebP floor), so they are settled in
 * two encodes; photos usually need 65–90, so a failure at 70 climbs the
 * WEBP_ABOVE rungs and the binary refinement narrows it down.
 */
export const WEBP_LADDER = [70, 40];
const WEBP_ABOVE = [85, 92, 97];
const LOSSLESS_EFFORT = 3;
/** Source formats that are photographic by nature; a lossless re-encode of them is never the smallest. */
const LOSSY_SOURCES = new Set(["jpeg", "heif", "avif"]);

export type EncodeTarget = {
  maxWidth: number;
  maxHeight: number;
  fit: "inside" | "cover";
  /** Where a cover crop keeps: "attention" (the busiest region, the default) or "centre". */
  position?: "attention" | "centre";
  /** Minimum SSIM against the resized source; defaults to SSIM_FLOOR. */
  ssimFloor?: number;
  ladder?: number[];
};

export type EncodedImage = {
  data: Buffer;
  format: StoredFormat;
  width: number;
  height: number;
  method: "lossy" | "lossless" | "near-lossless" | "original";
  /** WebP quality, for lossy and near-lossless results. */
  quality?: number;
  /** SSIM against the source at the displayed size (1 = identical). */
  ssim: number;
};

/** True for a WebP whose picture is VP8 (lossy) rather than VP8L (lossless). */
function isLossyWebp(b: Buffer): boolean {
  for (let i = 12; i + 8 <= b.length; ) {
    const type = b.toString("latin1", i, i + 4);
    if (type === "VP8 ") return true;
    if (type === "VP8L") return false;
    if (type === "ANMF") return false; // animated: treat as graphic
    const size = b.readUInt32LE(i + 4);
    i += 8 + size + (size & 1);
  }
  return false;
}

/** An alpha channel that is 255 everywhere carries nothing but encode time; drop it. */
function dropOpaqueAlpha(r: { data: Buffer; info: OutputInfo }): { data: Buffer; info: { width: number; height: number; channels: 1 | 2 | 3 | 4 } } {
  const { data, info } = r;
  const channels = info.channels as 1 | 2 | 3 | 4;
  if (channels !== 4 && channels !== 2) return { data, info: { width: info.width, height: info.height, channels } };
  for (let p = channels - 1; p < data.length; p += channels) if (data[p] !== 255) return { data, info: { width: info.width, height: info.height, channels } };
  const colour = channels - 1;
  const out = Buffer.allocUnsafe((data.length / channels) * colour);
  for (let p = 0, o = 0; p < data.length; p += channels) for (let c = 0; c < colour; c++) out[o++] = data[p + c];
  return { data: out, info: { width: info.width, height: info.height, channels: colour as 1 | 3 } };
}

/** Raw pixels with any transparency flattened onto white, so invisible colour under alpha never counts. */
function visible(data: Buffer, info: { width: number; height: number; channels: number }): Pixels {
  if (info.channels !== 4 && info.channels !== 2) return { data, width: info.width, height: info.height, channels: info.channels };
  const colour = info.channels - 1;
  const out = new Uint8Array(info.width * info.height * colour);
  for (let p = 0, o = 0; p < data.length; p += info.channels) {
    const a = data[p + colour] / 255;
    for (let c = 0; c < colour; c++) out[o++] = data[p + c] * a + 255 * (1 - a);
  }
  return { data: out, width: info.width, height: info.height, channels: colour };
}

async function decode(buf: Buffer): Promise<Pixels> {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  return visible(data, info);
}

/**
 * Stores an image at the smallest size that looks the same as the source at
 * the size we display it: SSIM against the resized source must stay at or
 * above the floor (docs/26-media-compression.md). Candidates:
 *
 * 1. lossy WebP at the LOWEST quality that passes (OneClickConvert's ladder
 *    bracket + binary refinement, turned into "smallest passing");
 * 2. lossless WebP, for graphic sources (PNG, GIF, WebP) or when no lossy
 *    quality passes, then near-lossless WebP when lossless is competitive;
 * 3. the upload itself, with its metadata stripped losslessly, when it is
 *    already within the display box and smaller than every re-encode
 *    (only with `allowOriginal`, and only for "inside" fits).
 *
 * The smallest passing candidate wins. EXIF orientation is applied and no
 * metadata (EXIF, GPS, XMP) is ever written.
 */
export async function encodeSameQuality(
  input: Buffer,
  target: EncodeTarget,
  opts: { base?: Sharp; allowOriginal?: boolean } = {},
): Promise<EncodedImage> {
  const floor = target.ssimFloor ?? SSIM_FLOOR;
  const meta = await sharp(input).metadata();
  const base = opts.base ?? sharp(input, { failOn: "error" }).rotate();
  const { data: pixels, info } = await base
    .clone()
    .resize({
      width: target.maxWidth,
      height: target.maxHeight,
      fit: target.fit,
      position: target.fit === "cover" ? (target.position ?? "attention") : undefined,
      withoutEnlargement: target.fit === "inside",
    })
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(dropOpaqueAlpha);
  const raw = { width: info.width, height: info.height, channels: info.channels };
  const reference = lumaPlane(visible(pixels, info));
  const score = async (buf: Buffer) => ssimLuma(reference, lumaPlane(await decode(buf)), info.width, info.height);
  const webp = (options: WebpOptions) => sharp(pixels, { raw }).webp(options).toBuffer();

  const candidates: EncodedImage[] = [];
  const common = { width: info.width, height: info.height };

  const lossy = await searchSmallestPassing({
    render: async (quality) => {
      const data = await webp({ quality });
      return { data, ssim: await score(data) };
    },
    sizeOf: (c) => c.data.byteLength,
    passes: (c) => c.ssim >= floor,
    ladder: target.ladder ?? WEBP_LADDER,
    above: WEBP_ABOVE,
    round: Math.round,
    epsilon: 3,
    maxRefine: 3,
  });
  if (lossy.passed) candidates.push({ ...common, data: lossy.candidate.data, format: "webp", method: "lossy", quality: lossy.param, ssim: lossy.candidate.ssim });

  const lossySource = LOSSY_SOURCES.has(meta.format ?? "") || (meta.format === "webp" && isLossyWebp(input));
  // Lossless WebP is rarely much smaller than the source PNG at the same pixel
  // count; when the lossy result is under half of that estimate, lossless cannot win.
  const pixelShare = (info.width * info.height) / Math.max(1, (meta.width ?? info.width) * (meta.height ?? info.height));
  const losslessHopeless = lossy.passed && lossy.bytes < 0.5 * input.byteLength * Math.min(1, pixelShare);
  if (!lossy.passed || (!lossySource && !losslessHopeless)) {
    const lossless = await webp({ lossless: true, effort: LOSSLESS_EFFORT });
    candidates.push({ ...common, data: lossless, format: "webp", method: "lossless", ssim: 1 });
    // Near-lossless only pays off where lossless is already competitive (flat graphics, screenshots).
    if (!lossy.passed || lossless.byteLength < lossy.bytes * 1.5) {
      const near = await webp({ nearLossless: true, quality: 60, effort: LOSSLESS_EFFORT });
      const nearScore = await score(near);
      if (nearScore >= floor) candidates.push({ ...common, data: near, format: "webp", method: "near-lossless", quality: 60, ssim: nearScore });
    }
  }

  const format = meta.format;
  if (
    opts.allowOriginal &&
    target.fit === "inside" &&
    (format === "jpeg" || format === "png" || format === "webp") &&
    (meta.pages ?? 1) === 1 &&
    (meta.orientation ?? 1) === 1 &&
    (meta.width ?? Infinity) <= target.maxWidth &&
    (meta.height ?? Infinity) <= target.maxHeight
  ) {
    const stripped = stripMetadata(input, format);
    if (stripped) candidates.push({ ...common, data: Buffer.from(stripped), format, method: "original", ssim: 1 });
  }

  return candidates.reduce((a, b) => (b.data.byteLength < a.data.byteLength ? b : a));
}

/**
 * Validates an upload and produces the feed image (max 1080×1350) and a 480px
 * square thumbnail for grids, each at the smallest size that looks the same
 * (see encodeSameQuality). EXIF orientation is applied and all metadata
 * (including GPS) is stripped.
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
  const [full, thumb] = await Promise.all([
    encodeSameQuality(input, DISPLAY.feed, { base, allowOriginal: true }),
    encodeSameQuality(input, DISPLAY.thumb, { base }),
  ]);
  const { dominant } = await sharp(thumb.data).stats();

  return { full: full.data, thumb: thumb.data, width: full.width, height: full.height, color: toHex(dominant), fullFormat: full.format };
}

/** Square avatar, 320px WebP at the smallest size that looks the same. */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageError("too_large");
  try {
    return (await encodeSameQuality(input, DISPLAY.avatar)).data;
  } catch {
    throw new ImageError("unsupported");
  }
}

export function newImageKeys(agencyId: string, fullFormat: StoredFormat = "webp") {
  const id = randomUUID();
  return { key: `posts/${agencyId}/${id}.${STORED_EXT[fullFormat]}`, thumbKey: `posts/${agencyId}/${id}-t.webp` };
}

export function newAvatarKey(agencyId: string) {
  return `avatars/${agencyId}/${randomUUID()}.webp`;
}
