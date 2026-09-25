/**
 * "Biggest render that still fits" search, ported from OneClickConvert
 * (src/utils/binarySearchQuality.ts). Pure: no DOM or Node APIs, so the same
 * code drives sharp on the server, the canvas encoder in the browser and
 * ffmpeg.wasm for background videos.
 *
 * Encoders are only roughly monotonic in quality/scale, so we probe a short
 * descending ladder to bracket the target, then binary-search inside that
 * bracket and keep the LARGEST passing render. Stepping down a ladder and
 * returning the first thing that fits wastes most of the budget; the
 * refinement pass is what pulls the result back up towards it.
 */

export interface SizeSearchOptions<T> {
  /** Render a candidate for a parameter value. Higher param must mean bigger output. */
  render: (param: number) => Promise<T>;
  sizeOf: (candidate: T) => number;
  /** Hard ceiling in bytes. */
  targetBytes: number;
  /** Probe values, highest fidelity first (descending, non-empty). */
  ladder: number[];
  /** Extra renders spent narrowing the bracket. */
  maxRefine?: number;
  /** Stop refining once a passing render fills this share of the budget. */
  goodEnough?: number;
  /** Parameter resolution below which another render tells us nothing new. */
  epsilon?: number;
  /** Called after each render with the running attempt count. */
  onAttempt?: (attempts: number) => void;
  /** A param the caller already rendered and found too big; seeds the upper bracket. */
  knownOver?: number;
  /** Snaps a midpoint to a value the encoder actually distinguishes (integer qualities, CRF steps). */
  round?: (param: number) => number;
  signal?: AbortSignal;
}

export interface SizeSearchResult<T> {
  candidate: T;
  param: number;
  bytes: number;
  /** False when even the lowest ladder rung stayed over target. */
  hitTarget: boolean;
  attempts: number;
}

interface Probe<T> {
  candidate: T;
  param: number;
  bytes: number;
}

function abortIfNeeded(signal?: AbortSignal) {
  if (signal?.aborted) throw Object.assign(new Error("Aborted"), { name: "AbortError" });
}

export async function searchLargestUnderTarget<T>(opts: SizeSearchOptions<T>): Promise<SizeSearchResult<T>> {
  const { render, sizeOf, targetBytes, maxRefine = 5, goodEnough = 0.9, epsilon = 0.01, onAttempt, signal } = opts;

  const ladder = dedupeDescending(opts.ladder);
  if (!ladder.length) throw new Error("searchLargestUnderTarget needs at least one ladder value");

  let attempts = 0;
  const probe = async (param: number): Promise<Probe<T>> => {
    abortIfNeeded(signal);
    const candidate = await render(param);
    attempts++;
    onAttempt?.(attempts);
    return { candidate, param, bytes: sizeOf(candidate) };
  };

  // Impossible budget: one render at the floor beats walking the whole ladder.
  if (!(targetBytes > 0)) {
    const floor = await probe(ladder[ladder.length - 1]);
    return { ...floor, hitTarget: false, attempts };
  }

  let best: Probe<T> | null = null; // largest render that fits
  let smallestOver: Probe<T> | null = null; // fallback when nothing fits
  let overParam: number | null = opts.knownOver ?? null; // lowest param known to overflow

  for (const param of ladder) {
    const p = await probe(param);
    if (p.bytes <= targetBytes) {
      best = p;
      break;
    }
    overParam = param;
    if (!smallestOver || p.bytes < smallestOver.bytes) smallestOver = p;
  }

  // Refine only when we have both ends of a bracket: a render that fits and one that does not.
  if (best && overParam !== null) {
    let lo = best.param; // known good
    let hi = overParam; // known too big
    for (let i = 0; i < maxRefine; i++) {
      if (best.bytes >= targetBytes * goodEnough) break;
      if (hi - lo <= epsilon) break;
      const mid = opts.round ? opts.round((lo + hi) / 2) : (lo + hi) / 2;
      if (mid <= lo || mid >= hi) break; // rounding landed on a value already tried
      const p = await probe(mid);
      if (p.bytes <= targetBytes) {
        // Guarded against encoder non-monotonicity: only keep genuine gains.
        if (p.bytes > best.bytes) best = p;
        lo = p.param;
      } else {
        hi = p.param;
        if (!smallestOver || p.bytes < smallestOver.bytes) smallestOver = p;
      }
    }
  }

  const winner = (best ?? smallestOver)!;
  return { ...winner, hitTarget: winner.bytes <= targetBytes, attempts };
}

/** Sorts descending and drops duplicates so ladders can be built by filtering and concatenation. */
export function dedupeDescending(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => b - a);
}

export interface QualitySearchOptions<T> {
  /** Render a candidate for a parameter value. Higher param must mean higher fidelity. */
  render: (param: number) => Promise<T>;
  sizeOf: (candidate: T) => number;
  /** True when a candidate still looks like the source (e.g. SSIM ≥ floor). */
  passes: (candidate: T) => boolean | Promise<boolean>;
  /** Probe values, highest fidelity first (descending, non-empty). */
  ladder: number[];
  /**
   * Higher-fidelity values tried in ascending order only when the first ladder
   * rung already fails. Keeps the common case cheap (the ladder can start in
   * the middle) without giving up when a source needs more than that.
   */
  above?: number[];
  maxRefine?: number;
  epsilon?: number;
  round?: (param: number) => number;
  onAttempt?: (attempts: number) => void;
  signal?: AbortSignal;
}

export interface QualitySearchResult<T> {
  candidate: T;
  param: number;
  bytes: number;
  /** False when even the highest-fidelity rung failed the check (the caller should fall back, e.g. to lossless). */
  passed: boolean;
  attempts: number;
}

/**
 * The same bracket-and-refine shape, turned around for "same quality, fewest
 * bytes": walk the ladder down while renders still pass the quality check,
 * then binary-search between the last pass and the first failure for the
 * lowest parameter that passes, and return the SMALLEST passing render
 * (guarded against encoders that are not perfectly monotonic).
 */
export async function searchSmallestPassing<T>(opts: QualitySearchOptions<T>): Promise<QualitySearchResult<T>> {
  const { render, sizeOf, passes, maxRefine = 4, epsilon = 1, onAttempt, signal } = opts;
  const ladder = dedupeDescending(opts.ladder);
  if (!ladder.length) throw new Error("searchSmallestPassing needs at least one ladder value");

  let attempts = 0;
  const probe = async (param: number) => {
    abortIfNeeded(signal);
    const candidate = await render(param);
    attempts++;
    onAttempt?.(attempts);
    return { candidate, param, bytes: sizeOf(candidate), ok: await passes(candidate) };
  };

  let best: Probe<T> | null = null; // smallest render that passes
  let first: Probe<T> | null = null; // highest-fidelity render, the answer when nothing passes
  let failParam: number | null = null; // highest param known to fail
  let passParam: number | null = null; // lowest param known to pass
  for (const param of ladder) {
    const p = await probe(param);
    first ??= p;
    if (!p.ok) {
      failParam = param;
      break;
    }
    passParam = param;
    if (!best || p.bytes < best.bytes) best = p;
  }

  // The first rung failed: climb until something passes, which brackets the answer from above.
  if (!best && failParam !== null) {
    for (const param of [...new Set(opts.above ?? [])].filter((v) => v > failParam!).sort((a, b) => a - b)) {
      const p = await probe(param);
      if (p.ok) {
        best = p;
        passParam = param;
        break;
      }
      failParam = param;
      first = p; // the highest fidelity tried so far
    }
  }

  if (best && passParam !== null && failParam !== null) {
    let lo = failParam; // fails
    let hi = passParam; // passes
    for (let i = 0; i < maxRefine; i++) {
      if (hi - lo <= epsilon) break;
      const mid = opts.round ? opts.round((lo + hi) / 2) : (lo + hi) / 2;
      if (mid <= lo || mid >= hi) break;
      const p = await probe(mid);
      if (p.ok) {
        hi = mid;
        if (p.bytes < best.bytes) best = p;
      } else {
        lo = mid;
      }
    }
  }

  const winner = best ?? first!;
  return { candidate: winner.candidate, param: winner.param, bytes: winner.bytes, passed: best !== null, attempts };
}
