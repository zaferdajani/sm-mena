# Sawwiq launch campaign: index

Branch `claude/marketing-campaign`. Prepared 25 Sep 2026. **Nothing has been posted or published; everything awaits owner approval.**

| # | Deliverable | File |
|---|---|---|
| 1 | Business and marketing plan: positioning, personas, competitors, 90-day plan, channels, budgets, KPIs, measurement, partnerships, PR, referral, risks | [`01-marketing-plan.md`](01-marketing-plan.md) |
| 2 | Brand kit: voice, dialect guide (JO / KSA / Gulf / EG), taglines, hashtags, caption templates, claim register | [`02-brand-kit.md`](02-brand-kit.md) |
| 3 | Content calendar: 8 weeks, post by post | [`03-content-calendar.md`](03-content-calendar.md) |
| 4 | Launch checklist: handles, ad-account order, pixels and tags, approvals | [`04-launch-checklist.md`](04-launch-checklist.md) |
| 5 | Ad copy: every asset × platform, AR + EN, character-checked | [`copy/ad-copy.md`](copy/ad-copy.md) |
| 6 | Asset manifest: 13 films, logo sting, sonic logo, 97 stills, photo library | [`assets/manifest.md`](assets/manifest.md) |
| 7 | Prompts, job IDs, edit lists | [`prompts/`](prompts/) |
| 8 | Production tools (rebuild or re-render anything) | [`tools/`](tools/) |
| 9 | Mobile landing logo intro (owner request) | `components/landing/intro-sting.tsx`, `public/assets/brand/intro/`, `tests/e2e/intro.spec.ts` |

## Skills, connectors and tools used

| Capability | Used for |
|---|---|
| **Higgsfield** (MCP) | Keyframes (GPT Image 2.5), films and logo sting with native sound (Seedance 2.5, FLUX 3 Video for the alternate sting), voice-over (Text to Speech V2 with the ElevenLabs engine; Seed Audio tested and rejected), an image edit (flag removal), a cloud sandbox with Whisper for pronunciation QA, and media hosting for the video masters. Generation history was checked; **no website was published or deployed on Higgsfield.** |
| **GitHub** (repo access) | Studied `zaferdajani/oneclickconvert`: its `ad-director` and `campaign-director` skills define the production discipline copied here (short takes, locked assets, real UI instead of AI UI, Chromium-rendered Arabic, one outro identity, verify frames before delivery, claims traced to code). |
| **Claude Docs** | Shareable version of the plan (link in the session summary). |
| Playwright + Chromium, ffmpeg, Pillow | Real screen recordings of Sawwiq (Explore, Feed, the matcher in JO/SA/EN, the landing ledger), type rendering, assembly, loudness, QA contact sheets |
| Explore sub-agent | Summarised `docs/` and the landing copy into a fact base (claims, fees, test-mode payments) |
| Available but not used (no data yet) | Supermetrics: wire it to the ad accounts once they exist (launch checklist §2). Gmail and Google Drive: not needed; nothing was sent. |

## Cost of this production
- **Higgsfield credits:** 1,300.5 → 292.9, so **≈ 1,008 credits used**. Of that, about 830 went on 16 film clips, about 140 on 3 logo-sting takes plus the 16:9 sting, about 35 on keyframes and edits, and about 15 on voice-over. **≈ 293 credits remain**, enough for about 5 re-takes.
- **Paid media:** none spent. Scenarios are in `01-marketing-plan.md` §6: Lean ≈ 1,630 JOD, Standard ≈ 5,520 JOD, Growth ≈ 12,290 JOD for 90 days.

## Production rules followed (from OneClickConvert's ad-director)
1. One beat per clip (4–5 s), each started from an approved keyframe.
2. The product appears only as real screen recordings, never AI-drawn UI.
3. Arabic type is always rendered in Chromium with the brand fonts, never by the model.
4. Every film ends with the same sting and sonic logo. Its last frame is pinned to the exact logo file.
5. Every take was reviewed frame by frame. Rejected: sting A (stray dot reading «بس»), Seed Audio voices (mispronunciations), and one flag (removed).
6. Loudness: one constant gain to −14 LUFS with a true-peak ceiling. No limiter across the mix.
7. Claims are checked against code and docs. See the claim register in `02-brand-kit.md` §8.
