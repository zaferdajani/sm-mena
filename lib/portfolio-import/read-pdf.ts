// Reads a PDF portfolio in the browser (docs/36-portfolio-import.md). For each
// page (up to 40): a full-size JPEG (a future post image), a small JPEG the AI
// can look at, its text, and its layout. Pages that are pictures only get
// their text read off the image on the device (lib/portfolio-import/ocr.ts);
// photo grids and logo walls are cut into pieces, each a crop of its own.
// Nothing leaves the device until the agency asks Sawwiq to read the pages.
// The pdf.js worker, fonts and character maps are served from our own origin
// (scripts/vendor-engines.mjs).

import { analyzeLayout, padBox, type Box, type Layout } from "./layout";
import { readText, stopOcr } from "./ocr";
import { IMPORT_LIMITS, type LayoutKind } from "./types";

export type ReadCrop = { full: Blob; preview: string; text: string; box: Box };
export type ReadPage = { index: number; text: string; full: Blob; thumb: string; preview: string; layout: LayoutKind; header: Box | null; background: [number, number, number]; crops: ReadCrop[] };
export type ReadProgress = { step: "render" | "ocr"; done: number; total: number };

const ENGINE = "/engines/pdfjs";
const FULL_SIDE = 1600;
const THUMB_SIDE = 768;
const ANALYSIS_WIDTH = 720;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render"))), "image/jpeg", quality));
}

/**
 * Frees a canvas's pixels at once. iOS Safari caps the memory all canvases on a
 * page may hold, and canvases waiting for the garbage collector still count;
 * past the cap getContext() returns null and the whole read fails.
 */
function release(...canvases: HTMLCanvasElement[]) {
  for (const c of canvases) {
    c.width = 0;
    c.height = 0;
  }
}

function scaled(source: HTMLCanvasElement, width: number, bg = "#fff"): HTMLCanvasElement {
  const scale = Math.min(1, width / source.width);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(source.width * scale));
  c.height = Math.max(1, Math.round(source.height * scale));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

/** A smaller JPEG data URL, stepping the quality down until it fits the AI's per-page budget. */
function thumbnail(source: HTMLCanvasElement): string {
  const c = scaled(source, THUMB_SIDE);
  let url = "";
  for (const q of [0.7, 0.55, 0.4]) {
    url = c.toDataURL("image/jpeg", q);
    if (url.length * 0.75 <= IMPORT_LIMITS.thumbBytes) break;
  }
  release(c);
  return url;
}

/** A piece of the page as its own image, padded with the page's colour to a sensible shape. */
function crop(source: HTMLCanvasElement, box: Box, background: [number, number, number], square = false): HTMLCanvasElement {
  const b = padBox(box, source.width, source.height);
  const side = Math.max(b.w, b.h);
  const c = document.createElement("canvas");
  c.width = square ? side : b.w;
  c.height = square ? side : b.h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = `rgb(${background.join(",")})`;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(source, b.x, b.y, b.w, b.h, square ? (side - b.w) / 2 : 0, square ? (side - b.h) / 2 : 0, b.w, b.h);
  return c;
}

function pageText(items: { str?: string; hasEOL?: boolean }[]) {
  return items
    .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
    .join("")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim()
    .slice(0, IMPORT_LIMITS.textPerPage);
}

/**
 * `ocrPages` caps how many picture-only pages have their text read on the
 * device (slow on a phone: tens of seconds a page). When Claude reads the
 * portfolio it reads the page images itself, so the importer passes 0.
 */
export async function readPdf(file: File, onProgress: (p: ReadProgress) => void, signal?: AbortSignal, { ocrPages = Infinity }: { ocrPages?: number } = {}): Promise<{ pages: ReadPage[]; totalPages: number }> {
  // The legacy build runs in older browsers too (the modern one needs very recent JavaScript).
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `${ENGINE}/pdf.worker.min.mjs`;
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${ENGINE}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${ENGINE}/standard_fonts/`,
  }).promise;
  const count = Math.min(doc.numPages, IMPORT_LIMITS.pages);
  const pages: ReadPage[] = [];
  // Only the small copies OCR reads wait between pages, never a full-size page.
  const toOcr: { page: ReadPage; canvas: HTMLCanvasElement | null; crops: HTMLCanvasElement[] }[] = [];
  try {
    for (let i = 1; i <= count; i++) {
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      const page = await doc.getPage(i);
      const text = pageText((await page.getTextContent()).items as { str?: string; hasEOL?: boolean }[]);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(3, FULL_SIDE / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      page.cleanup();

      // Layout from a smaller copy (fast), boxes scaled back to the full page.
      const small = scaled(canvas, ANALYSIS_WIDTH);
      const layout: Layout = analyzeLayout(small.getContext("2d")!.getImageData(0, 0, small.width, small.height));
      const k = canvas.width / small.width;
      release(small);
      const up = (b: Box): Box => ({ x: Math.round(b.x * k), y: Math.round(b.y * k), w: Math.round(b.w * k), h: Math.round(b.h * k) });
      const pieces = (layout.kind === "gallery" || layout.kind === "logos" || layout.kind === "single" ? layout.boxes : []).slice(0, IMPORT_LIMITS.cropsPerPage).map(up);
      const cropCanvases = pieces.map((b) => crop(canvas, b, layout.background, layout.kind !== "gallery"));
      const crops: ReadCrop[] = [];
      for (const [n, c] of cropCanvases.entries()) {
        const blob = await canvasToBlob(c, 0.9);
        crops.push({ full: blob, preview: URL.createObjectURL(blob), text: "", box: pieces[n] });
      }
      const full = await canvasToBlob(canvas, 0.88);
      const read: ReadPage = { index: i - 1, text, full, thumb: thumbnail(canvas), preview: URL.createObjectURL(full), layout: layout.kind, header: layout.header ? up(layout.header) : null, background: layout.background, crops };
      pages.push(read);
      // Pictures-only pages get their text read off the image; logos their wordmarks.
      const needsText = text.length < IMPORT_LIMITS.ocrMinChars;
      if ((needsText || layout.kind === "logos") && toOcr.length < ocrPages) {
        toOcr.push({ page: read, canvas: needsText ? scaled(canvas, 1200) : null, crops: layout.kind === "logos" ? cropCanvases.slice(0, 12).map((c) => scaled(c, 400)) : [] });
      }
      release(canvas, ...cropCanvases);
      onProgress({ step: "render", done: i, total: count });
    }
  } finally {
    await doc.destroy();
  }

  if (toOcr.length) {
    let done = 0;
    for (const job of toOcr) {
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      try {
        if (job.canvas) {
          const got = await readText(job.canvas);
          if (got.length > job.page.text.length) job.page.text = got.slice(0, IMPORT_LIMITS.textPerPage);
        }
        for (const [n, c] of job.crops.entries()) job.page.crops[n].text = (await readText(c)).replace(/\n+/g, " ").trim().slice(0, 60);
      } catch (e) {
        console.warn("[portfolio-import] OCR skipped:", e instanceof Error ? e.message : e);
      } finally {
        release(...(job.canvas ? [job.canvas] : []), ...job.crops);
      }
      onProgress({ step: "ocr", done: ++done, total: toOcr.length });
    }
    await stopOcr().catch(() => {});
  }
  return { pages, totalPages: doc.numPages };
}
