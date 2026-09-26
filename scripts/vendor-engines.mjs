/**
 * Copies the ffmpeg.wasm engine out of node_modules into `public/engines/ffmpeg`
 * so the browser loads it from our own origin (no CDN sees who compresses a
 * video, and a CDN outage cannot break uploads). Ported from OneClickConvert's
 * scripts/vendor-engines.mjs, keeping only ffmpeg.
 *
 * These are build outputs, not source: `public/engines/` is gitignored and this
 * runs from `prebuild` (and `predev`), so the ~31 MB never enters the repository.
 * Vercel runs `npm run build`, and npm runs `prebuild` before it automatically.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const out = (p) => join(root, "public/engines", p);

const copy = (from, to) => {
  const src = join(root, "node_modules", from);
  if (!existsSync(src)) {
    console.warn(`[vendor] MISSING ${from}`);
    process.exitCode = 1;
    return 0;
  }
  mkdirSync(dirname(out(to)), { recursive: true });
  copyFileSync(src, out(to));
  return statSync(src).size;
};

let bytes = 0;

// The esm and umd builds ship a byte-identical wasm, so it is stored once and
// both loaders point at it. core-mt is deliberately NOT vendored: it only runs
// when the page is cross-origin isolated (COOP/COEP), which this site is not.
bytes += copy("@ffmpeg/core/dist/esm/ffmpeg-core.js", "ffmpeg/esm/ffmpeg-core.js");
bytes += copy("@ffmpeg/core/dist/umd/ffmpeg-core.js", "ffmpeg/umd/ffmpeg-core.js");
bytes += copy("@ffmpeg/core/dist/esm/ffmpeg-core.wasm", "ffmpeg/ffmpeg-core.wasm");

// ffmpeg.wasm's own worker (an ES module plus its two imports). Served as a
// static file and handed to FFmpeg.load() as `classWorkerURL`, so the bundler
// never rewrites the worker's `import(coreURL)` of the engine.
for (const name of ["worker.js", "const.js", "errors.js"]) {
  bytes += copy(`@ffmpeg/ffmpeg/dist/esm/${name}`, `ffmpeg/worker/${name}`);
}

// pdf.js's worker, for reading PDF portfolios in the browser (Studio → Import
// a PDF portfolio; docs/36-portfolio-import.md).
bytes += copy("pdfjs-dist/legacy/build/pdf.worker.min.mjs", "pdfjs/pdf.worker.min.mjs");
// Its standard fonts and character maps, for PDFs that don't embed their fonts.
for (const dir of ["standard_fonts", "cmaps"]) {
  const src = join(root, "node_modules/pdfjs-dist", dir);
  if (existsSync(src)) for (const name of readdirSync(src)) bytes += copy(`pdfjs-dist/${dir}/${name}`, `pdfjs/${dir}/${name}`);
}

console.log(`[vendor] ffmpeg engine and pdf.js worker -> public/engines (${(bytes / 1e6).toFixed(1)} MB)`);
