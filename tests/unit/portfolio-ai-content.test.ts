import { describe, expect, it } from "vitest";
import { aiContent } from "@/lib/portfolio-import/ai";
import { IMPORT_LIMITS, type ImportPage } from "@/lib/portfolio-import/types";

// A 48-page portfolio used to lose everything past page 40 (never read) and past page 24 (never shown to
// Claude). Now every page's text reaches the model; the first 24 also as pictures.
const page = (index: number): ImportPage => ({ index, text: `Project ${index + 1}: brand launch ${"x".repeat(3000)}`, image: `data:image/jpeg;base64,${"A".repeat(100)}`, layout: "single", crops: 1, cropTexts: [] });
const agency = { name: "Studio", services: ["smm_management"] };

describe("what Claude reads of a portfolio", () => {
  it("includes every page's text and the first pages as pictures", () => {
    const pages = Array.from({ length: 48 }, (_, i) => page(i));
    const content = aiContent(pages, agency, "ar");
    const texts = content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text);
    for (let i = 0; i < 48; i++) expect(texts.some((t) => t.startsWith(`Page ${i}`))).toBe(true);
    expect(content.filter((b) => b.type === "image")).toHaveLength(IMPORT_LIMITS.aiPages);
    expect(texts[0]).toContain("48 pages");
  });

  it("shortens each page's text evenly on a long portfolio so the whole thing fits", () => {
    const pages = Array.from({ length: IMPORT_LIMITS.pages }, (_, i) => page(i));
    const total = aiContent(pages, agency, "en").filter((b) => b.type === "text").reduce((n, b) => n + (b as { text: string }).text.length, 0);
    expect(total).toBeLessThanOrEqual(IMPORT_LIMITS.aiTextChars + IMPORT_LIMITS.pages * 60 + 400);
  });
});
