# Founding Member intro video: shot list and script

`public/pioneers/intro.mp4` · 1080x1920 (vertical), H.264 yuv420p, 30 fps, 24 s, silent · poster `intro-poster.jpg` · English subtitles `intro.vtt`.

Owner brief (1 Oct 2026): short, pan-Arab, Modern Standard Arabic (neutral "white" Arabic), so an agency in Riyadh,
Cairo or Dubai relates to it as much as one in Amman. No country or city is named or shown. The program is
«عضو مؤسس» (Founding Member); the seal is «وسام العضو المؤسس». Calm, premium, confident: large type, generous pauses,
no exclamation marks. Everything on screen is real: the product screens are captured from the local build with
Playwright (seeded demo data, labelled as such on the pages themselves), the seal is `public/brand/pioneer-seal.svg`
and the number on it is a labelled sample. No video-generation service, no stock footage, no music.

## Shot list

Six shots of four seconds. Each shot fades in over 0.45 s and out over 0.4 s; text rises in with 0.9 s eases.

| # | Time | On screen (Arabic) | Subtitle (English) | Visual |
| --- | --- | --- | --- | --- |
| 1 | 0:00–0:04 | أجمل الأعمال العربية في التسويق… تختفي بعد أربعٍ وعشرين ساعة. | The best Arab marketing work disappears after 24 hours. | Deep green. Gold rule. First sentence is on screen from frame 0 (it is the poster); the second rises at 1.15 s; the whole line blurs away at 2.95–3.95 s ("disappears"). |
| 2 | 0:04–0:08 | سوّق: مكانٌ واحد لأعمال الوكالات والمستقلين في العالم العربي، مرتّبةً بحسب العميل والنتيجة. | Sawwiq: one place for agencies' and freelancers' work across the Arab world, organised by client and result. | Cream. Mark + wordmark, headline, then two product screens slide up: a project page (brand-identity post: the work, the WhatsApp bar, reactions, caption) and an agency page at "accounts we manage" with its works grid. |
| 3 | 0:08–0:12 | يبحث أصحاب الأعمال: من صنع ماذا؟ ويصلون إليك مباشرة. | Business owners ask "who made what?" and reach you directly. | Cream. Headline on three lines; the discovery grid (`/ar/explore`, works tab) rises in and zooms slowly (1 → 1.035). |
| 4 | 0:12–0:16 | خمسون اسماً فقط يحملون وسام العضو المؤسس. ومن وصلته هذه الرسالة… فهو منهم. | Only fifty names carry the Founding Member medal. Whoever received this letter is one of them. | Deep green. Two sentences rise at 12.2 s and 13.0 s. The seal stamps in at 13.6 s (scale 2.8 → 1, tilt −8°) with a gold impact ring; «عضو مؤسس · ٠١٢» in gold at 14.15 s and the small dashed «مثال» tag at 14.45 s. |
| 5 | 0:16–0:20 | وسامٌ لا يُشترى. يُكسب… ويبقى. | A seal that cannot be bought. It is earned, and it stays. | Deep green. Small seal at the top; three short lines rise one by one (16.35, 17.35, 18.25 s). |
| 6 | 0:20–0:24 | امسح الرمز. عملك يستحق أن يُرى. · sawwiq.org | Scan the code. Your work deserves to be seen. sawwiq.org | Cream. The Sawwiq mark, two lines, gold hairline and `sawwiq.org`. Holds to the end so the letter's QR code can sit next to it. |

Subtitle cues in `public/pioneers/intro.vtt` use the shot boundaries above (cue n: start of shot n to 0.4 s before the next).

## Truth rules

- Only copy from the owner's brief is on screen; the one number besides "fifty names" is the sample seal number, labelled «مثال».
- No counts, countdowns, seats, deadlines, testimonials, prices or cities. The screens are cropped so the country chip,
  city lines and navigation are outside the frame.
- The demo pages carry their own "demo account" labels on the screens; the captions shown are the seeded ones.
- Nothing on screen promises a feature that does not exist in the build the screens were taken from.

## Regenerating

`scripts/pioneer-video/README.md` has the commands. In short: edit `scripts/pioneer-video/motion.html` (copy and
timings) and this file and `intro.vtt` together, preview a few frames (`PREVIEW=...`), then
`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium node scripts/pioneer-video/render.mjs`, which writes
`intro.mp4` and `intro-poster.jpg`. Re-run `capture-screens.mjs` only when the product UI changes.
