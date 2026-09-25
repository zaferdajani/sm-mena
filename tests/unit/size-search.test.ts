import { describe, expect, it } from "vitest";
import { dedupeDescending, searchLargestUnderTarget, searchSmallestPassing } from "@/lib/media/size-search";

/** A fake encoder whose output grows with the parameter; records every param it was asked for. */
function encoder(size: (param: number) => number) {
  const calls: number[] = [];
  return {
    calls,
    render: async (param: number) => {
      calls.push(param);
      return { param, bytes: size(param) };
    },
    sizeOf: (c: { bytes: number }) => c.bytes,
  };
}

describe("searchLargestUnderTarget", () => {
  it("stops at the first rung when it already fits", async () => {
    const e = encoder((q) => q * 1000);
    const r = await searchLargestUnderTarget({ ...e, targetBytes: 100_000, ladder: [82, 74, 66] });
    expect(r).toMatchObject({ param: 82, bytes: 82_000, hitTarget: true, attempts: 1 });
    expect(e.calls).toEqual([82]);
  });

  it("refines inside the bracket and keeps the largest render under the budget", async () => {
    const e = encoder((q) => q * 1000);
    const r = await searchLargestUnderTarget({ ...e, targetBytes: 78_500, ladder: [82, 74, 66, 58], round: Math.round, epsilon: 1, goodEnough: 0.999 });
    // The ladder alone would stop at 74 (74 KB); refinement climbs to 78 (78 KB).
    expect(e.calls.slice(0, 2)).toEqual([82, 74]);
    expect(r.param).toBe(78);
    expect(r.bytes).toBe(78_000);
    expect(r.hitTarget).toBe(true);
    expect(r.bytes).toBeLessThanOrEqual(78_500);
  });

  it("returns the smallest render over the budget with hitTarget=false when nothing fits", async () => {
    const e = encoder((q) => 100_000 + q * 10);
    const r = await searchLargestUnderTarget({ ...e, targetBytes: 50_000, ladder: [50, 82, 66] });
    expect(e.calls).toEqual([82, 66, 50]); // walked highest fidelity first
    expect(r).toMatchObject({ param: 50, bytes: 100_500, hitTarget: false, attempts: 3 });
  });

  it("rounds midpoints to integers and never re-renders a value it already tried", async () => {
    const e = encoder((q) => q * 1000);
    await searchLargestUnderTarget({ ...e, targetBytes: 81_500, ladder: [82, 74], round: Math.round, epsilon: 1, goodEnough: 1, maxRefine: 10 });
    expect(e.calls.every(Number.isInteger)).toBe(true);
    expect(new Set(e.calls).size).toBe(e.calls.length);
    expect(e.calls.at(-1)).toBe(81);
  });

  it("keeps the earlier render when a higher param comes out smaller (non-monotonic encoder)", async () => {
    // 78 fits but is smaller than 74, which an encoder can do on noisy input.
    const sizes: Record<number, number> = { 82: 90_000, 74: 70_000, 78: 65_000, 80: 95_000, 79: 88_000 };
    const e = encoder((q) => sizes[q] ?? 99_999);
    const r = await searchLargestUnderTarget({ ...e, targetBytes: 80_000, ladder: [82, 74], round: Math.round, epsilon: 1, goodEnough: 0.99 });
    expect(r.param).toBe(74);
    expect(r.bytes).toBe(70_000);
    expect(r.hitTarget).toBe(true);
  });

  it("uses knownOver as the upper bracket so a fitting first rung can still be refined upwards", async () => {
    const e = encoder((q) => q * 1000);
    const r = await searchLargestUnderTarget({ ...e, targetBytes: 90_000, ladder: [80], knownOver: 92, round: Math.round, epsilon: 1, goodEnough: 0.999 });
    expect(r.param).toBe(90);
  });

  it("renders once at the floor for an impossible budget", async () => {
    const e = encoder((q) => q);
    const r = await searchLargestUnderTarget({ ...e, targetBytes: 0, ladder: [3, 2, 1] });
    expect(e.calls).toEqual([1]);
    expect(r.hitTarget).toBe(false);
  });

  it("stops when aborted", async () => {
    const e = encoder((q) => q);
    const ac = new AbortController();
    ac.abort();
    await expect(searchLargestUnderTarget({ ...e, targetBytes: 10, ladder: [1], signal: ac.signal })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects an empty ladder", async () => {
    const e = encoder((q) => q);
    await expect(searchLargestUnderTarget({ ...e, targetBytes: 10, ladder: [] })).rejects.toThrow();
  });
});

describe("dedupeDescending", () => {
  it("sorts high to low and drops duplicates", () => {
    expect(dedupeDescending([40, 82, 58, 82, 40])).toEqual([82, 58, 40]);
  });
});

describe("searchSmallestPassing", () => {
  /** Quality q gives q KB, and looks the same as the source from `threshold` up. */
  const setup = (threshold: number) => {
    const calls: number[] = [];
    return {
      calls,
      render: async (q: number) => {
        calls.push(q);
        return { q, bytes: q * 1000 };
      },
      sizeOf: (c: { bytes: number }) => c.bytes,
      passes: (c: { q: number }) => c.q >= threshold,
    };
  };

  it("walks down the ladder and refines to the lowest quality that still passes", async () => {
    const e = setup(83);
    const r = await searchSmallestPassing({ ...e, ladder: [90, 80, 70], round: Math.round, epsilon: 1, maxRefine: 6 });
    expect(e.calls.slice(0, 2)).toEqual([90, 80]);
    expect(r).toMatchObject({ param: 83, bytes: 83_000, passed: true });
  });

  it("returns the bottom rung when every rung passes", async () => {
    const e = setup(0);
    const r = await searchSmallestPassing({ ...e, ladder: [90, 70, 40] });
    expect(e.calls).toEqual([90, 70, 40]);
    expect(r).toMatchObject({ param: 40, passed: true });
  });

  it("reports passed=false with the highest-fidelity render when nothing passes", async () => {
    const e = setup(99);
    const r = await searchSmallestPassing({ ...e, ladder: [90, 80] });
    expect(e.calls).toEqual([90]);
    expect(r).toMatchObject({ param: 90, passed: false });
  });

  it("climbs the `above` rungs when the first rung fails, then refines between them", async () => {
    const e = setup(88);
    const r = await searchSmallestPassing({ ...e, ladder: [85, 70], above: [97, 92], round: Math.round, epsilon: 1, maxRefine: 6 });
    expect(e.calls.slice(0, 2)).toEqual([85, 92]);
    expect(r).toMatchObject({ param: 88, passed: true });
  });

  it("returns the highest rung tried when nothing passes even above the ladder", async () => {
    const e = setup(100);
    const r = await searchSmallestPassing({ ...e, ladder: [85], above: [92, 97] });
    expect(e.calls).toEqual([85, 92, 97]);
    expect(r).toMatchObject({ param: 97, passed: false });
  });

  it("keeps the smallest passing render when a lower quality comes out bigger", async () => {
    const sizes: Record<number, number> = { 90: 900, 80: 500, 85: 600, 70: 400 };
    const r = await searchSmallestPassing({
      render: async (q) => ({ q, bytes: sizes[q] }),
      sizeOf: (c) => c.bytes,
      passes: (c) => c.q >= 80,
      ladder: [90, 80, 70],
      round: Math.round,
      epsilon: 1,
    });
    expect(r).toMatchObject({ param: 80, bytes: 500 });
  });
});
