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
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
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

// tesseract.js, for reading the text off image-only portfolio pages on the
// device (docs/36). The worker and the wasm core come from node_modules; the
// English and Arabic language files ("fast" models) are downloaded once from
// tesseract.js's own data host and kept next to them. If the download fails
// (no network at build time) the browser falls back to that host at run time.
bytes += copy("tesseract.js/dist/worker.min.js", "tesseract/worker.min.js");
for (const name of ["tesseract-core-simd-lstm.wasm.js", "tesseract-core-simd-lstm.wasm", "tesseract-core-lstm.wasm.js", "tesseract-core-lstm.wasm"]) {
  bytes += copy(`tesseract.js-core/${name}`, `tesseract/${name}`);
}
const TESSDATA = "https://tessdata.projectnaptha.com/4.0.0_fast";
for (const lang of ["eng", "ara"]) {
  const file = out(`tesseract/${lang}.traineddata.gz`);
  if (existsSync(file) && statSync(file).size > 100_000) {
    bytes += statSync(file).size;
    continue;
  }
  try {
    const res = await fetch(`${TESSDATA}/${lang}.traineddata.gz`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, buf);
    bytes += buf.byteLength;
  } catch (e) {
    console.warn(`[vendor] could not download ${lang}.traineddata.gz (${e.message}); the browser will fetch it from ${TESSDATA} instead`);
  }
}

console.log(`[vendor] ffmpeg, pdf.js and tesseract engines -> public/engines (${(bytes / 1e6).toFixed(1)} MB)`);
