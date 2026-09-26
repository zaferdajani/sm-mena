import { describe, expect, it } from "vitest";
import { median, MIN_PRICE_SAMPLE, summarizePrices } from "@/lib/price-stats";
import { suggestBudget } from "@/lib/matching/score";

describe("price stats", () => {
  it("uses the standard median (average of the two middle values)", () => {
    expect(median([100, 200, 300, 400])).toBe(250);
    expect(median([300, 100, 200])).toBe(200);
    expect(median([])).toBeNull();
  });

  it("ignores missing, zero and negative prices", () => {
    expect(summarizePrices([0, -5, Number.NaN, 150])).toEqual({ n: 1, min: 150, max: 150, median: 150, p25: 150, p75: 150 });
  });

  it("interpolates quartiles, and the matcher's budget uses the same numbers", () => {
    const s = summarizePrices([100, 200, 300, 400])!;
    expect(s).toMatchObject({ n: 4, min: 100, max: 400, median: 250, p25: 175, p75: 325 });
    expect(suggestBudget([100, 200, 300, 400])).toEqual({ min: 175, median: 250, max: 325, n: 4 });
  });

  it("needs a minimum sample before a range is shown as market data", () => {
    expect(MIN_PRICE_SAMPLE).toBe(3);
  });
});
