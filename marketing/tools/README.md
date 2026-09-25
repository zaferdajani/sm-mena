# Production tools (reproducible)

The same approach as the OneClickConvert ad pipeline: short generated takes, real UI recordings, Chromium-rendered Arabic type, and ffmpeg assembly.

| Tool | What it does |
|---|---|
| `render.js` | Renders HTML to PNG or JPG in headless Chromium: `node render.js page.html out.png W H`, or `--batch jobs.json`. It loads Readex Pro and IBM Plex Sans Arabic (OFL, from `edit/fonts2`) before capturing. |
| `sting-lockup.html` | The exact logo lockup, used for the sting start and end frames and the transparent "pin" patches that lock the sting's last frame to the real logo. |
| `rec*.js` | Playwright screen recordings of the real app at 540×1080: Explore, Feed, the matchmaker (JO, SA, EN) and the landing ledger. Run against `next start` with the seeded demo data. |
| `edit/build.py` | Assembles a film from an edit list (`../prompts/edit-lists/*.json`): clips, phone-frame UI scenes, captions, voice-over (atempo 1.2, silence-trimmed), the sting and end card. Loudness is one constant gain to −14 LUFS with a true-peak ceiling only (no bus limiter). |
| `ads/ad.html` + `ads/gen.py` | The static ad template and the job list for every still (key messages, carousels, WhatsApp, Google Display, covers). |
| `copy_table.py` | Generates `../copy/ad-copy.md` and checks character limits. |

Paths in the scripts point to the session scratchpad. Change `S`/`ROOT` to your own working folder. Fonts: Readex Pro and IBM Plex Sans Arabic, SIL Open Font License.
