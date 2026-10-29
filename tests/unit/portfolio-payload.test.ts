import { describe, expect, it } from "vitest";
import { ANALYZE_BUDGET_BYTES, analysisPayload, type AnalyzePage } from "@/lib/portfolio-import/payload";
import { IMPORT_LIMITS } from "@/lib/portfolio-import/types";

// Report 206D1DBD: a full-size portfolio failed with "couldn't read the file".
// The pages were read; the request carrying them to the server was over
// Vercel's 4.5 MB body limit, so it never arrived.
const VERCEL_BODY_LIMIT = 4.5 * 1024 * 1024;
const thumb = `data:image/jpeg;base64,${"A".repeat(Math.ceil(IMPORT_LIMITS.thumbBytes * 1.34))}`;
const page = (index: number): AnalyzePage => ({ index, text: "مشروع إطلاق علامة تجارية لمطعم في عمّان ".repeat(90), image: thumb, layout: "single", crops: 1, cropTexts: [] });
const portfolio = Array.from({ length: IMPORT_LIMITS.pages }, (_, i) => page(i));
const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;

describe("what the importer sends to be read", () => {
  it("was too big before: the full portfolio with every thumbnail", () => {
    expect(bytes(portfolio)).toBeGreaterThan(VERCEL_BODY_LIMIT);
  });

  it("stays inside the budget with Claude reading, keeping every page's text", () => {
    const sent = analysisPayload(portfolio, true);
    expect(bytes(sent)).toBeLessThanOrEqual(ANALYZE_BUDGET_BYTES + 1000);
    expect(bytes(sent)).toBeLessThan(VERCEL_BODY_LIMIT);
    expect(sent).toHaveLength(IMPORT_LIMITS.pages);
    expect(sent.every((p, i) => p.text === portfolio[i].text)).toBe(true);
    expect(sent[0].image).toBe(thumb);
    expect(sent.slice(IMPORT_LIMITS.aiPages).every((p) => p.image === null)).toBe(true);
  });

  it("sends no images when no AI will look at them", () => {
    const sent = analysisPayload(portfolio, false);
    expect(sent.every((p) => p.image === null)).toBe(true);
    expect(bytes(sent)).toBeLessThan(1_000_000);
  });

  it("keeps every thumbnail of a short portfolio", () => {
    const short = portfolio.slice(0, 4);
    expect(analysisPayload(short, true).map((p) => p.image)).toEqual(short.map(() => thumb));
  });
});
