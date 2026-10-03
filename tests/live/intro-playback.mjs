// Intro video playback check, run from a GitHub runner (a browser outside the build sandbox, whose egress
// proxy drops media streams). Two modes:
//  - page mode (INTRO_PAGE set, e.g. https://sawwiq.org/ar?intro=1): opens the page and waits for the intro
//    sting's own <video> to fire `ended` — the full-phase landing check.
//  - asset mode (default): plays the production intro files (webm, then mp4 when the browser can decode it)
//    in a bare page and waits for `ended`, proving the files stream completely from production.
// Writes live-evidence/intro-playback.json and screenshots; exits 1 when no `ended` event arrives.
import { chromium } from "playwright";
import fs from "node:fs";

const SITE = (process.env.SITE_URL || "https://sawwiq.org").replace(/\/$/, "");
const PAGE = process.env.INTRO_PAGE || "";
const OUT = "live-evidence";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];

async function playInPage(page, label, timeoutMs = 60000) {
  const t0 = Date.now();
  const r = await page.evaluate(async (timeout) => {
    const v = document.querySelector("video");
    if (!v) return { found: false };
    const events = [];
    for (const n of ["loadedmetadata", "canplay", "play", "playing", "timeupdate", "ended", "error", "stalled"]) v.addEventListener(n, () => { if (n !== "timeupdate" || events[events.length - 1] !== "timeupdate") events.push(n); });
    v.muted = true;
    try { await v.play(); } catch (e) { events.push("play-rejected:" + (e && e.name)); }
    const ended = await new Promise((res) => { const done = () => res(true); v.addEventListener("ended", done, { once: true }); if (v.ended) done(); setTimeout(() => res(false), timeout); });
    return { found: true, ended, currentTime: v.currentTime, duration: v.duration, readyState: v.readyState, networkState: v.networkState, error: v.error ? v.error.code : null, src: v.currentSrc, events };
  }, timeoutMs);
  const entry = { label, ms: Date.now() - t0, ...r };
  results.push(entry); console.log(JSON.stringify(entry));
  await page.screenshot({ path: `${OUT}/intro-${label}.png` }).catch(() => {});
  return entry;
}

if (PAGE) {
  for (const [label, viewport] of [["page-phone", { width: 390, height: 844 }], ["page-desktop", { width: 1440, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 700, hasTouch: viewport.width < 700 });
    const page = await ctx.newPage();
    await page.goto(PAGE, { waitUntil: "load", timeout: 90000 });
    await page.waitForSelector("#sw-intro video, video", { timeout: 20000 }).catch(() => {});
    await playInPage(page, label);
    await ctx.close();
  }
} else {
  for (const file of ["sawwiq-intro-720.webm", "sawwiq-intro-720.mp4"]) {
    const ctx = await browser.newContext({ viewport: { width: 720, height: 1280 } });
    const page = await ctx.newPage();
    const src = `${SITE}/assets/brand/intro/${file}`;
    const head = await page.request.head(src);
    await page.setContent(`<!doctype html><html><body style="margin:0;background:#000"><video src="${src}" muted playsinline preload="auto" style="width:100%"></video></body></html>`);
    const canPlay = await page.evaluate((f) => document.createElement("video").canPlayType(f.endsWith(".webm") ? "video/webm" : "video/mp4"), file);
    const entry = await playInPage(page, file.replace(/\W+/g, "-"));
    Object.assign(entry, { status: head.status(), contentLength: head.headers()["content-length"], canPlayType: canPlay });
    await ctx.close();
  }
}
await browser.close();
const ok = PAGE ? results.some((r) => r.ended) : results.filter((r) => r.canPlayType).every((r) => r.ended) && results.some((r) => r.ended);
fs.writeFileSync(`${OUT}/intro-playback.json`, JSON.stringify({ site: SITE, page: PAGE || null, at: new Date().toISOString(), ok, results }, null, 1));
console.log(ok ? "intro playback: ended event received" : "intro playback: no ended event");
process.exit(ok ? 0 : 1);
