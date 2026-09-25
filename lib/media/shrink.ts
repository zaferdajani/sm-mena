/**
 * Lossless document shrinker, ported from OneClickConvert's shrink pipeline
 * (src/utils/shrinkPipeline.ts, tier 1): re-pack and minify without throwing
 * any content away, and never keep a result that is not smaller than the
 * input. Node/server side; used for the contract and NDA PDFs we generate and
 * exported for any document upload added later.
 *
 * Deliberately not ported: OCC's lossy tier 2 (page rasterisation) and its
 * "deflate into a ZIP" fallback. A stored document must stay the same file
 * type with the same content.
 */
import { PDFDocument } from "pdf-lib";

export type DocumentKind = "pdf" | "json" | "other";

export type ShrinkResult = {
  body: Buffer;
  kind: DocumentKind;
  originalBytes: number;
  bytes: number;
  /** Which lossless steps made the file smaller (empty when the input was already smallest). */
  steps: string[];
};

/** Recognises a document by its bytes first, then by its declared type or name. */
export function detectDocumentKind(body: Uint8Array, hint: { name?: string; contentType?: string } = {}): DocumentKind {
  if (body.length >= 5 && Buffer.from(body.subarray(0, 5)).toString("latin1") === "%PDF-") return "pdf";
  const type = hint.contentType ?? "";
  const name = hint.name ?? "";
  if (type.includes("json") || /\.json$/i.test(name)) return "json";
  return "other";
}

/**
 * Re-saves a PDF through pdf-lib: objects packed into compressed object
 * streams and any incremental-update history dropped. Content, text and
 * metadata stay as they were (`updateMetadata: false`), so the output is
 * deterministic for the same input.
 */
export async function repackPdf(input: Uint8Array): Promise<Buffer> {
  const doc = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });
  const bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
  return Buffer.from(bytes);
}

/** Same data, no insignificant whitespace; null when the text is not JSON. */
export function minifyJson(text: string): string | null {
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function shrinkDocument(input: Buffer, hint: { name?: string; contentType?: string } = {}): Promise<ShrinkResult> {
  const kind = detectDocumentKind(input, hint);
  let best = input;
  const steps: string[] = [];
  const keepIfSmaller = (candidate: Buffer | null, step: string) => {
    if (candidate && candidate.byteLength < best.byteLength) {
      best = candidate;
      steps.push(step);
    }
  };

  if (kind === "pdf") {
    try {
      keepIfSmaller(await repackPdf(input), "pdf-object-streams");
    } catch {
      // Encrypted or damaged: keep the original bytes rather than risk the content.
    }
  } else if (kind === "json") {
    const min = minifyJson(input.toString("utf8"));
    if (min !== null) keepIfSmaller(Buffer.from(min, "utf8"), "json-minify");
  }

  return { body: best, kind, originalBytes: input.byteLength, bytes: best.byteLength, steps };
}
