import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { detectDocumentKind, minifyJson, shrinkDocument } from "@/lib/media/shrink";
import { parseFfmpegSsim } from "@/lib/media/ssim";
import { parseDuration, parseVideoWidth } from "@/lib/media/video-compress";

/** A PDF written the old way: one indirect object per dictionary, no object streams. */
async function plainPdf(pages = 3) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) doc.addPage().drawText(`Page ${i + 1} of a contract`, { x: 50, y: 700, size: 18, font });
  doc.setTitle("Contract SW-2026-0042");
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

describe("shrinkDocument (lossless, OneClickConvert tier 1)", () => {
  it("re-packs a PDF into object streams, keeping every page and the metadata", async () => {
    const input = await plainPdf(12);
    const out = await shrinkDocument(input, { contentType: "application/pdf" });
    expect(out.kind).toBe("pdf");
    expect(out.steps).toEqual(["pdf-object-streams"]);
    expect(out.bytes).toBeLessThan(input.byteLength);
    const doc = await PDFDocument.load(out.body);
    expect(doc.getPageCount()).toBe(12);
    expect(doc.getTitle()).toBe("Contract SW-2026-0042");
  });

  it("is deterministic", async () => {
    const input = await plainPdf();
    const [a, b] = await Promise.all([shrinkDocument(input), shrinkDocument(input)]);
    expect(a.body.equals(b.body)).toBe(true);
  });

  it("never keeps a result that is not smaller", async () => {
    const packed = (await shrinkDocument(await plainPdf())).body;
    const again = await shrinkDocument(packed);
    expect(again.bytes).toBeLessThanOrEqual(packed.byteLength);
    const broken = Buffer.from("%PDF-1.7\nnot really a pdf");
    expect((await shrinkDocument(broken)).body.equals(broken)).toBe(true);
  });

  it("minifies JSON and leaves other files alone", async () => {
    const json = Buffer.from(JSON.stringify({ a: 1, list: [1, 2, 3] }, null, 2));
    const out = await shrinkDocument(json, { name: "data.json" });
    expect(out.body.toString()).toBe('{"a":1,"list":[1,2,3]}');
    expect(minifyJson("not json")).toBeNull();
    const text = Buffer.from("hello   world\n");
    expect((await shrinkDocument(text, { name: "notes.txt" })).body.equals(text)).toBe(true);
    expect(detectDocumentKind(text, { name: "notes.txt" })).toBe("other");
  });
});

describe("ffmpeg log parsing", () => {
  it("reads the ssim filter summary and the input duration", () => {
    const log = "Input #0, matroska,webm, from 'x.webm':\n  Duration: 00:01:02.50, start: 0.000000\n[Parsed_ssim_2 @ 0x1] SSIM Y:0.991 (20.4) U:0.995 (23.0) V:0.994 (22.1) All:0.992345 (21.1)";
    expect(parseFfmpegSsim(log)).toBeCloseTo(0.992345, 6);
    expect(parseDuration(log)).toBeCloseTo(62.5, 3);
    expect(parseVideoWidth("  Stream #0:0(eng): Video: h264 (High), yuv420p(tv, bt709), 1920x1080 [SAR 1:1 DAR 16:9], 30 fps")).toBe(1920);
    expect(parseVideoWidth("  Stream #0:0: Video: vp8, yuv420p(progressive), 640x360, SAR 1:1 DAR 16:9, 1k tbr")).toBe(640);
    expect(parseVideoWidth("no video here")).toBeNull();
    expect(parseFfmpegSsim("no score here")).toBeNull();
    expect(parseDuration("  Duration: N/A, start: 0")).toBeNull();
  });
});
