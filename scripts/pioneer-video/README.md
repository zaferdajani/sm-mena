# First Wave intro video (`public/pioneers/intro.mp4`)

The intro for the "الرعيل الأول" (First Wave) invitation letter is made from this folder, with no
video-generation service: an HTML motion page with CSS animations, real product screenshots from
the local build, Playwright to scrub and capture the page frame by frame, and ffmpeg to encode.
Shot list, copy and subtitles: `docs/pioneer-video-script.md`.

| File | Role |
| --- | --- |
| `motion.html` | The video: 1080x1920 page, one `<section class="scene">` per shot, every animation has an absolute delay in seconds (`--in`, `--out`, `--d`). Edit copy and timings here. |
| `capture-screens.mjs` | Captures the product screens with Playwright (390x844 at 3x) and crops the panels the motion page embeds. |
| `shots/` | The cropped `panel-*.webp` panels the motion page embeds (committed, so a copy change does not need the app running); the raw captures land here too but are git-ignored. |
| `render.mjs` | Scrubs the page to each frame with the Web Animations API, pipes PNG frames into ffmpeg (H.264, yuv420p, faststart), writes the poster. |

## Regenerate after a copy change

Only the page and the renderer are needed:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium node scripts/pioneer-video/render.mjs
```

Options: `CRF=27` (quality/size; 26–30 keeps the file under 6 MB), `FPS=30`, `OUT=public/pioneers/intro.mp4`,
`PREVIEW="2,6.5,14.5" PREVIEW_DIR=/tmp/frames` (write single frames at those seconds instead of encoding; look at them
before a full render). Keep `public/pioneers/intro.vtt` and `docs/pioneer-video-script.md` in step with the copy.

Check the result:

```sh
ffmpeg -i public/pioneers/intro.mp4 2>&1 | grep -E "Duration|Video"          # or ffprobe when installed
ffmpeg -y -i public/pioneers/intro.mp4 -vf "select='eq(n\,60)+eq(n\,190)+eq(n\,310)+eq(n\,450)+eq(n\,570)+eq(n\,700)'" -vsync vfr /tmp/frames/shot-%d.png
```

## Re-capture the product screens

Needed only when the product UI changes. The screens come from the seeded demo data in the full launch phase.

```sh
npm run build
LAUNCH_PHASE=full PGLITE_DIR=.data/e2e/pglite UPLOADS_DIR=.data/e2e/uploads npm run db:reset
LAUNCH_PHASE=full PGLITE_DIR=.data/e2e/pglite UPLOADS_DIR=.data/e2e/uploads \
  FEATURE_DEFAULTS="protected_payments=on,prelaunch_home=off" ADMIN_REQUIRE_2FA=false \
  npm run start -- --port 3210 &
BASE_URL=http://localhost:3210 PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium \
  node scripts/pioneer-video/capture-screens.mjs
fuser -k 3210/tcp
```

What it captures and why:

- `/ar/demo` first: seeded agencies are labelled demo accounts and the discovery grid lists their work only in the
  labelled demo view (docs/31, docs/37), which that page turns on for the browser.
- `panel-grid` from `/ar/explore?tab=posts` (heading, search, tabs, two rows of works).
- `panel-clients` from the demo agency page `/ar/a/nakhla.studio` scrolled to "accounts we manage" and the works grid.
- `panel-project` from a post page, as an element screenshot of the post card without its author line
  (`POST_AGENCY=zaytoon.brand`, `POST_CAPTION="هوية بصرية كاملة"` pick a photo post whose caption names no city).
- `portfolio-setup` behind the demo sign-in (`<handle-with-dashes>@sawwiq.test` / `demo-pass-123`), captured for
  reference but not used in the cut.

The crops leave out the header with the country chip, the city lines and the bottom navigation: the video is
pan-Arab and carries no place names. Every screen is a real page of the local build; nothing is mocked.

## Rules kept

- Arabic on screen is Modern Standard Arabic, `dir="rtl"`, Noto Sans Arabic from `public/fonts/`, large type with
  balanced line wrapping, cream / deep green / gold from the site's palette.
- The seal is `public/brand/pioneer-seal.svg`; the number shown (`٠١٢`) is a sample and is labelled «مثال».
- No music, no voice, no counts beyond the fifty names of the letter, no cities.
