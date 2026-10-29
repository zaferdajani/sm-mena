// What Studio → Import sends to the server to read a portfolio
// (analyzePortfolioAction). Vercel refuses a request body over 4.5 MB, whatever
// Next allows, and 40 pages with a 220 KB thumbnail each are about 12 MB as
// base64. Page images only help when Claude reads the portfolio, and Claude
// sees only the first IMPORT_LIMITS.aiPages pages, so those are the only ones
// sent, and only while the request stays inside the budget. Text always goes.

import { IMPORT_LIMITS } from "./types";

export const ANALYZE_BUDGET_BYTES = 3_000_000;

export type AnalyzePage = { index: number; text: string; image: string | null; layout: string; crops: number; cropTexts: string[] };

export function analysisPayload(pages: AnalyzePage[], withImages: boolean): AnalyzePage[] {
  let used = new TextEncoder().encode(JSON.stringify(pages.map((p) => ({ ...p, image: null })))).length;
  return pages.map((p, n) => {
    const image = withImages && n < IMPORT_LIMITS.aiPages && p.image && used + p.image.length <= ANALYZE_BUDGET_BYTES ? p.image : null;
    if (image) used += image.length;
    return { ...p, image };
  });
}
