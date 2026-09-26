// Layout analysis of a portfolio page from its pixels (docs/36). Pure, so it
// runs in the browser (from a canvas) and in unit tests.
//
// Pages are read with a grid cut: the page is split into horizontal bands at
// the empty gutters that cross it, each band is split at its empty columns,
// and each piece once more into rows. The pieces tell the page's layout:
//   - a gallery: several photo-sized pieces in a grid ("Our work"), each of
//     which makes a far better post image than the whole page;
//   - a logo wall: many small pieces spread over the page ("Our clients");
//   - a single block on an otherwise empty page (a cover with the logo).

export type Pixels = { width: number; height: number; data: Uint8ClampedArray | Uint8Array | number[] };
export type Box = { x: number; y: number; w: number; h: number };
export type Layout = {
  kind: "gallery" | "logos" | "single" | "plain";
  /** The items (photos, logos or the one block), in reading order. */
  boxes: Box[];
  /** The page's own colour, for padding crops. */
  background: [number, number, number];
  /** A header strip at the top (title, brand tab), if the page has one. */
  header: Box | null;
};

const CELLS = 240; // analysis columns; one cell is a few page pixels
const DIFF = 60; // colour distance from the background that counts as content
const MARGIN = 0.015; // frame lines hug the page edge; ignore that strip

/** The page's background: the most common colour along its edges (quantised). */
export function backgroundOf(px: Pixels): [number, number, number] {
  const counts = new Map<number, { n: number; r: number; g: number; b: number }>();
  const sample = (x: number, y: number) => {
    const i = (y * px.width + x) * 4;
    const r = px.data[i];
    const g = px.data[i + 1];
    const b = px.data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const c = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    c.n++;
    c.r += r;
    c.g += g;
    c.b += b;
    counts.set(key, c);
  };
  const step = Math.max(1, Math.floor(px.width / 200));
  for (const f of [0, 0.02, 0.98, 1]) {
    const y = Math.min(px.height - 1, Math.floor(px.height * f));
    const x = Math.min(px.width - 1, Math.floor(px.width * f));
    for (let i = 0; i < px.width; i += step) sample(i, y);
    for (let i = 0; i < px.height; i += step) sample(x, i);
  }
  let best = { n: 0, r: 255, g: 255, b: 255 };
  for (const c of counts.values()) if (c.n > best.n) best = c;
  return [Math.round(best.r / best.n), Math.round(best.g / best.n), Math.round(best.b / best.n)];
}

type Grid = { cells: Uint8Array; cols: number; rows: number; cell: number };

/** Content cells: enough of the cell's pixels differ from the background. The edge strip is blanked. */
function contentGrid(px: Pixels, bg: [number, number, number]): Grid {
  const cols = CELLS;
  const cell = px.width / cols;
  const rows = Math.max(1, Math.round(px.height / cell));
  const cells = new Uint8Array(cols * rows);
  const mx = Math.ceil(cols * MARGIN);
  const my = Math.ceil(rows * MARGIN);
  const step = Math.max(1, Math.floor(cell / 3));
  for (let cy = my; cy < rows - my; cy++) {
    for (let cx = mx; cx < cols - mx; cx++) {
      const x0 = Math.floor(cx * cell);
      const y0 = Math.floor(cy * cell);
      const x1 = Math.min(px.width, Math.ceil((cx + 1) * cell));
      const y1 = Math.min(px.height, Math.ceil((cy + 1) * cell));
      let far = 0;
      let n = 0;
      for (let y = y0; y < y1; y += step) {
        for (let x = x0; x < x1; x += step) {
          const i = (y * px.width + x) * 4;
          if (Math.abs(px.data[i] - bg[0]) + Math.abs(px.data[i + 1] - bg[1]) + Math.abs(px.data[i + 2] - bg[2]) > DIFF) far++;
          n++;
        }
      }
      cells[cy * cols + cx] = n && far / n >= 0.2 ? 1 : 0;
    }
  }
  return { cells, cols, rows, cell };
}

type Region = { x0: number; y0: number; x1: number; y1: number }; // in cells, x1/y1 exclusive

/** Runs of non-empty lines along one axis, split by gutters of at least `minGap` empty lines. */
function runs(g: Grid, r: Region, axis: "rows" | "cols", minGap: number): [number, number][] {
  const n = axis === "rows" ? r.y1 - r.y0 : r.x1 - r.x0;
  const filled = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) {
    let any = false;
    if (axis === "rows") {
      for (let x = r.x0; x < r.x1 && !any; x++) any = g.cells[(r.y0 + i) * g.cols + x] === 1;
    } else {
      for (let y = r.y0; y < r.y1 && !any; y++) any = g.cells[y * g.cols + r.x0 + i] === 1;
    }
    filled[i] = any;
  }
  const out: [number, number][] = [];
  let start = -1;
  let gap = 0;
  for (let i = 0; i <= n; i++) {
    const on = i < n && filled[i];
    if (on) {
      if (start < 0) start = i;
      gap = 0;
    } else if (start >= 0) {
      gap++;
      if (gap >= minGap || i === n) {
        out.push([start, i - gap + (i === n && !filled[n - 1] ? 0 : 0)]);
        start = -1;
        gap = 0;
      }
    }
  }
  // Trim trailing empties inside each run (a run ends where the last filled line is).
  return out.map(([a, b]) => {
    let end = b;
    while (end > a && !filled[end - 1]) end--;
    return [a, end];
  });
}

/** Recursive grid cut: bands, then columns, then rows once more. Leaves are content pieces. */
function cut(g: Grid, r: Region, depth: number, minGapCells: number, out: { box: Region; band: number }[], band: number) {
  const axis = depth % 2 === 0 ? "rows" : "cols";
  const parts = runs(g, r, axis, minGapCells);
  if (!parts.length) return;
  if (parts.length === 1 && depth > 0) {
    const [a, b] = parts[0];
    const piece = axis === "rows" ? { ...r, y0: r.y0 + a, y1: r.y0 + b } : { ...r, x0: r.x0 + a, x1: r.x0 + b };
    if (depth >= 3) out.push({ box: tight(g, piece), band });
    else cut(g, piece, depth + 1, minGapCells, out, band);
    return;
  }
  parts.forEach(([a, b], i) => {
    const piece = axis === "rows" ? { ...r, y0: r.y0 + a, y1: r.y0 + b } : { ...r, x0: r.x0 + a, x1: r.x0 + b };
    const nextBand = depth === 0 ? i : band;
    if (depth >= 3) out.push({ box: tight(g, piece), band: nextBand });
    else cut(g, piece, depth + 1, minGapCells, out, nextBand);
  });
}

/** Shrinks a region to the cells it actually contains. */
function tight(g: Grid, r: Region): Region {
  let x0 = r.x1;
  let y0 = r.y1;
  let x1 = r.x0;
  let y1 = r.y0;
  for (let y = r.y0; y < r.y1; y++) {
    for (let x = r.x0; x < r.x1; x++) {
      if (!g.cells[y * g.cols + x]) continue;
      if (x < x0) x0 = x;
      if (x + 1 > x1) x1 = x + 1;
      if (y < y0) y0 = y;
      if (y + 1 > y1) y1 = y + 1;
    }
  }
  return x1 > x0 ? { x0, y0, x1, y1 } : r;
}

const toBox = (r: Region, cell: number, px: Pixels): Box => ({
  x: Math.floor(r.x0 * cell),
  y: Math.floor(r.y0 * cell),
  w: Math.min(px.width, Math.ceil(r.x1 * cell)) - Math.floor(r.x0 * cell),
  h: Math.min(px.height, Math.ceil(r.y1 * cell)) - Math.floor(r.y0 * cell),
});
const area = (b: Box) => b.w * b.h;
const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : 0;
};

/** Reads the page's layout from its content pieces. */
export function analyzeLayout(px: Pixels): Layout {
  const background = backgroundOf(px);
  const g = contentGrid(px, background);
  const pieces: { box: Region; band: number }[] = [];
  // A gutter must be at least ~0.8% of the page wide to count as a split.
  cut(g, { x0: 0, y0: 0, x1: g.cols, y1: g.rows }, 0, Math.max(2, Math.round(g.cols * 0.008)), pieces, 0);
  const page = px.width * px.height;
  const all = pieces.map((p) => ({ box: toBox(p.box, g.cell, px), band: p.band })).filter((p) => area(p.box) >= page * 0.0005);

  // A header: everything in the first band when it sits in the top fifth and is short.
  const first = all.filter((p) => p.band === 0);
  const firstBottom = Math.max(0, ...first.map((p) => p.box.y + p.box.h));
  const hasHeader = first.length > 0 && firstBottom <= px.height * 0.22 && all.some((p) => p.band > 0);
  const header = hasHeader ? first.reduce((h, p) => ({ x: Math.min(h.x, p.box.x), y: Math.min(h.y, p.box.y), w: 0, h: 0, x1: Math.max(h.x1, p.box.x + p.box.w), y1: Math.max(h.y1, p.box.y + p.box.h) }), { x: px.width, y: px.height, w: 0, h: 0, x1: 0, y1: 0 }) : null;
  const headerBox: Box | null = header ? { x: header.x, y: header.y, w: header.x1 - header.x, h: header.y1 - header.y } : null;
  const body = hasHeader ? all.filter((p) => p.band > 0) : all;

  // Items: pieces of a sensible size and shape (not slivers, not the whole page).
  const items = body.filter((p) => area(p.box) >= page * 0.0015 && area(p.box) <= page * 0.4 && p.box.w >= px.width * 0.03 && p.box.h >= px.height * 0.02 && p.box.w / p.box.h < 8 && p.box.h / p.box.w < 8);
  if (items.length >= 4) {
    const mid = median(items.map((p) => area(p.box)));
    const similar = items.filter((p) => area(p.box) >= mid * 0.3 && area(p.box) <= mid * 3.5);
    const bands = new Set(similar.map((p) => p.band)).size;
    const covered = similar.reduce((s, p) => s + area(p.box), 0) / page;
    if (similar.length >= 4 && bands >= 2) {
      // Photos in a grid are alike in size and cover a good part of the page; logos are small and spread out.
      const regular = similar.filter((p) => area(p.box) >= mid * 0.6 && area(p.box) <= mid * 1.6).length / similar.length;
      if (mid >= page * 0.015 && covered >= 0.25 && regular >= 0.6) return { kind: "gallery", boxes: similar.map((p) => p.box), background, header: headerBox };
      if (mid < page * 0.05) return { kind: "logos", boxes: similar.map((p) => p.box), background, header: headerBox };
    }
  }
  const big = body.filter((p) => area(p.box) >= page * 0.01 && area(p.box) <= page * 0.75);
  if (big.length === 1 && body.length <= 3) return { kind: "single", boxes: [big[0].box], background, header: headerBox };
  return { kind: "plain", boxes: body.map((p) => p.box), background, header: headerBox };
}

/** Grows a box a little (so a crop keeps a shadow or an outline) and clamps it to the page. */
export function padBox(b: Box, width: number, height: number, ratio = 0.04): Box {
  const p = Math.round(Math.min(b.w, b.h) * ratio);
  const x = Math.max(0, b.x - p);
  const y = Math.max(0, b.y - p);
  return { x, y, w: Math.min(width - x, b.w + 2 * p), h: Math.min(height - y, b.h + 2 * p) };
}
