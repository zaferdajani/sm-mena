/**
 * Browser-side image compression before upload, ported from OneClickConvert's
 * convertImage and SSIM score. The rule is the same as on the server
 * (lib/images.ts): the smallest file that still looks the same.
 *
 * 1. Decode and fit into a maximum long side (1600 px for posts, above the
 *    1080 px we display, so the server still has headroom).
 * 2. Encode JPEG (and WebP where the browser can) at the LOWEST quality whose
 *    SSIM against the resized picture stays at or above SSIM_FLOOR, using the
 *    shared ladder-bracket + binary-refine search.
 * 3. Keep the original file when it already fits the box and is smaller.
 *
 * Only when a whole request would still be over REQUEST_BUDGET (Vercel refuses
 * bodies above ~4.5 MB) do we fall back to a byte budget: the largest render
 * under a per-file share of the budget (OCC's searchLargestUnderTarget, with a
 * dimension step-down). That is a last resort for very large batches, not the
 * normal path; the server then re-encodes at the same-quality rule anyway.
 *
 * Client only (canvas, createImageBitmap). Falls back to the original file when
 * the browser cannot decode it (e.g. HEIC on Chrome); the server then decides.
 */
import { searchLargestUnderTarget, searchSmallestPassing } from "./size-search";
import { lumaPlane, SSIM_FLOOR, ssimLuma } from "./ssim";

/** What one request may carry, under Vercel's ~4.5 MB body limit. */
export const REQUEST_BUDGET = 3.8 * 1024 * 1024;
/** Above this a serverless request is refused before it reaches the app, so the form says so itself. */
export const REQUEST_LIMIT = 4_400_000;

/** Posts are displayed at up to 1080 px. */
export const POST_UPLOAD = { maxSide: 1600 };
/** An avatar is stored at 320 px; the server crops it, so leave it room. */
export const AVATAR_UPLOAD = { maxSide: 1024 };
/** Interface backgrounds are stored at up to 2400 px. */
export const BACKGROUND_UPLOAD = { maxSide: 2400 };

const QUALITY_LADDER = [0.85, 0.7, 0.55, 0.45]; // 0.45 is OCC's JPEG floor
const QUALITY_ABOVE = [0.92, 0.97];
const BUDGET_LADDER = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5];
const SHRINK_STEP = 0.85;
const MAX_SHRINKS = 8;

type Encoded = { blob: Blob; score: number };

function renamed(name: string, type: string) {
  const ext = type === "image/webp" ? "webp" : "jpg";
  return (name.replace(/\.[^.]+$/, "") || "image") + "." + ext;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), type, quality));
}

/** Draws the bitmap at a size on a white backdrop (JPEG has no transparency). */
function draw(bitmap: ImageBitmap, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return { canvas, ctx };
}

async function decode(file: Blob) {
  try {
    return await createImageBitmap(file);
  } catch {
    return null; // HEIC and other formats the browser cannot open
  }
}

function fitted(bitmap: ImageBitmap, maxSide: number) {
  const fit = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  return { fit, width: Math.max(1, Math.round(bitmap.width * fit)), height: Math.max(1, Math.round(bitmap.height * fit)) };
}

const isAbort = (error: unknown) => error instanceof Error && error.name === "AbortError";

/** Smallest file that looks the same as `file` scaled into `maxSide` (SSIM ≥ floor). */
export async function compressImage(file: File, { maxSide, signal }: { maxSide: number; signal?: AbortSignal }): Promise<File> {
  if (file.type && !file.type.startsWith("image/")) return file;
  const bitmap = await decode(file);
  if (!bitmap) return file;
  try {
    const { fit, width, height } = fitted(bitmap, maxSide);
    const { canvas, ctx } = draw(bitmap, width, height);
    const reference = lumaPlane({ data: ctx.getImageData(0, 0, width, height).data, width, height, channels: 4 });
    const scratch = draw(bitmap, width, height);
    const score = async (blob: Blob) => {
      const back = await createImageBitmap(blob);
      scratch.ctx.drawImage(back, 0, 0, width, height);
      back.close();
      return ssimLuma(reference, lumaPlane({ data: scratch.ctx.getImageData(0, 0, width, height).data, width, height, channels: 4 }), width, height);
    };

    let best: Blob | null = null;
    const types = ["image/jpeg"];
    const probe = await toBlob(canvas, "image/webp", 0.8).catch(() => null);
    if (probe?.type === "image/webp") types.push("image/webp"); // Safari silently answers with PNG
    for (const type of types) {
      const found = await searchSmallestPassing<Encoded>({
        render: async (q) => {
          const blob = await toBlob(canvas, type, q);
          return { blob, score: await score(blob) };
        },
        sizeOf: (c) => c.blob.size,
        passes: (c) => c.score >= SSIM_FLOOR,
        ladder: QUALITY_LADDER,
        above: QUALITY_ABOVE,
        round: (q) => Math.round(q * 100) / 100,
        epsilon: 0.03,
        maxRefine: 3,
        signal,
      });
      if (found.passed && (!best || found.bytes < best.size)) best = found.candidate.blob;
    }
    canvas.width = canvas.height = scratch.canvas.width = scratch.canvas.height = 0; // free the pixels now

    // Already within the box and smaller than any re-encode: send it as it is (the server strips metadata).
    if (!best || (fit === 1 && file.size <= best.size)) return file;
    return new File([best], renamed(file.name, best.type), { type: best.type, lastModified: Date.now() });
  } catch (error) {
    if (isAbort(error)) throw error;
    return file;
  } finally {
    bitmap.close();
  }
}

/**
 * Last resort for oversized requests: the LARGEST JPEG under `targetBytes`
 * (quality first, then dimensions in 15% steps), OneClickConvert's original
 * byte-target search.
 */
export async function compressImageToBudget(
  file: File,
  { maxSide, targetBytes, signal }: { maxSide: number; targetBytes: number; signal?: AbortSignal },
): Promise<File> {
  if (file.size <= targetBytes) return file;
  const bitmap = await decode(file);
  if (!bitmap) return file;
  try {
    let { width, height } = fitted(bitmap, maxSide);
    let best: Blob | null = null;
    for (let shrink = 0; shrink <= MAX_SHRINKS; shrink++) {
      const { canvas } = draw(bitmap, width, height);
      const found = await searchLargestUnderTarget({
        render: (q) => toBlob(canvas, "image/jpeg", q),
        sizeOf: (b) => b.size,
        targetBytes,
        ladder: BUDGET_LADDER,
        round: (q) => Math.round(q * 100) / 100,
        epsilon: 0.01,
        goodEnough: 0.95,
        signal,
      });
      best = found.candidate;
      canvas.width = canvas.height = 0;
      if (found.hitTarget || Math.max(width, height) < 64) break;
      width = Math.max(1, Math.round(width * SHRINK_STEP));
      height = Math.max(1, Math.round(height * SHRINK_STEP));
    }
    if (!best || best.size >= file.size) return file;
    return new File([best], renamed(file.name, "image/jpeg"), { type: "image/jpeg", lastModified: Date.now() });
  } catch (error) {
    if (isAbort(error)) throw error;
    return file;
  } finally {
    bitmap.close();
  }
}

/**
 * Compresses every file at the same visible quality; only if the request
 * would still exceed REQUEST_BUDGET, squeezes the files that are over their
 * fair share of it with the byte-budget search.
 */
export async function compressForRequest(files: File[], { maxSide, signal }: { maxSide: number; signal?: AbortSignal }): Promise<File[]> {
  const out: File[] = [];
  for (const file of files) out.push(await compressImage(file, { maxSide, signal }));
  const total = out.reduce((n, f) => n + f.size, 0);
  if (total <= REQUEST_BUDGET) return out;
  const share = Math.floor(REQUEST_BUDGET / Math.max(1, out.length));
  for (let i = 0; i < out.length; i++) {
    if (out[i].size > share) out[i] = await compressImageToBudget(files[i], { maxSide, targetBytes: share, signal });
  }
  return out;
}

/** Puts `file` into a file input in place of what the person picked, so a plain form submit sends it. */
export function replaceInputFile(input: HTMLInputElement, file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
}
