// Renders motion.html to public/pioneers/intro.mp4 (1080x1920, H.264, 30 fps) frame by frame.
// Every CSS animation on the page is scrubbed to the exact frame time with the Web Animations
// API, so the result does not depend on how fast the machine captures screenshots.
//
//   PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium node scripts/pioneer-video/render.mjs
//
// Options (environment): OUT=public/pioneers/intro.mp4  FPS=30  CRF=27  PAGE=scripts/pioneer-video/motion.html
// Needs ffmpeg with libx264 on PATH (FFMPEG=/path/to/ffmpeg to override).
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const page_ = process.env.PAGE ?? path.join(here, "motion.html");
const out = process.env.OUT ?? path.join(root, "public", "pioneers", "intro.mp4");
const poster = out.replace(/\.mp4$/, "-poster.jpg");
const fps = Number(process.env.FPS ?? 30);
const crf = Number(process.env.CRF ?? 27);
const ffmpeg = process.env.FFMPEG ?? "ffmpeg";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

await mkdir(path.dirname(out), { recursive: true });

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(page_).href);
await page.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
  window.__anims = document.getAnimations();
  for (const a of window.__anims) a.pause();
});
const duration = await page.evaluate(() => Number(document.body.dataset.duration ?? 24));
const frames = Math.round(duration * fps);

// PREVIEW="2,6.5,10" PREVIEW_DIR=/tmp/frames: write one PNG per listed second and stop.
if (process.env.PREVIEW) {
  const dir = process.env.PREVIEW_DIR ?? path.join(here, "preview");
  await mkdir(dir, { recursive: true });
  for (const sec of process.env.PREVIEW.split(",").map(Number)) {
    await page.evaluate((t) => { for (const a of window.__anims) a.currentTime = t; }, sec * 1000);
    await page.screenshot({ path: path.join(dir, `t${sec.toFixed(2)}.png`), animations: "allow" });
  }
  await browser.close();
  console.log(`preview frames -> ${dir}`);
  process.exit(0);
}
console.log(`rendering ${frames} frames (${duration}s @ ${fps} fps, ${await page.evaluate(() => window.__anims.length)} animations) -> ${path.relative(root, out)}`);

// The ffmpeg command: PNG frames on stdin -> H.264 yuv420p MP4 with the moov atom in front.
const args = [
  "-y", "-hide_banner", "-loglevel", "error",
  "-f", "image2pipe", "-framerate", String(fps), "-i", "pipe:0",
  "-c:v", "libx264", "-preset", "slow", "-crf", String(crf), "-pix_fmt", "yuv420p",
  "-r", String(fps), "-movflags", "+faststart", out,
];
const enc = spawn(ffmpeg, args, { stdio: ["pipe", "inherit", "inherit"] });
const done = new Promise((resolve, reject) => {
  enc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`))));
  enc.on("error", reject);
});

const write = (buf) => new Promise((resolve, reject) => {
  if (enc.stdin.write(buf)) return resolve();
  enc.stdin.once("drain", resolve);
  enc.stdin.once("error", reject);
});

const started = Date.now();
for (let i = 0; i < frames; i++) {
  const ms = (i * 1000) / fps;
  await page.evaluate((t) => { for (const a of window.__anims) a.currentTime = t; }, ms);
  const png = await page.screenshot({ type: "png", animations: "allow", caret: "hide" });
  await write(png);
  if (i % fps === 0) process.stdout.write(`\r  ${(i / fps).toFixed(0)}s / ${duration}s`);
}
enc.stdin.end();
await done;
await browser.close();
console.log(`\nencoded in ${((Date.now() - started) / 1000).toFixed(0)}s`);

// Poster: the first frame of the encoded file.
await new Promise((resolve, reject) => {
  const p = spawn(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", out, "-frames:v", "1", "-q:v", "4", poster], { stdio: "inherit" });
  p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`poster failed (${code})`))));
});
console.log(`poster -> ${path.relative(root, poster)}`);
