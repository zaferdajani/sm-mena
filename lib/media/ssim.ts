/**
 * Structural similarity (SSIM) between two same-sized images, on luma, over
 * 8×8 windows stepped by 4 px (the x264/ffmpeg convention). 1.0 = identical.
 * Ported from OneClickConvert (src/utils/ssim.ts); pure and dependency-free so
 * the server (sharp raw pixels) and the browser (canvas ImageData) share it.
 */

/**
 * The quality floor for every lossy encode we store: at or above this, a
 * result is treated as visually identical to its source at the displayed size.
 * OCC labels ≥ 0.98 "identical"; 0.985 leaves a margin for a second
 * generation (the browser pre-compresses, then the server encodes again).
 */
export const SSIM_FLOOR = 0.985;

/** Frame-average SSIM floor for video (ffmpeg's `ssim` filter "All:" value). */
export const VIDEO_SSIM_FLOOR = 0.98;

export type Pixels = {
  data: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  /** Interleaved channels per pixel: 1 (grey), 2 (grey+alpha), 3 (RGB) or 4 (RGBA). */
  channels: number;
};

/** Luma plane (BT.601) of an image; compute it once for a reference that is compared many times. */
export function lumaPlane({ data, width, height, channels }: Pixels): Float32Array {
  const n = width * height;
  const out = new Float32Array(n);
  if (channels < 3) {
    for (let i = 0, p = 0; i < n; i++, p += channels) out[i] = data[p];
    return out;
  }
  for (let i = 0, p = 0; i < n; i++, p += channels) out[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  return out;
}

export function ssim(a: Pixels, b: Pixels): number {
  if (a.width !== b.width || a.height !== b.height) throw new Error("ssim needs two images of the same size");
  return ssimLuma(lumaPlane(a), lumaPlane(b), a.width, a.height);
}

/** SSIM of two luma planes of the same size. */
export function ssimLuma(la: Float32Array, lb: Float32Array, width: number, height: number): number {
  const WIN = 8;
  const STEP = 4;
  if (width < WIN || height < WIN) return 1;
  const C1 = (0.01 * 255) ** 2;
  const C2 = (0.03 * 255) ** 2;
  const N = WIN * WIN;
  let total = 0;
  let count = 0;
  for (let y = 0; y + WIN <= height; y += STEP) {
    for (let x = 0; x + WIN <= width; x += STEP) {
      let sa = 0;
      let sb = 0;
      let saa = 0;
      let sbb = 0;
      let sab = 0;
      for (let j = 0; j < WIN; j++) {
        let i = (y + j) * width + x;
        for (let k = 0; k < WIN; k++, i++) {
          const va = la[i];
          const vb = lb[i];
          sa += va;
          sb += vb;
          saa += va * va;
          sbb += vb * vb;
          sab += va * vb;
        }
      }
      const ma = sa / N;
      const mb = sb / N;
      const vara = saa / N - ma * ma;
      const varb = sbb / N - mb * mb;
      const cov = sab / N - ma * mb;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (vara + varb + C2));
      count++;
    }
  }
  return count ? Math.max(0, Math.min(1, total / count)) : 1;
}

/** Parses the "All:" score from ffmpeg's `ssim` filter summary line; null when absent. */
export function parseFfmpegSsim(log: string): number | null {
  const matches = [...log.matchAll(/SSIM [^\n]*?All:\s*([0-9.]+)/g)];
  if (!matches.length) return null;
  const value = Number(matches[matches.length - 1][1]);
  return Number.isFinite(value) ? value : null;
}
