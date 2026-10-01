// Captures the real product screens used in the Pioneers intro video.
// Usage (server already running, see README):
//   BASE_URL=http://localhost:3210 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium \
//     node scripts/pioneer-video/capture-screens.mjs
// Writes PNGs into scripts/pioneer-video/shots/ (390x844 CSS px at 3x = 1170x2532).
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "shots");
const base = process.env.BASE_URL ?? "http://localhost:3210";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
const handle = process.env.DEMO_HANDLE ?? "nakhla.studio";
const demoEmail = `${handle.replace(/\./g, "-")}@sawwiq.test`;
const demoPassword = "demo-pass-123";

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  locale: "ar-JO",
  colorScheme: "light",
  reducedMotion: "reduce",
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

async function shot(name, url, { scrollTo = 0 } = {}) {
  await page.goto(`${base}${url}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  if (scrollTo) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: false });
  console.log(`captured ${name} <- ${url}`);
}

// 0. Seeded agencies are labelled demo accounts; the discovery grid lists them only in the
//    labelled demo view (docs/31, docs/37), which the /demo page turns on for this browser.
await page.goto(`${base}/ar/demo`, { waitUntil: "networkidle" });
const enterDemo = page.getByTestId("demo-as-client");
if (await enterDemo.count()) {
  await enterDemo.click();
  await page.waitForLoadState("networkidle");
}

// 1. Discovery grid (public in the full phase) and the examples page.
await shot("explore", "/ar/explore?tab=agencies");
await shot("explore-posts", "/ar/explore?tab=posts");
await shot("examples", "/ar/examples");

// 2. A demo agency page (seeded demo data).
await shot("agency", `/ar/a/${handle}`);
await shot("agency-scrolled", `/ar/a/${handle}`, { scrollTo: 1250 });

// 3. A project page: a seeded photo post whose caption names no city (docs: the video is
//    pan-Arab). POST_AGENCY / POST_CAPTION pick it; the fallback is the first work on the demo agency.
let postHeaderPx = 0;
let postCardPx = 0;
const postAgency = process.env.POST_AGENCY ?? "zaytoon.brand";
const postCaption = process.env.POST_CAPTION ?? "هوية بصرية كاملة";
await page.goto(`${base}/ar/a/${postAgency}`, { waitUntil: "networkidle" });
let projectHref = await page.locator(`a[href*="/p/"]:has(img[alt^="${postCaption}"])`).first().getAttribute("href").catch(() => null);
if (!projectHref) {
  console.warn(`no post starting "${postCaption}" on /ar/a/${postAgency}; using the first work of ${handle}`);
  await page.goto(`${base}/ar/a/${handle}`, { waitUntil: "networkidle" });
  projectHref = await page.locator('a[href*="/p/"]').first().getAttribute("href");
}
if (projectHref) {
  const projectUrl = projectHref.replace(/^https?:\/\/[^/]+/, "");
  await shot("project", projectUrl);
  // The post card itself, as an element screenshot (independent of scroll position), and the
  // height of its author header so the panel crop can start at the work.
  const card = page.locator('[data-testid="post-card"]').first();
  // The fixed bottom navigation would otherwise overlay a card taller than the viewport.
  await page.addStyleTag({ content: "nav[data-app-nav]{display:none !important}" });
  await card.screenshot({ path: path.join(out, "post-card.png") });
  postCardPx = (await card.boundingBox())?.height ?? 0;
  postCardPx = Math.round(postCardPx * 3);
  const header = await card.locator("header").first().boundingBox();
  postHeaderPx = Math.round((header?.height ?? 0) * 3);
  console.log(`captured post-card (header ${postHeaderPx}px)`);
} else {
  console.warn("no project link found");
}

// 4. Portfolio setup behind sign-in (demo account; local only).
try {
  await page.goto(`${base}/ar/login`, { waitUntil: "networkidle" });
  await page.fill("#email", demoEmail);
  await page.fill("#password", demoPassword);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 15000 });
  await shot("portfolio-setup", "/ar/portfolio-setup");
} catch (err) {
  console.warn("portfolio-setup skipped:", err.message);
}

await browser.close();

// 5. Panels for the motion page: crops (in 3x device pixels) that leave out the header with the
//    country chip, the city lines and the bottom navigation, so the video carries no place names.
const sharp = (await import("sharp")).default;
const panels = {
  // Discovery grid: heading, search, tabs and the first two rows of works.
  "panel-grid": { src: "explore-posts", top: 730, height: 1380 },
  // Agency page, "accounts we manage" (clients) and the works grid.
  "panel-clients": { src: "agency-scrolled", top: 325, height: 1590 },
  // Project page: the work itself, the contact bar and the reactions.
  // Post card without its author line: the work, the contact bar, the reactions and the caption.
  "panel-project": { src: "post-card", top: postHeaderPx, height: Math.min(2000, postCardPx - postHeaderPx) },
};
for (const [name, { src, top, height }] of Object.entries(panels)) {
  await sharp(path.join(out, `${src}.png`)).extract({ left: 0, top, width: 1170, height }).webp({ quality: 92 }).toFile(path.join(out, `${name}.webp`));
  console.log(`panel ${name} <- ${src} (top ${top}, height ${height})`);
}
