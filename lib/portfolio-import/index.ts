import "server-only";
import type { CountryCode } from "@/lib/countries";
import { aiImportAvailable, planWithAi } from "./ai";
import { planFromText } from "./rules";
import type { ImportPage, ImportPlan } from "./types";

/** Claude reads the portfolio when configured; otherwise (or if it fails) the page-text rules do. */
export async function analyzePortfolio(pages: ImportPage[], agency: { name: string; services: string[]; country: CountryCode }, locale: string): Promise<ImportPlan> {
  if (aiImportAvailable()) {
    try {
      return await planWithAi(pages, agency, locale);
    } catch (e) {
      console.error("[portfolio-import] AI failed, using rules:", e instanceof Error ? e.message : e);
    }
  }
  return planFromText(pages, agency.country, agency.services);
}
