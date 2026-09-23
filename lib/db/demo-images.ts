// Generates placeholder "creative" images for demo agencies. Deterministic.
import sharp from "sharp";

type Rng = () => number;

export function rng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  ["#0f766e", "#14b8a6", "#f0fdfa"],
  ["#7c3aed", "#c084fc", "#faf5ff"],
  ["#be123c", "#fb7185", "#fff1f2"],
  ["#b45309", "#f59e0b", "#fffbeb"],
  ["#1d4ed8", "#60a5fa", "#eff6ff"],
  ["#166534", "#4ade80", "#f0fdf4"],
  ["#0f172a", "#475569", "#f8fafc"],
  ["#9d174d", "#f472b6", "#fdf2f8"],
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export type DemoKind = "ad" | "content" | "video" | "branding" | "photo" | "results";

export function demoSvg(kind: DemoKind, seed: number, headline: string, brand: string, tall = false) {
  const r = rng(seed);
  const [dark, mid, light] = PALETTES[Math.floor(r() * PALETTES.length)];
  const w = 1080;
  const h = tall ? 1350 : 1080;
  const shapes: string[] = [];
  for (let i = 0; i < 6; i++) {
    const cx = Math.round(r() * w);
    const cy = Math.round(r() * h);
    const rad = Math.round(80 + r() * 260);
    shapes.push(`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${i % 2 ? mid : light}" opacity="${(0.12 + r() * 0.25).toFixed(2)}"/>`);
  }
  let body = "";
  if (kind === "video") {
    body = `<circle cx="${w / 2}" cy="${h / 2}" r="130" fill="${light}" opacity="0.92"/><path d="M${w / 2 - 40} ${h / 2 - 70} L${w / 2 + 80} ${h / 2} L${w / 2 - 40} ${h / 2 + 70} Z" fill="${dark}"/>`;
  } else if (kind === "results") {
    const bars = Array.from({ length: 6 }, (_, i) => {
      const bh = Math.round(120 + i * 70 + r() * 60);
      return `<rect x="${180 + i * 125}" y="${h - 220 - bh}" width="80" height="${bh}" rx="14" fill="${i === 5 ? light : mid}" opacity="${i === 5 ? 1 : 0.8}"/>`;
    }).join("");
    body = bars;
  } else if (kind === "branding") {
    body = Array.from({ length: 4 }, (_, i) => {
      const x = 240 + (i % 2) * 340;
      const y = h / 2 - 300 + Math.floor(i / 2) * 340;
      return `<rect x="${x}" y="${y}" width="260" height="260" rx="${i % 2 ? 130 : 36}" fill="${i === 0 ? light : mid}" opacity="0.9"/>`;
    }).join("");
  } else if (kind === "photo") {
    body = `<path d="M0 ${h * 0.72} Q ${w * 0.3} ${h * 0.5} ${w * 0.55} ${h * 0.68} T ${w} ${h * 0.6} L ${w} ${h} L 0 ${h} Z" fill="${mid}" opacity="0.85"/><circle cx="${w * 0.72}" cy="${h * 0.3}" r="110" fill="${light}"/>`;
  } else {
    body = `<rect x="140" y="${h / 2 - 170}" width="${w - 280}" height="340" rx="40" fill="${light}" opacity="0.95"/>`;
  }
  const textColor = kind === "content" ? dark : light;
  const headlineY = kind === "content" ? h / 2 + 30 : kind === "results" ? 250 : kind === "video" ? h - 200 : 220;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${mid}"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${shapes.join("")}
  ${body}
  <text x="${w / 2}" y="${headlineY}" font-family="DejaVu Sans, Arial, sans-serif" font-size="84" font-weight="700" fill="${textColor}" text-anchor="middle">${esc(headline)}</text>
  <text x="${w / 2}" y="${h - 70}" font-family="DejaVu Sans, Arial, sans-serif" font-size="36" fill="${light}" opacity="0.9" text-anchor="middle">${esc(brand)}</text>
</svg>`;
}

export async function demoImage(kind: DemoKind, seed: number, headline: string, brand: string, tall = false) {
  return sharp(Buffer.from(demoSvg(kind, seed, headline, brand, tall))).png().toBuffer();
}

export async function demoAvatar(initials: string, seed: number) {
  const r = rng(seed);
  const [dark, mid] = PALETTES[Math.floor(r() * PALETTES.length)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${dark}"/><stop offset="1" stop-color="${mid}"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <text x="200" y="245" font-family="DejaVu Sans, Arial, sans-serif" font-size="150" font-weight="700" fill="#fff" text-anchor="middle">${esc(initials)}</text>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
