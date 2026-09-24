/**
 * Arabic text for jsPDF, on the server. Ported from TeamManager
 * (src/utils/pdfArabicFont.ts) with the browser parts replaced: the font is
 * read from disk with `fs`, never fetched, and nothing here touches the DOM.
 *
 * Rules that keep Arabic readable in the PDF:
 *  - jsPDF shapes and reorders Arabic itself (its processArabic + bidi
 *    plugins). NEVER pre-shape or pre-reorder text; doing it twice prints
 *    reversed, disconnected letters.
 *  - NotoSansArabic has no Latin letters and misses common ASCII punctuation
 *    such as ( ) / % + * ; — any such character drawn in it vanishes. The
 *    patched `doc.text` below draws those runs in helvetica instead.
 *  - The patch only handles single lines. Wrap with `wrapText` and draw line
 *    by line; never pass `maxWidth` to `doc.text`.
 *  - There is no bold Arabic face; `setSmartFont` ignores "bold" for Arabic.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { jsPDF, TextOptionsLight } from "jspdf";
import { hasArabic, splitVisualRuns, type RunDirection } from "./bidi-runs";

export const ARABIC_FONT = "NotoSansArabic";
export const LATIN_FONT = "helvetica";

const FONT_FILE = "NotoSansArabic-Regular.ttf";

let fontBase64: Promise<string> | null = null;

function loadFontBase64(): Promise<string> {
  if (!fontBase64) {
    const file = path.join(process.cwd(), "public", "fonts", FONT_FILE);
    fontBase64 = readFile(file).then(
      (bytes) => bytes.toString("base64"),
      (error: unknown) => {
        fontBase64 = null; // let the next call retry
        throw error;
      },
    );
  }
  return fontBase64;
}

/**
 * Registers NotoSansArabic with this document and patches its `text` method
 * for mixed Arabic/Latin lines. Throws when the font file cannot be read — a
 * contract printed without its Arabic is worse than no PDF at all.
 */
export async function registerArabicFont(doc: jsPDF): Promise<void> {
  const base64 = await loadFontBase64();
  doc.addFileToVFS(FONT_FILE, base64);
  doc.addFont(FONT_FILE, ARABIC_FONT, "normal");
  installArabicTextShaping(doc);
}

/**
 * Makes a string safe for the two fonts: ★ (in neither font) becomes *, bidi
 * control marks are dropped (jsPDF's bidi pass does the ordering and would
 * otherwise print them as boxes), and exotic spaces become plain spaces.
 * Use it on text you DRAW, never on text you hash.
 */
export function pdfText(text: string): string {
  return text
    .replace(/[★☆]/g, "*")
    .replace(/[؜‎‏‪-‮⁦-⁩﻿]/g, "")
    .replace(/[ -   　]/g, " ");
}

/** Characters NotoSansArabic-Regular actually has glyphs for (checked against its cmap). */
const ARABIC_FONT_GLYPH =
  /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿0-9 !,\-.: «»​-‑]/;

/** True when some character in `text` has no glyph in the Arabic font. */
export function needsLatinFallback(text: string): boolean {
  for (const ch of text) if (!ARABIC_FONT_GLYPH.test(ch)) return true;
  return false;
}

const baseDirection = new WeakMap<jsPDF, RunDirection>();

/**
 * The paragraph direction mixed lines are laid out in: "rtl" (the default,
 * an Arabic document) or "ltr" (an English document quoting Arabic names).
 */
export function setTextDirection(doc: jsPDF, dir: RunDirection): void {
  baseDirection.set(doc, dir);
}

export function containsArabic(text: string): boolean {
  return hasArabic(text);
}

/**
 * Picks the font that can draw `text`: NotoSansArabic when it holds Arabic
 * (always "normal" — there is no bold Arabic), helvetica otherwise.
 */
export function setSmartFont(
  doc: jsPDF,
  text: string,
  size: number,
  style: "normal" | "bold" = "normal",
): typeof ARABIC_FONT | typeof LATIN_FONT {
  doc.setFontSize(size);
  if (containsArabic(text)) {
    doc.setFont(ARABIC_FONT, "normal");
    return ARABIC_FONT;
  }
  doc.setFont(LATIN_FONT, style);
  return LATIN_FONT;
}

type Segment = { text: string; font: typeof ARABIC_FONT | typeof LATIN_FONT };

/** A number with its inner separators (12, 3.5, 2026/10/01, 50%), or any one character. */
const NUMBER_OR_CHAR = /[0-9٠-٩۰-۹]+(?:[.,/:\-][0-9٠-٩۰-۹]+)*%?|[\s\S]/gu;

/** Splits a line into pieces, each drawable in one font, in visual order. */
function visualSegments(doc: jsPDF, text: string): Segment[] {
  if (!hasArabic(text)) return [{ text, font: LATIN_FONT }];
  const out: Segment[] = [];
  for (const run of splitVisualRuns(text, baseDirection.get(doc) ?? "rtl")) {
    if (run.dir === "ltr") {
      out.push({ text: run.text, font: LATIN_FONT });
      continue;
    }
    // A right-to-left run may still hold ( ) / % … that the Arabic font lacks.
    // Cut it into pieces — numbers (with their separators), text the Arabic
    // font covers, and punctuation it lacks. The pieces read right to left,
    // so they are laid out reversed. jsPDF reverses covered Arabic itself
    // when it draws it; a number keeps its own left-to-right order
    // (2026/10/01); lacking punctuation is reversed here.
    const pieces: (Segment & { number?: boolean })[] = [];
    for (const token of run.text.match(NUMBER_OR_CHAR) ?? []) {
      if (token.length > 1 && /[0-9\u0660-\u0669\u06F0-\u06F9]/.test(token)) {
        pieces.push({ text: token, font: needsLatinFallback(token) ? LATIN_FONT : ARABIC_FONT, number: true });
        continue;
      }
      const font = ARABIC_FONT_GLYPH.test(token) ? ARABIC_FONT : LATIN_FONT;
      const last = pieces[pieces.length - 1];
      if (last && !last.number && last.font === font) last.text += token;
      else pieces.push({ text: token, font });
    }
    for (const piece of pieces.reverse()) {
      if (piece.font === LATIN_FONT) {
        out.push({ text: piece.number ? piece.text : Array.from(piece.text).reverse().join(""), font: LATIN_FONT });
        continue;
      }
      // jsPDF keeps leading/trailing spaces where they are (paragraph level
      // LTR) instead of mirroring them with the Arabic, so they are placed
      // here as pieces of their own: trailing space goes to the left.
      const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(piece.text) ?? ["", "", piece.text, ""];
      if (trail) out.push({ text: trail, font: ARABIC_FONT });
      if (core) out.push({ text: core, font: ARABIC_FONT });
      if (lead) out.push({ text: lead, font: ARABIC_FONT });
    }
  }
  return out;
}

function switchFont(doc: jsPDF, font: Segment["font"]) {
  doc.setFont(font, "normal");
}

/**
 * Width of `text` as the patched `doc.text` would draw it at the current font
 * and size. Use it (not `getTextWidth`) to measure lines drawn in the Arabic font.
 */
export function measureText(doc: jsPDF, text: string): number {
  const font = doc.getFont();
  if (font.fontName !== ARABIC_FONT || !needsLatinFallback(text)) return doc.getTextWidth(text);
  let total = 0;
  for (const segment of visualSegments(doc, text)) {
    switchFont(doc, segment.font);
    total += doc.getTextWidth(segment.text);
  }
  doc.setFont(font.fontName, font.fontStyle);
  return total;
}

/**
 * Word-wraps `text` to `maxWidth` using the current font and size (call
 * `setSmartFont` first). Unlike `splitTextToSize` it measures mixed lines the
 * way they are drawn, and breaks over-long tokens (hashes) by character.
 */
export function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measureText(doc, candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = word;
      // A single token wider than the line (a sha256, a URL): break it.
      while (measureText(doc, line) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && measureText(doc, line.slice(0, cut)) > maxWidth) cut--;
        lines.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

type TextFn = (text: string | string[], x: number, y: number, options?: TextOptionsLight, transform?: unknown) => jsPDF;

const patchedDocs = new WeakSet<jsPDF>();

/**
 * Patches `doc.text` so a single line drawn while the Arabic font is active,
 * and holding characters that font cannot draw (Latin letters, some ASCII
 * punctuation), is split into runs, positioned by us, each drawn in a font
 * that has its glyphs. Lines the Arabic font fully covers are left to jsPDF,
 * which shapes and reorders them correctly on its own.
 */
function installArabicTextShaping(doc: jsPDF): void {
  if (patchedDocs.has(doc)) return;
  const originalText = doc.text.bind(doc) as TextFn;

  const text: TextFn = (value, x, y, options, transform) => {
    if (
      typeof value === "string" &&
      doc.getFont().fontName === ARABIC_FONT &&
      !value.includes("\n") &&
      !options?.maxWidth &&
      !options?.angle &&
      needsLatinFallback(value)
    ) {
      drawMixedLine(doc, originalText, value, x, y, options);
      return doc;
    }
    return originalText(value, x, y, options, transform);
  };

  doc.text = text as jsPDF["text"];
  patchedDocs.add(doc);
}

function drawMixedLine(doc: jsPDF, originalText: TextFn, value: string, x: number, y: number, options?: TextOptionsLight) {
  const segments = visualSegments(doc, value);
  const widths = segments.map((segment) => {
    switchFont(doc, segment.font);
    return doc.getTextWidth(segment.text);
  });
  const total = widths.reduce((a, b) => a + b, 0);
  const align = options?.align ?? "left";
  let cursor = align === "right" ? x - total : align === "center" ? x - total / 2 : x;

  const rest: TextOptionsLight = { ...(options ?? {}) };
  delete rest.align;

  segments.forEach((segment, i) => {
    switchFont(doc, segment.font);
    originalText(segment.text, cursor, y, rest);
    cursor += widths[i];
  });

  switchFont(doc, ARABIC_FONT);
}
