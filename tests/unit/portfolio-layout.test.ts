import { describe, expect, it } from "vitest";
import { analyzeLayout, backgroundOf, padBox, type Pixels } from "@/lib/portfolio-import/layout";

/** A page of one colour with rectangles painted on it. */
function paint(width: number, height: number, bg: [number, number, number], boxes: { x: number; y: number; w: number; h: number; c?: [number, number, number] }[]): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([...bg, 255], i * 4);
  for (const b of boxes) {
    const c = b.c ?? [20, 40, 160];
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) data.set([...c, 255], (y * width + x) * 4);
  }
  return { width, height, data };
}

describe("reading a page's layout from its pixels", () => {
  it("finds the page's colour along its edges", () => {
    expect(backgroundOf(paint(200, 100, [250, 240, 200], [{ x: 50, y: 20, w: 100, h: 60 }]))).toEqual([250, 240, 200]);
  });

  it("sees a photo grid: alike pieces in rows and columns", () => {
    const boxes = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) boxes.push({ x: 40 + c * 230, y: 200 + r * 260, w: 200, h: 220 });
    const layout = analyzeLayout(paint(740, 760, [255, 255, 255], [{ x: 40, y: 30, w: 300, h: 40, c: [0, 0, 0] }, ...boxes]));
    expect(layout.kind).toBe("gallery");
    expect(layout.boxes).toHaveLength(6);
    expect(layout.header).not.toBeNull();
    // Reading order: first row first.
    expect(layout.boxes[0].y).toBeLessThan(layout.boxes[3].y);
  });

  it("sees a logo wall: many small pieces spread over the page", () => {
    const boxes = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) boxes.push({ x: 60 + c * 170, y: 180 + r * 190, w: 90, h: 50 });
    const layout = analyzeLayout(paint(740, 760, [20, 24, 36], boxes.map((b) => ({ ...b, c: [230, 200, 60] as [number, number, number] }))));
    expect(layout.kind).toBe("logos");
    expect(layout.boxes).toHaveLength(12);
    expect(layout.background).toEqual([20, 24, 36]);
  });

  it("sees one block on an empty page (a cover's logo), and a plain page otherwise", () => {
    expect(analyzeLayout(paint(740, 760, [255, 255, 255], [{ x: 220, y: 300, w: 300, h: 160 }])).kind).toBe("single");
    expect(analyzeLayout(paint(740, 760, [255, 255, 255], [])).kind).toBe("plain");
  });

  it("pads a crop a little and keeps it on the page", () => {
    expect(padBox({ x: 0, y: 0, w: 100, h: 100 }, 120, 120)).toEqual({ x: 0, y: 0, w: 108, h: 108 });
    expect(padBox({ x: 100, y: 100, w: 100, h: 100 }, 150, 150)).toEqual({ x: 96, y: 96, w: 54, h: 54 });
  });
});
