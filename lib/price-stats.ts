// One way to summarise prices everywhere on Sawwiq (hire pages, the matcher's
// budget question, AI tools): a standard median and interpolated quartiles, on
// agencies' own prices only, with the sample size kept beside the numbers.

/** Below this many prices we don't present a range as market information. */
export const MIN_PRICE_SAMPLE = 3;

const sorted = (xs: number[]) => xs.filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);

/** Linear-interpolated quantile (p in 0..1) of already sorted values. */
function quantileSorted(v: number[], p: number): number {
  if (v.length === 1) return v[0];
  const i = (v.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return v[lo] + (v[hi] - v[lo]) * (i - lo);
}

/** Standard median: the middle value, or the average of the two middle values. */
export function median(xs: number[]): number | null {
  const v = sorted(xs);
  return v.length ? Math.round(quantileSorted(v, 0.5)) : null;
}

export type PriceSummary = { n: number; min: number; max: number; median: number; p25: number; p75: number };

export function summarizePrices(xs: number[]): PriceSummary | null {
  const v = sorted(xs);
  if (!v.length) return null;
  return {
    n: v.length,
    min: v[0],
    max: v[v.length - 1],
    median: Math.round(quantileSorted(v, 0.5)),
    p25: Math.round(quantileSorted(v, 0.25)),
    p75: Math.round(quantileSorted(v, 0.75)),
  };
}
