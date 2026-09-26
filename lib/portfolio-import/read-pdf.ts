// Reads a PDF portfolio in the browser with pdf.js (docs/36-portfolio-import.md):
// each page becomes a full-size JPEG (a future post image), a small JPEG the
// AI can look at, and its text. Nothing leaves the device until the agency
// asks Sawwiq to read it. The pdf.js worker, fonts and character maps are
// served from our own origin (scripts/vendor-engines.mjs).

import { IMPORT_LIMITS } from "./types";

export type ReadPage = { index: number; text: string; full: Blob; thumb: string; preview: string };

const ENGINE = "/engines/pdfjs";
const FULL_SIDE = 1600;
const THUMB_SIDE = 768;

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("render"))), "image/jpeg", quality));
}

/** A smaller JPEG data URL, stepping the quality down until it fits the AI's per-page budget. */
function thumbnail(source: HTMLCanvasElement): string {
  const scale = Math.min(1, THUMB_SIDE / Math.max(source.width, source.height));
  const c = document.createElement("canvas");
  c.width = Math.round(source.width * scale);
  c.height = Math.round(source.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(source, 0, 0, c.width, c.height);
  let url = "";
  for (const q of [0.7, 0.55, 0.4]) {
    url = c.toDataURL("image/jpeg", q);
    if (url.length * 0.75 <= IMPORT_LIMITS.thumbBytes) break;
  }
  return url;
}

export async function readPdf(file: File, onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<{ pages: ReadPage[]; totalPages: number }> {
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
  try {
    for (let i = 1; i <= count; i++) {
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : ""))
        .join("")
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s+/g, "\n")
        .trim()
        .slice(0, IMPORT_LIMITS.textPerPage);
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
      const full = await canvasToBlob(canvas, 0.88);
      const thumb = thumbnail(canvas);
      pages.push({ index: i - 1, text, full, thumb, preview: URL.createObjectURL(full) });
      page.cleanup();
      onProgress(i, count);
    }
  } finally {
    await doc.destroy();
  }
  return { pages, totalPages: doc.numPages };
}
