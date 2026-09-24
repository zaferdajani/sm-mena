import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import type { LegalDocument } from "@/lib/legal/document-types";
import { splitVisualRuns } from "@/lib/pdf/bidi-runs";
import { formatSignedAt, pageLabel, renderLegalPdf } from "@/lib/pdf/legal-pdf";
import { MAX_SIGNATURE_BYTES, parseSignatureDataUrl } from "@/lib/pdf/signature-image";

let png: Buffer;

beforeAll(async () => {
  png = await sharp({ create: { width: 40, height: 20, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
    .png()
    .toBuffer();
});

const FINGERPRINT = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

function arabicDoc(image: Uint8Array): LegalDocument {
  return {
    kind: "contract",
    locale: "ar",
    dir: "rtl",
    title: "عقد خدمات تسويق",
    number: "SW-2026-0042",
    subtitle: "حملة إطلاق متجر الأمل على Instagram",
    blocks: [
      {
        heading: "الأطراف",
        paragraphs: [
          "تم الاتفاق بين وكالة سوّق للتسويق الرقمي (الطرف الأول) وشركة الأمل للتجارة (الطرف الثاني) على تقديم خدمات التسويق الموضحة أدناه وفق الشروط التالية، ويُعدّ هذا العقد ملزماً للطرفين من تاريخ توقيعه.",
          "البريد الإلكتروني للتواصل: hello@example.com والهاتف 0790000000.",
        ],
      },
      {
        heading: "نطاق العمل",
        bullets: ["إدارة حسابات Instagram و TikTok", "تصميم 12 منشوراً شهرياً", "تقرير أداء شهري ★ طلب خاص"],
      },
      {
        heading: "الدفعات",
        numbered: [
          { title: "الدفعة الأولى: 500 JOD", detail: "عند توقيع العقد", lines: ["تاريخ الاستحقاق 2026/10/01", "نسبة 50% من القيمة"] },
          { title: "الدفعة الثانية: 500 JOD", detail: "عند التسليم النهائي" },
        ],
      },
    ],
    signatures: [
      {
        role: "الوكالة",
        party: "سوّق للتسويق الرقمي",
        signerName: "علاء فواز",
        signedAt: new Date("2026-09-20T09:15:00Z"),
        image,
        ipHash: "3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
      },
      { role: "العميل", party: "شركة الأمل للتجارة", signerName: null, signedAt: null },
    ],
    fingerprint: FINGERPRINT,
    timeZone: "Asia/Amman",
    labels: {
      page: "صفحة {n} من {total}",
      evidenceTitle: "إثبات التوقيع الإلكتروني",
      signedAt: "وقت التوقيع",
      notSigned: "لم يوقّع بعد",
      fingerprint: "بصمة الشروط (SHA-256)",
      ipHash: "بصمة عنوان IP",
      evidenceNote:
        "هذه الصفحة سجل إثبات للتوقيع الإلكتروني وفق قانون المعاملات الإلكترونية. البصمة أعلاه تُحسب من نص الشروط كما عُرض ووُقّع، وأي تعديل على الشروط يغيّرها.",
    },
  };
}

function englishDoc(image: Uint8Array): LegalDocument {
  return {
    kind: "nda",
    locale: "en",
    dir: "ltr",
    title: "Non-Disclosure Agreement",
    number: "NDA-2026-0007",
    subtitle: "Evaluation of a joint campaign",
    blocks: [
      {
        heading: "Confidential information",
        paragraphs: [
          "Each party may disclose business, technical or financial information to the other. The receiving party shall keep it confidential and use it only for the purpose stated above. ".repeat(6),
        ],
        bullets: ["Client lists and pricing", "Campaign results for شركة الأمل"],
      },
      ...Array.from({ length: 6 }, (_, i) => ({
        heading: `Clause ${i + 2}`,
        paragraphs: ["This clause survives termination of the agreement for a period of two (2) years. ".repeat(4)],
        numbered: [{ title: "Obligation", detail: "Return or destroy materials on request.", lines: ["Within 10 days"] }],
      })),
    ],
    signatures: [
      { role: "Agency", party: "Sawwiq Digital", signerName: "Jane Doe", signedAt: new Date("2026-09-21T12:00:00Z"), image, ipHash: "abc123" },
      { role: "Client", party: "Al Amal Trading", signerName: null, signedAt: null },
    ],
    fingerprint: FINGERPRINT,
    timeZone: "Asia/Riyadh",
    labels: {
      page: "Page {n} of {total}",
      evidenceTitle: "Electronic signature evidence",
      signedAt: "Signed at",
      notSigned: "Not signed yet",
      fingerprint: "Terms fingerprint (SHA-256)",
      ipHash: "IP hash",
      evidenceNote: "This page records the electronic signatures on this document.",
    },
  };
}

const pageCount = (pdf: Buffer) => (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;

describe("renderLegalPdf", () => {
  it("renders an Arabic contract with an evidence page", async () => {
    const pdf = await renderLegalPdf(arabicDoc(new Uint8Array(png)));
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pageCount(pdf)).toBeGreaterThan(1);
    const raw = pdf.toString("latin1");
    expect(raw).toContain("/FontName /NotoSansArabic");
    expect(raw).toContain("/Creator (Sawwiq)");
    // Created at the signing time, not at render time.
    expect(raw).toContain("/CreationDate (D:20260920091500+00'00')");
    if (process.env.LEGAL_PDF_SAMPLE) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(process.env.LEGAL_PDF_SAMPLE, pdf);
    }
  });

  it("renders an English NDA across several pages", async () => {
    const pdf = await renderLegalPdf(englishDoc(new Uint8Array(png)));
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pageCount(pdf)).toBeGreaterThan(2);
    if (process.env.LEGAL_PDF_SAMPLE_EN) {
      const { writeFile } = await import("node:fs/promises");
      await writeFile(process.env.LEGAL_PDF_SAMPLE_EN, pdf);
    }
  });

  it("is deterministic for the same document", async () => {
    const doc = arabicDoc(new Uint8Array(png));
    const [a, b] = await Promise.all([renderLegalPdf(doc), renderLegalPdf(doc)]);
    expect(a.equals(b)).toBe(true);
  });

  it("survives an unreadable signature image", async () => {
    const pdf = await renderLegalPdf(englishDoc(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])));
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});

describe("pdf helpers", () => {
  it("fills page label patterns", () => {
    expect(pageLabel("Page {n} of {total}", 2, 5)).toBe("Page 2 of 5");
    expect(pageLabel("صفحة", 1, 3)).toBe("صفحة 1 / 3");
  });

  it("formats the signing time in the document's time zone", () => {
    const at = new Date("2026-09-20T09:15:00Z");
    expect(formatSignedAt(at, "en", "Asia/Amman")).toContain("12:15:00");
    expect(formatSignedAt(at, "en", "Asia/Amman")).toContain("(Asia/Amman)");
    expect(formatSignedAt(at, "ar", "Asia/Amman")).toContain("12:15:00");
    expect(formatSignedAt(at, "en", "Not/AZone")).toContain("09:15:00");
  });

  it("keeps a Latin word and its number together on an Arabic line", () => {
    const runs = splitVisualRuns("المجموع: 120 JOD");
    expect(runs.find((r) => r.dir === "ltr")?.text.trim()).toBe("120 JOD");
    const ltr = splitVisualRuns("Client شركة 5 نجوم", "ltr");
    expect(ltr[0].text.trim()).toBe("Client");
    expect(ltr[ltr.length - 1].text.trim()).toBe("شركة");
  });
});

describe("parseSignatureDataUrl", () => {
  it("accepts a real PNG data URL", () => {
    const bytes = parseSignatureDataUrl(`data:image/png;base64,${png.toString("base64")}`);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(bytes!).equals(png)).toBe(true);
  });

  it("rejects everything else", () => {
    expect(parseSignatureDataUrl(undefined)).toBeNull();
    expect(parseSignatureDataUrl(42)).toBeNull();
    expect(parseSignatureDataUrl("")).toBeNull();
    expect(parseSignatureDataUrl("data:image/png;base64,")).toBeNull();
    expect(parseSignatureDataUrl(`data:image/jpeg;base64,${png.toString("base64")}`)).toBeNull();
    expect(parseSignatureDataUrl(`data:image/png;base64,${Buffer.from("GIF89a not a png at all!!").toString("base64")}`)).toBeNull();
    expect(parseSignatureDataUrl("data:image/png;base64,***")).toBeNull();
    const huge = Buffer.concat([png.subarray(0, 8), Buffer.alloc(MAX_SIGNATURE_BYTES + 1)]);
    expect(parseSignatureDataUrl(`data:image/png;base64,${huge.toString("base64")}`)).toBeNull();
  });
});
