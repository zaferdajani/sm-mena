import { readFileSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { DISPLAY, encodeSameQuality, processAvatar, processImage } from "@/lib/images";
import { SSIM_FLOOR, ssim } from "@/lib/media/ssim";
import { stripMetadata } from "@/lib/media/strip-metadata";

/**
 * A busy, camera-sized photo: grain drawn at a third of the size, softened and
 * scaled up, then saved as a high-quality JPEG (4000×3000 comes out ~5 MB).
 */
async function photo(width: number, height: number) {
  const noise = await sharp({ create: { width: Math.round(width / 3), height: Math.round(height / 3), channels: 3, background: "#808080", noise: { type: "gaussian", mean: 128, sigma: 50 } } }).png().toBuffer();
  return sharp(noise).blur(0.8).resize(width, height).jpeg({ quality: 92 }).toBuffer();
}

/** A flat graphic with text-like hard edges, as a PNG (logos, screenshots, flyers). */
async function graphic(width: number, height: number) {
  const bars = Array.from({ length: 12 }, (_, i) => `<rect x="${40 + i * 70}" y="${120 + (i % 3) * 40}" width="40" height="${300 - i * 15}" fill="${i % 2 ? "#13784a" : "#f5b700"}"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff"/>${bars}<text x="40" y="80" font-size="48" font-family="sans-serif" fill="#111">Sawwiq 2026</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** SSIM of a stored image against the source scaled to the stored size. */
async function measure(source: Buffer, stored: Buffer) {
  const out = await sharp(stored).raw().toBuffer({ resolveWithObject: true });
  const ref = await sharp(source).rotate().resize(out.info.width, out.info.height, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const got = await sharp(stored).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return ssim({ data: ref.data, ...ref.info }, { data: got.data, ...got.info });
}

/** What the pipeline stored before: one fixed quality for everything. */
async function oldFeed(input: Buffer) {
  return sharp(input).rotate().resize({ width: 1080, height: 1350, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
}

describe("same quality, smallest size", () => {
  it("stores a busy 4000×3000 photo at 1080 px with SSIM at the floor and no metadata", async () => {
    const input = await sharp(await photo(4000, 3000)).withExif({ IFD0: { Copyright: "secret", Artist: "phone" } }).jpeg({ quality: 92 }).toBuffer();
    const out = await processImage(input);
    expect([out.width, out.height, out.fullFormat]).toEqual([1080, 810, "webp"]);
    expect(await measure(input, out.full)).toBeGreaterThanOrEqual(SSIM_FLOOR - 0.002);
    expect(out.full.byteLength).toBeLessThan(input.byteLength / 5);
    const meta = await sharp(out.full).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
  }, 60_000);

  it("picks the lowest passing quality, so a real photo ends up smaller than the old fixed q80", async () => {
    const real = readFileSync("data/demo-portfolio/abha.trails-1.webp");
    const before = await oldFeed(real);
    const out = await encodeSameQuality(real, DISPLAY.feed, { allowOriginal: true });
    expect(out.method).toBe("lossy");
    expect(out.ssim).toBeGreaterThanOrEqual(SSIM_FLOOR);
    expect(out.data.byteLength).toBeLessThan(before.byteLength);
  }, 60_000);

  it("keeps graphics crisp: lossless or near-lossless WebP when that is smallest, and always at the floor", async () => {
    const input = await graphic(1080, 720);
    const out = await encodeSameQuality(input, DISPLAY.feed);
    expect(out.ssim).toBeGreaterThanOrEqual(SSIM_FLOOR);
    expect(out.data.byteLength).toBeLessThan(input.byteLength);
    expect(out.format).toBe("webp");
  }, 60_000);

  it("keeps an upload that is already smaller than any re-encode, with its metadata stripped", async () => {
    const tiny = await sharp(await photo(900, 600)).withExif({ IFD0: { Copyright: "secret" } }).jpeg({ quality: 40 }).toBuffer();
    const out = await encodeSameQuality(tiny, DISPLAY.feed, { allowOriginal: true });
    expect(out.method).toBe("original");
    expect(out.format).toBe("jpeg");
    expect(out.data.byteLength).toBeLessThan(tiny.byteLength);
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect([meta.width, meta.height]).toEqual([900, 600]);
  }, 60_000);

  it("keeps avatars 320 px square WebP at the floor", async () => {
    const input = await photo(1500, 1500);
    const avatar = await processAvatar(input);
    const meta = await sharp(avatar).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([320, 320, "webp"]);
    expect(avatar.byteLength).toBeLessThan(input.byteLength);
  }, 60_000);

  it("crops a logo from the centre, as the upload preview shows it", async () => {
    // A wide logo: a saturated block on one side (which a saliency crop would pick), a dark mark in the middle.
    const block = (color: string) => sharp({ create: { width: 200, height: 200, channels: 3, background: color } }).png().toBuffer();
    const input = await sharp({ create: { width: 900, height: 300, channels: 3, background: "#ffffff" } })
      .composite([
        { input: await block("#e11d48"), left: 20, top: 50 },
        { input: await block("#111111"), left: 350, top: 50 },
      ])
      .png()
      .toBuffer();
    const { data, info } = await sharp(await processAvatar(input)).raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
    // The dark mark is in the middle, and the red block is out of the crop.
    expect(at(160, 160).every((v) => v < 60)).toBe(true);
    for (const x of [5, 315]) expect(at(x, 160)[1]).toBeGreaterThan(200);
  }, 60_000);
});

describe("SSIM", () => {
  it("is 1 for identical images and drops as noise is added", async () => {
    const a = await sharp(await photo(300, 300)).raw().toBuffer({ resolveWithObject: true });
    const px = { data: a.data, width: 300, height: 300, channels: a.info.channels };
    expect(ssim(px, px)).toBe(1);
    const noisy = Uint8Array.from(a.data, (v, i) => Math.max(0, Math.min(255, v + ((i * 7919) % 41) - 20)));
    const score = ssim(px, { ...px, data: noisy });
    expect(score).toBeLessThan(0.95);
    expect(score).toBeGreaterThan(0);
  });

  it("refuses images of different sizes", () => {
    const a = { data: new Uint8Array(16 * 16), width: 16, height: 16, channels: 1 };
    expect(() => ssim(a, { ...a, width: 8, height: 32 })).toThrow();
  });
});

describe("stripMetadata", () => {
  it("drops EXIF from JPEG, PNG and WebP without touching the pixels", async () => {
    const base = sharp(await photo(240, 160)).withExif({ IFD0: { Copyright: "secret-gps" } });
    for (const format of ["jpeg", "png", "webp"] as const) {
      const input = await base.clone().toFormat(format).toBuffer();
      expect(input.includes("secret-gps")).toBe(true);
      const out = Buffer.from(stripMetadata(input, format)!);
      expect(out.includes("secret-gps")).toBe(false);
      expect(out.byteLength).toBeLessThan(input.byteLength);
      const [a, b] = await Promise.all([sharp(input).raw().toBuffer(), sharp(out).raw().toBuffer()]);
      expect(a.equals(b)).toBe(true);
    }
  });

  it("refuses files it does not understand", () => {
    expect(stripMetadata(new Uint8Array([1, 2, 3]), "jpeg")).toBeNull();
    expect(stripMetadata(new Uint8Array(20), "png")).toBeNull();
    expect(stripMetadata(new Uint8Array(20), "webp")).toBeNull();
  });
});
