# 26 · Media compression: smallest size at the same visible quality

Every image, video and generated document we store is compressed to the **smallest size that keeps the same quality**, measured objectively, and lossless wherever that is smaller. Raw uploads are never stored: the browser compresses before sending, the server compresses again before storing, and every stored file has its metadata (EXIF, GPS, XMP, comments) removed.

The approach and most of the code come from OneClickConvert (OCC): its size search (`src/utils/binarySearchQuality.ts`), SSIM score (`src/utils/ssim.ts`), image converter (`src/utils/imageConvert.ts`), ffmpeg.wasm loader (`src/utils/videoConvert.ts`), engine vendoring (`scripts/vendor-engines.mjs`) and lossless shrinker (`src/utils/shrinkPipeline.ts`, tier 1).

## The rule

- **Same quality** means the structural similarity (SSIM, luma, 8×8 windows stepped by 4 px) between the stored file and the source *at the size we display it* stays at or above a floor:
  - images: `SSIM_FLOOR = 0.985` (`lib/media/ssim.ts`). OCC calls ≥ 0.98 "identical"; the extra 0.005 covers the second generation (browser copy, then server copy).
  - video: `VIDEO_SSIM_FLOOR = 0.98`, the frame average ("All:") from ffmpeg's `ssim` filter.
- **Scaling down to the display size is not a quality loss**: nobody ever sees more pixels than that. Display sizes: feed 1080×1350 (fit inside), grid thumbnail 480×480 (cover crop), avatar 320×320 (cover crop), interface background 2400 px, background video 1280 px wide.
- **Smallest passing candidate wins.** The search is OCC's shape (probe a ladder to bracket the answer, then binary-refine), turned into "lowest quality that still passes" (`searchSmallestPassing` in `lib/media/size-search.ts`), with a guard that keeps the smallest passing file if the encoder is not perfectly monotonic.
- **Lossless where possible.** For graphic sources (PNG, GIF, lossless WebP) lossless WebP is tried, and near-lossless WebP when lossless is competitive; an upload that is already inside the display box and smaller than every re-encode is kept as it is, with its metadata stripped byte for byte (`lib/media/strip-metadata.ts`; ICC colour profiles are kept, so colours do not shift).

## Images on the server (`lib/images.ts`)

`encodeSameQuality(input, target, { allowOriginal })` resizes to the display box once (EXIF orientation applied), then compares candidates:

1. lossy WebP at the lowest quality with SSIM ≥ 0.985. The ladder starts in the middle (70, then 40, OCC's WebP floor) because graphics pass at 40 in two encodes; a failure at 70 climbs 85 → 92 → 97 and the refinement narrows it down (±3);
2. lossless WebP (graphic sources, or when no lossy quality passes), then near-lossless WebP when lossless is within 1.5× of the lossy result. Skipped when the lossy result is under half of the source PNG at display size, because lossless cannot win there;
3. the original, metadata stripped (feed image and background only; never for cover crops).

`processImage` (posts), `processAvatar` and the Appearance background action all use it. A stored post image or background can therefore be `.webp`, `.jpg` or `.png`; the storage key and content type follow the format (`STORED_EXT`, `STORED_TYPE`). The images of one post are encoded side by side.

Measured (`tests/unit/media.test.ts` covers the same cases; "old" is the fixed quality used before, WebP q80 feed and q72 thumbnail):

| Source | Upload | Old feed | New feed | Old thumb | New thumb | Time |
|---|---|---|---|---|---|---|
| Portfolio photo 1 (WebP 1080×1350) | 197 KB | 199 KB | 176 KB · q70 · SSIM 0.988 | 35 KB | 53 KB · q85 · SSIM 0.985 | 1.3 s |
| Portfolio photo 2 (WebP 1080×1350) | 111 KB | 112 KB | 96 KB · q67 · SSIM 0.986 | 32 KB | 49 KB · q85 · SSIM 0.985 | 1.1 s |
| Landing photo (WebP 880×1168) | 54 KB | 50 KB | 45 KB · q76 · SSIM 0.986 | 14 KB | 29 KB · q89 · SSIM 0.986 | 0.8 s |
| Camera-size PNG 4000×3000 | 21 MB | 135 KB | 146 KB · q82 · SSIM 0.985 | 41 KB | 61 KB · q85 · SSIM 0.988 | 1.1 s |
| Demo graphic (PNG 1080×1080) | 100 KB | 12 KB | 8 KB · q40 · SSIM 0.994 | 4 KB | 3 KB · q40 · SSIM 0.989 | 0.3 s |

What the numbers say: the old q80 feed images scored SSIM ≈ 0.99 on real photos, so they carried bytes nobody could see (now 10–15% smaller); the old q72 thumbnails scored ≈ 0.97, visibly soft, so under the same-quality rule they grow. Busy, high-detail pictures may need more than q80 (the 4000×3000 case). The full demo seed (≈350 images, 29 avatars) takes about 2 minutes, as before.

## Images in the browser (`lib/media/image-compress.ts`)

A serverless request body is limited to about 4.5 MB on Vercel, so pictures are compressed before they are sent, by the same rule:

- decode (`createImageBitmap`), fit into a maximum long side: posts 1600 px (above the 1080 px display, so the server keeps headroom), avatar 1024 px, background 2400 px;
- JPEG, and WebP where the browser can encode it, at the lowest quality with SSIM ≥ 0.985 against the resized canvas (ladder 0.85/0.70/0.55/0.45, climbing 0.92/0.97); the original is sent when it is already inside the box and smaller;
- only if the whole request would still be over 3.8 MB, `compressForRequest` falls back to OCC's byte-budget search (`searchLargestUnderTarget`: largest JPEG under an equal share of 3.8 MB, then 15% dimension steps). That is a last resort for very large batches; the server still re-encodes by the same-quality rule. Above 4.4 MB the post form refuses before sending.
- HEIC and anything else the browser cannot decode is sent as it is; the server decides (10 MB limit).

Wired into the post form, the avatar (profile form, replaced in the file input via `DataTransfer`; Save waits while it runs) and the Appearance background image.

E2E (`tests/e2e/media.spec.ts`): a 4000×3000 PNG of 21 MB left the browser as 204 KB and was stored as a 147 KB feed image.

## Video in the browser (`lib/media/video-compress.ts`)

ffmpeg.wasm (`@ffmpeg/ffmpeg` 0.12.15, `@ffmpeg/core` 0.12.x, single-threaded because the site sends no COOP/COEP headers):

- **Self-hosted engine.** `scripts/vendor-engines.mjs` copies the esm and umd `ffmpeg-core.js`, the shared ~31 MB `ffmpeg-core.wasm` and ffmpeg's module worker (`worker.js`, `const.js`, `errors.js`) into `public/engines/ffmpeg/` from `prebuild` and `predev`. `public/engines/` is gitignored, so the engine never enters the repository. Vercel runs `npm run build`, which runs `prebuild` first.
- **Loaded only when a video is picked**, by dynamic `import()`. Strategies in order (OCC): vendored worker + esm core via blob URLs, bundled worker + esm, bundled worker + umd, then direct URLs. The vendored worker is passed as `classWorkerURL`, so no bundler rewrites the worker's `import(coreURL)`.
- **Quality search.** H.264 (libx264, veryfast, yuv420p, `+faststart`), metadata stripped. CRF is searched on a 4-second sample from high to low quality (CRF 20, 26, 32, 38; climbing to 16 and 12 if needed) and the highest CRF whose SSIM against the scaled source stays ≥ 0.98 wins; the whole clip is then encoded once at that CRF.
- **Request cap.** If the result is over 4 MB, the width steps down (1280 → 960 → 720 → 540) rather than blurring further, and the form reports the width. Only after 540 px does a byte-budget search take over (`budget: true` in the result).
- Backgrounds (`compressBackgroundVideo`): audio removed (they play muted), at most 30 s, 1280 px. `compressVideo` is generic (keeps AAC audio unless told otherwise) for future video uploads.
- Progress (engine download, each pass), a Cancel button (terminates the worker) and translated errors (engine failed to start, unreadable video, still too large).
- The Appearance action refuses any video over 4 MB, so an uncompressed video can never be stored.

E2E: a 2.5 s WebM recorded in headless Chromium (canvas + MediaRecorder, 193 KB) was compressed in the page to a 14 KB MP4 (CRF 38, SSIM 0.991), stored, and played on the UAE interface.

## Documents (`lib/media/shrink.ts`)

OCC's lossless tier 1, server side: PDFs are re-saved through pdf-lib with object streams and without incremental-update history (metadata untouched, so output stays deterministic); JSON is minified; nothing else is changed, and a result is kept only if it is smaller. The contract and NDA PDFs (`lib/pdf/legal-pdf.ts`, jsPDF with `compress: true`) go through it: the NDA test document drops from 23.2 KB to 20.3 KB (−12%). `shrinkDocument` is ready for any document upload added later. OCC's lossy tier 2 (page rasterisation) and its "zip it" fallback are deliberately not ported: a stored document must keep its type and content.

## Where to change things

- Floors: `SSIM_FLOOR`, `VIDEO_SSIM_FLOOR` in `lib/media/ssim.ts`.
- Display sizes and WebP ladder: `DISPLAY`, `WEBP_LADDER` in `lib/images.ts`.
- Browser limits: `REQUEST_BUDGET`, `REQUEST_LIMIT`, `POST_UPLOAD`, `AVATAR_UPLOAD`, `BACKGROUND_UPLOAD` in `lib/media/image-compress.ts`.
- Video: `VIDEO_MAX_BYTES`, `WIDTHS`, `CRF_LADDER`, `SAMPLE_SECONDS` in `lib/media/video-compress.ts`; server cap `MAX_VIDEO` in `app/[locale]/(main)/admin/appearance/actions.ts`.
