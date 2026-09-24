/**
 * The signed execution copy of a contract or NDA, as a PDF (server side).
 *
 * Layout follows TeamManager's agreement PDF (src/utils/orgAgreementPdf.ts):
 * the document text flowed line by line across A4 pages, then an "electronic
 * signature evidence" page with each party's drawn mark, typed name, time and
 * IP hash, and the sha256 fingerprint of the terms. Arabic documents are laid
 * out right to left (right-aligned); English ones left to right.
 *
 * Output is deterministic for the same input: the PDF creation date is the
 * latest signature time (or a fixed date when nobody signed) and the file id
 * is derived from the document, never from the clock or a random source.
 */
import { createHash } from "node:crypto";
import { jsPDF } from "jspdf";
import type { DocBlock, DocSignature, LegalDocument } from "@/lib/legal/document-types";
import {
  ARABIC_FONT,
  LATIN_FONT,
  containsArabic,
  pdfText,
  registerArabicFont,
  setSmartFont,
  setTextDirection,
  wrapText,
} from "./arabic-font";
import { pngSize } from "./signature-image";

type Rgb = [number, number, number];

const BRAND: Rgb = [14, 107, 70]; // --brand #0e6b46
const INK: Rgb = [33, 37, 41];
const GREY: Rgb = [110, 110, 110];
const RULE: Rgb = [210, 210, 210];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const LEFT = MARGIN;
const RIGHT = PAGE_W - MARGIN;
const WIDTH = RIGHT - LEFT;
const TOP = 20;
/** Lowest baseline for body text; the footer lives below it. */
const BOTTOM = PAGE_H - 22;
const FOOTER_Y = PAGE_H - 10;

/** Box the drawn signature is fitted into (aspect ratio kept). */
const SIG_W = 60;
const SIG_H = 22;

/** Points to millimetres (jsPDF font sizes are in points). */
const PT = 25.4 / 72;

type TextStyle = {
  size: number;
  color?: Rgb;
  bold?: boolean;
  /** Distance from the start edge (right in RTL, left in LTR), in mm. */
  indent?: number;
  /** Width available from `indent`, in mm (defaults to the rest of the line). */
  width?: number;
  /** Line advance as a multiple of the font size. */
  leading?: number;
  align?: "start" | "center";
  font?: "courier";
};

export async function renderLegalPdf(doc: LegalDocument): Promise<Buffer> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  await registerArabicFont(pdf);
  const rtl = doc.dir === "rtl";
  setTextDirection(pdf, rtl ? "rtl" : "ltr");

  const signedTimes = doc.signatures
    .map((s) => s.signedAt?.getTime())
    .filter((t): t is number => typeof t === "number" && Number.isFinite(t));
  pdf.setCreationDate(pdfDate(signedTimes.length ? new Date(Math.max(...signedTimes)) : null));
  pdf.setFileId(fileId(doc));
  pdf.setDocumentProperties({
    title: pdfInfoString(pdfText(doc.title)),
    subject: pdfInfoString(pdfText(doc.number)),
    keywords: doc.fingerprint,
    creator: "Sawwiq",
  });
  pdf.setLanguage(doc.locale === "ar" ? "ar" : "en-GB");
  if (rtl) pdf.viewerPreferences({ Direction: "R2L" });

  let y = TOP;

  /** X for a distance from the start edge. */
  const at = (offset: number) => (rtl ? RIGHT - offset : LEFT + offset);
  const ensure = (height: number) => {
    if (y + height > BOTTOM) {
      pdf.addPage();
      y = TOP;
    }
  };

  const applyFont = (text: string, style: TextStyle) => {
    if (style.font === "courier" && !containsArabic(text)) {
      pdf.setFontSize(style.size);
      pdf.setFont("courier", "normal");
    } else {
      setSmartFont(pdf, text, style.size, style.bold ? "bold" : "normal");
    }
    pdf.setTextColor(...(style.color ?? INK));
  };

  /** Draws one already-wrapped line at the current y. */
  const drawLine = (line: string, style: TextStyle, x: number, align: "left" | "right" | "center") => {
    const fontName = pdf.getFont().fontName;
    // No bold Arabic face exists: fake it with a hairline stroke in the text colour.
    const fauxBold = style.bold && fontName === ARABIC_FONT;
    if (fauxBold) {
      pdf.setLineWidth(style.size * 0.012);
      pdf.setDrawColor(...(style.color ?? INK));
    }
    pdf.text(line, x, y, { align, ...(fauxBold ? { renderingMode: "fillThenStroke" as const } : {}) });
  };

  /** Wraps and draws a paragraph, flowing across pages; returns lines drawn. */
  const write = (raw: string, style: TextStyle) => {
    const text = pdfText(raw);
    const indent = style.indent ?? 0;
    const width = style.width ?? WIDTH - indent;
    const lineHeight = style.size * PT * (style.leading ?? 1.45);
    applyFont(text, style);
    const lines = wrapText(pdf, text, width);
    for (const line of lines) {
      ensure(lineHeight);
      applyFont(text, style); // a page break resets nothing, but keep it explicit
      if (style.align === "center") drawLine(line, style, PAGE_W / 2, "center");
      else drawLine(line, style, at(indent), rtl ? "right" : "left");
      y += lineHeight;
    }
    return lines.length;
  };

  /** A marker (bullet, number) at the start edge, on the line about to be written. */
  const marker = (text: string, style: TextStyle, lineHeightHint: number) => {
    ensure(lineHeightHint);
    pdf.setFontSize(style.size);
    pdf.setFont(LATIN_FONT, style.bold ? "bold" : "normal");
    pdf.setTextColor(...(style.color ?? INK));
    pdf.text(text, at(style.indent ?? 0), y, { align: rtl ? "right" : "left" });
  };

  const rule = (color: Rgb = RULE) => {
    pdf.setDrawColor(...color);
    pdf.setLineWidth(0.3);
    pdf.line(LEFT, y, RIGHT, y);
  };

  // ------------------------------------------------------------------ title
  y = TOP + 4;
  write(doc.title, { size: 18, bold: true, color: BRAND, align: "center", leading: 1.3 });
  y += 1;
  write(doc.number, { size: 10, color: GREY, align: "center" });
  if (doc.subtitle) {
    y += 1;
    write(doc.subtitle, { size: 12, align: "center" });
  }
  y += 2;
  rule(BRAND);
  y += 9;

  // ----------------------------------------------------------------- blocks
  const body: TextStyle = { size: 10, leading: 1.5 };
  for (const block of doc.blocks) writeBlock(block);

  function writeBlock(block: DocBlock) {
    ensure(18); // keep a heading with at least a line of its body
    write(block.heading, { size: 13, bold: true, color: BRAND, leading: 1.35 });
    y += 1.5;
    for (const paragraph of block.paragraphs ?? []) {
      write(paragraph, body);
      y += 1.8;
    }
    for (const bullet of block.bullets ?? []) {
      marker("•", { size: 10, indent: 1.5 }, 5.5);
      write(bullet, { ...body, indent: 6 });
      y += 0.8;
    }
    (block.numbered ?? []).forEach((item, i) => {
      marker(`${i + 1}.`, { size: 10.5, bold: true, color: BRAND }, 6);
      write(item.title, { size: 10.5, bold: true, indent: 7, leading: 1.45 });
      if (item.detail) write(item.detail, { ...body, indent: 7 });
      for (const line of item.lines ?? []) write(line, { size: 9.5, color: GREY, indent: 7, leading: 1.45 });
      y += 2;
    });
    y += 4;
  }

  // --------------------------------------------------------- evidence page
  pdf.addPage();
  pdf.setFillColor(...BRAND);
  pdf.rect(0, 0, PAGE_W, 26, "F");
  y = 16;
  write(doc.labels.evidenceTitle, { size: 15, bold: true, color: [255, 255, 255] });
  y = 40;

  const LABEL_W = 40;
  const row = (label: string, value: string, valueStyle: Partial<TextStyle> = {}) => {
    ensure(6);
    const top = y;
    write(label, { size: 9, color: GREY, width: LABEL_W - 3 });
    const afterLabel = y;
    y = top;
    write(value, { size: 10, indent: LABEL_W, ...valueStyle });
    y = Math.max(y, afterLabel) + 1.2;
  };

  for (const signature of doc.signatures) writeSignature(signature);

  function writeSignature(s: DocSignature) {
    ensure(64);
    write(`${s.role} — ${s.party}`, { size: 12, bold: true, color: BRAND });
    y += 2;

    const top = y;
    const drawn = s.signedAt && s.image ? drawSignatureImage(s.image, top) : false;
    if (drawn) {
      y = top + SIG_H + 2;
    } else if (!s.signedAt) {
      y = top + SIG_H / 2 + 2;
      write(doc.labels.notSigned, { size: 11, color: GREY, indent: 4 });
      y = top + SIG_H + 2;
    } else {
      // Signed without a drawn mark (typed name only): the typed name is the mark.
      y = top + SIG_H / 2 + 3;
      write(s.signerName ?? "", { size: 16, indent: 4 });
      y = top + SIG_H + 2;
    }
    pdf.setDrawColor(...GREY);
    pdf.setLineWidth(0.3);
    pdf.line(at(0), y, at(SIG_W + 10), y);
    y += 5;
    if (s.signerName) write(s.signerName, { size: 10.5, bold: true });
    y += 1.5;
    if (s.signedAt) row(doc.labels.signedAt, formatSignedAt(s.signedAt, doc.locale, doc.timeZone));
    if (s.ipHash) row(doc.labels.ipHash, s.ipHash, { font: "courier", size: 8.5 });
    y += 7;
  }

  function drawSignatureImage(image: Uint8Array, top: number): boolean {
    const size = pngSize(image);
    if (!size) return false;
    const scale = Math.min(SIG_W / size.width, SIG_H / size.height);
    const w = size.width * scale;
    const h = size.height * scale;
    const x = rtl ? RIGHT - 4 - w : LEFT + 4;
    try {
      pdf.addImage(image, "PNG", x, top + (SIG_H - h) / 2, w, h);
      return true;
    } catch {
      // An unreadable image must not cost the evidence page; the typed name,
      // time, IP hash and fingerprint remain the record.
      return false;
    }
  }

  ensure(30);
  rule();
  y += 7;
  row(doc.labels.fingerprint, doc.fingerprint, { font: "courier", size: 8.5 });
  y += 3;
  write(doc.labels.evidenceNote, { size: 9, color: GREY, leading: 1.5 });

  // ----------------------------------------------------------------- footer
  const total = pdf.getNumberOfPages();
  const shortPrint = doc.fingerprint.slice(0, 16);
  for (let n = 1; n <= total; n++) {
    pdf.setPage(n);
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.2);
    pdf.line(LEFT, FOOTER_Y - 5, RIGHT, FOOTER_Y - 5);
    const label = pdfText(pageLabel(doc.labels.page, n, total));
    setSmartFont(pdf, label, 8);
    pdf.setTextColor(...GREY);
    pdf.text(label, rtl ? RIGHT : LEFT, FOOTER_Y, { align: rtl ? "right" : "left" });
    pdf.setFont("courier", "normal");
    pdf.setFontSize(8);
    pdf.text(shortPrint, rtl ? LEFT : RIGHT, FOOTER_Y, { align: rtl ? "left" : "right" });
  }

  return Buffer.from(pdf.output("arraybuffer"));
}

/** "Page {n} of {total}" patterns are filled in; a bare word gets "n / total". */
export function pageLabel(pattern: string, n: number, total: number): string {
  if (pattern.includes("{n}")) return pattern.replaceAll("{n}", String(n)).replaceAll("{total}", String(total));
  return `${pattern} ${n} / ${total}`;
}

/**
 * The signing time in the contract's own time zone, with the zone named, so
 * the printed time does not depend on the server's TZ. Latin digits in Arabic.
 */
export function formatSignedAt(date: Date, locale: "ar" | "en", timeZone: string): string {
  const format = (zone: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    }).format(date);
  try {
    return `${format(timeZone)} (${timeZone})`;
  } catch {
    return `${format("UTC")} (UTC)`;
  }
}

/** PDF date string in UTC (D:YYYYMMDDHHmmss+00'00'), independent of the server TZ. */
function pdfDate(date: Date | null): string {
  const year = date?.getUTCFullYear() ?? 0;
  // jsPDF only accepts years 1970–2037; outside that (or unsigned), a fixed date.
  if (!date || year < 1970 || year > 2037) return "D:20260101000000+00'00'";
  const p = (n: number) => String(n).padStart(2, "0");
  return `D:${year}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}+00'00'`;
}

/** A stable 32-hex file id derived from the document and its signatures. */
function fileId(doc: LegalDocument): string {
  const hash = createHash("sha256");
  hash.update(`${doc.kind}\n${doc.number}\n${doc.fingerprint}`);
  for (const s of doc.signatures) hash.update(`\n${s.role}|${s.signerName ?? ""}|${s.signedAt?.toISOString() ?? ""}`);
  return hash.digest("hex").slice(0, 32);
}

/**
 * Info-dictionary strings: jsPDF writes them byte for byte, so anything beyond
 * ASCII is encoded as UTF-16BE with a byte-order mark (PDF text string rules).
 */
function pdfInfoString(text: string): string {
  if (/^[\x20-\x7E]*$/.test(text)) return text;
  let out = "þÿ";
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    out += String.fromCharCode(code >> 8, code & 0xff);
  }
  return out;
}
