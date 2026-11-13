# UI / product improvements backlog for Cloud

**Purpose:** One place for the owner's cloud coding agent ("Cloud") to find every improvement list the owner sent (Instagram reels / videos) and implement them as **draft PRs only**.

**Last updated:** 2026-11-06 (Asia/Amman)

---

## How to use (for Cloud)

1. Work on branch `claude/ui-improvements-backlog` (this file) or a fresh `claude/<topic>` branch off the repo default branch.
2. **Draft PRs only.** Never merge, never deploy, never apply migrations to live/staging databases, never spend money, never print or commit secrets.
3. Keep **each app's own visual style** (colours, type, existing components). Do not force one brand across apps.
4. Ship **Arabic + English** (and RTL) for every user-facing string you touch.
5. Prefer **free tools only** (owner rule: "i want only free !!").
6. For each list below: implement missing items, leave a short status note in the PR body (`done` / `already in place` / `needs owner decision` / `N/A for this app`), and open a **draft** PR. Do not change app code in *this* docs PR.
7. Hard rules that always apply: no merge/deploy without the owner's own OK; never touch pod `w6226aj6kjbt25`; never print `RUNPOD_API_KEY` or any token; FaceApp — do not merge #31 or #41, do not redeploy #67; clinic tax 5% only; TeamManager sponsors never see client data; never delete files without explicit yes.

**Repos for this file**

| Path | Notes |
|---|---|
| `docs/CLOUD_IMPROVEMENTS.md` | Canonical copy inside each user-facing web app repo (this PR) |
| `/workspace/CLOUD_IMPROVEMENTS.md` | Box copy for Apps Ops / local agents |

**Repos covered by this backlog:** TeamManager, sm-mena (Sawwiq), FaceApp, eventninja-genius, Plan-it, image-perfect-share, app-mall, oneclickconvert, clinic-clock-guardian, Im-Done.

---

## NEW — 2026-11-06 — Arabic UI/UX polish (7 tips)

**Source:** Instagram reel `https://www.instagram.com/reel/DfYK2gQtjwi/` (Arabic UI/UX tips; "خلينا نحسّنه" / Claude "pulse" before→after).  
**Status:** **Not implemented** as of 2026-11-06. Docs-only handover. Apply across all user-facing web apps above.  
**Applies to:** every repo in the table above (web UI surfaces).

| # | Instruction | Acceptance check |
|---|---|---|
| 1 | Remove extra glow / gradients; calm background; colour reserved for the primary button. | No decorative glow/blur overlays; page/card backgrounds are calm (neutral/soft); brand colour appears mainly on the primary CTA, not sprayed across chrome. |
| 2 | Replace emojis with one icon set, same size and stroke. | No emoji icons in chrome/nav/actions; one icon family (e.g. lucide / existing set); consistent size + stroke weight. |
| 3 | Delete coloured badges that add no information. | Decorative "NEW/HOT/LIVE" style badges removed unless they carry real state the user needs. |
| 4 | Reduce nested cards (card inside card); separate with spacing instead of borders. | No card-in-card stacks; related blocks separated by gap/padding, not extra bordered wrappers. |
| 5 | Group related information together so the eye doesn't search the screen. | Related fields/actions sit in one visual group; scanning a screen finds each topic in one place. |
| 6 | Consistent border radius between containers and inner elements. | Outer containers and inner controls share the same radius scale (tokenised). |
| 7 | Stop looping animations; motion only to clarify a change. | No infinite loops; motion only for state change (open/close, success, selection); respect `prefers-reduced-motion`. |

**Suggested PR title:** `UI polish: calm chrome, one icon set, no nested cards (reel 2026-11-06)` — draft only.

---

## Earlier lists (dated)

Apps Ops chat transcripts were **not readable** from this executor session (`SearchTranscripts` / store DB empty for Apps Ops). Earlier lists below were rebuilt from:

- reel files saved under `/workspace/reel/` and `/workspace/reels/` (Nov 1–3 and earlier),
- the draft PRs Cloud / Apps Ops already opened when those reels were applied,
- the owner's standing rule (2026-11-01): when he sends an improvement list as a video, extract it and apply it to every project that needs it.

### A. 2026-11-01 — App Store / Google Play rejection reasons (~12)

**Source:** `/workspace/reel/reel.mp4` + `/workspace/reel/reel2.mp4` ("12 reasons" / App Store reject pile).  
**Applied as draft PRs (same day):** App Store / Google Play compliance on every listed app, e.g. TeamManager [#47](https://github.com/zaferdajani/TeamManager/pull/47), sm-mena [#115](https://github.com/zaferdajani/sm-mena/pull/115), FaceApp [#127](https://github.com/zaferdajani/FaceApp/pull/127), eventninja-genius [#79](https://github.com/zaferdajani/eventninja-genius/pull/79), Plan-it [#2](https://github.com/zaferdajani/Plan-it/pull/2), image-perfect-share [#2](https://github.com/zaferdajani/image-perfect-share/pull/2), app-mall [#3](https://github.com/zaferdajani/app-mall/pull/3), oneclickconvert [#6](https://github.com/zaferdajani/oneclickconvert/pull/6), clinic-clock-guardian [#2](https://github.com/zaferdajani/clinic-clock-guardian/pull/2), Im-Done [#3](https://github.com/zaferdajani/Im-Done/pull/3).  
**Canonical checklist in-repo:** `docs/APP_REVIEW.md` (where present).  
**Status:** Draft PR open per app — **not merged**, migrations not applied.

Reconstructed tip list from the reel frames (pair with `docs/APP_REVIEW.md`):

| # | Tip (from reel) | Typical acceptance / PR mapping |
|---|---|---|
| 1 | (cover / intro — "12 reasons") | — |
| 2 | Google sign-in without Sign in with Apple | If Google login exists, also offer Apple; else N/A |
| 3 | Account deletion missing / hard to find | In-app delete-account path; App Review notes |
| 4 | "Open in browser" / thin website wrapper | Real app surfaces; not a bare site shell |
| 5 | Demo login for reviewers missing | Documented demo account plan (credentials not in repo) |
| 6 | Layout falls apart on iPad (Guideline 2.4.1) | Tablet layouts, safe-area, no overlapping text |
| 7 | (partial frame — treat via APP_REVIEW gaps) | Re-check remaining APP_REVIEW rows |
| 8 | "Coming soon" placeholders left in production | Hide placeholders outside DEV |
| 9 | Dead support / privacy links (404) | Live `/privacy`, `/terms`, `/support` URLs |
| 10 | (partial — cross-check APP_REVIEW) | Re-check remaining APP_REVIEW rows |
| 11 | Restore Purchases button broken / missing when IAP exists | Working restore, or no IAP ⇒ no restore needed |
| 12 | Paid features without a clear "Paid" label (Guideline 2.3.2) | Mark paid / PRO surfaces |

**Cloud follow-up:** Finish any APP_REVIEW rows still open; keep PRs draft until owner says ship.

---

### B. 2026-11-01 — App performance checklist (31 items)

**Source:** `/workspace/reel/reel3.mp4` (performance / cache series, counter up to 31).  
**Applied as draft PRs:** `perf: app-performance improvements` on every listed app, e.g. TeamManager [#48](https://github.com/zaferdajani/TeamManager/pull/48), sm-mena [#116](https://github.com/zaferdajani/sm-mena/pull/116), FaceApp [#128](https://github.com/zaferdajani/FaceApp/pull/128), eventninja-genius [#80](https://github.com/zaferdajani/eventninja-genius/pull/80), Plan-it [#3](https://github.com/zaferdajani/Plan-it/pull/3), image-perfect-share [#3](https://github.com/zaferdajani/image-perfect-share/pull/3), app-mall [#4](https://github.com/zaferdajani/app-mall/pull/4), oneclickconvert [#7](https://github.com/zaferdajani/oneclickconvert/pull/7), clinic-clock-guardian [#3](https://github.com/zaferdajani/clinic-clock-guardian/pull/3), Im-Done [#4](https://github.com/zaferdajani/Im-Done/pull/4).  
**Canonical checklist in-repo:** `docs/PERFORMANCE.md` (TeamManager copy summarised below).  
**Status:** Draft PR open per app — **not merged**.

| # | Item | Typical status (TeamManager #48) |
|---|---|---|
| 1 | Skeleton loaders | Already in place / verify per app |
| 2 | WebP/AVIF images | Often N/A without safe bulk conversion |
| 3 | Deduplicate API calls | QueryClient / shared loaders |
| 4 | Debounce search | Apply where search ranks large lists |
| 5 | Paginate API results | Keep financial exports complete |
| 6 | CDN | Infra — recommend only |
| 7 | Background jobs | Already / verify |
| 8 | N+1 queries | Profile before rewrite |
| 9 | Brotli/gzip | Infra — recommend only |
| 10 | Free caching | staleTime / TTL caches |
| 11 | Remove unused dependencies | Only with proof |
| 12 | Request timeouts | Apply on long polls / external fetches |
| 13 | Stream AI responses | Only with endpoint-safe plan |
| 14 | Optimistic UI | Only where safe (not unverified money flows) |
| 15 | Lazy images | `loading="lazy"` where missing |
| 16 | Parallel requests | `Promise.all` for independent reads |
| 17 | DB indexes | Only with query plans |
| 18 | Slow-request tracing | Defer until measured target |
| 19 | Server/DB regions | Infra |
| 20 | SSR/static rendering | Usually N/A for auth SPAs |
| 21 | Defer third-party scripts | Remove / defer blockers |
| 22 | Route code splitting | `React.lazy` / dynamic import |
| 23 | Virtualize long lists | Only after measured jank |
| 24 | Select needed columns | Tighten projections carefully |
| 25 | Connection pooling | Infra / backend only |
| 26 | Avoid excess re-renders | Memo / debounce expensive work |
| 27 | Browser caching headers | Infra |
| 28 | Load balancing | Infra |
| 29 | Fonts | `font-display: swap`; self-host only if licensed |
| 30 | Free web-vitals logging | Optional console-only |
| 31 | Slow-device / network testing | Manual Slow 4G + CPU throttle |

**Cloud follow-up:** Per app, close remaining PERFORMANCE.md "What's left" items that are code-side and free; leave infra to owner.

---

### C. 2026-11-03 — Privacy / data-collection checklist (16) + PDPL/GDPR

**Source:** `/workspace/reel/reel4.mp4` (Arabic signup / privacy series) + `/workspace/reel/reel5.mp4` ("COLLECT USER DATA. legally." 16-item checklist).  
**Applied as draft PRs:** Privacy compliance (Saudi PDPL + GDPR) on every listed app, e.g. TeamManager [#49](https://github.com/zaferdajani/TeamManager/pull/49), sm-mena [#117](https://github.com/zaferdajani/sm-mena/pull/117), FaceApp [#129](https://github.com/zaferdajani/FaceApp/pull/129), eventninja-genius [#81](https://github.com/zaferdajani/eventninja-genius/pull/81), Plan-it [#4](https://github.com/zaferdajani/Plan-it/pull/4), image-perfect-share [#4](https://github.com/zaferdajani/image-perfect-share/pull/4), app-mall [#5](https://github.com/zaferdajani/app-mall/pull/5), oneclickconvert [#8](https://github.com/zaferdajani/oneclickconvert/pull/8), clinic-clock-guardian [#4](https://github.com/zaferdajani/clinic-clock-guardian/pull/4), Im-Done [#5](https://github.com/zaferdajani/Im-Done/pull/5).  
**Canonical docs:** `docs/PRIVACY_COMPLIANCE_REPORT.md`, `docs/DPA_CHECKLIST.md`, `docs/INCIDENT_RESPONSE.md` (where present).  
**Status:** Draft PR open per app — **not merged**, migrations not applied. Owner still deciding TeamManager AI consent default for Jordan.

16-item checklist (from reel final slide + earlier frames):

| # | Tip | Status note |
|---|---|---|
| 1 | Make rejecting as easy as accepting (equal reject / no dark-pattern cookie walls) | In privacy PRs / verify per surface |
| 2 | Write a real privacy policy | `/privacy` bilingual pages — legal review still owner |
| 3 | Separate consents (policy vs marketing; no pre-ticks) | SignupConsent patterns |
| 4 | Parent / age OK (16+ gate) | Where sign-up exists |
| 5 | Account deletion | delete-my-account flows |
| 6 | List subprocessors | `/subprocessors` + DPA checklist |
| 7 | Transfer / cross-border terms | Transfer risk assessment docs |
| 8 | Report breaches within 72 hours | Incident response + alerts |
| 9 | Trackers wait until consent | No analytics before yes |
| 10 | No pre-ticked boxes | Marketing unticked by default |
| 11 | Collect less (only what you need) | Field minimisation |
| 12 | Consent log (who / when / what) | append-only consent_log |
| 13 | Download my data | Export button / edge function |
| 14 | Auto-delete old data (retention) | Retention purge jobs — clinical/payroll/tax never purged |
| 15 | DPAs signed with every vendor | Owner paperwork (`docs/DPA_CHECKLIST.md`) |
| 16 | Encrypt / protect data in transit & at rest | Platform defaults + no secrets in repo |

**Cloud follow-up:** Close known gaps called out in each PRIVACY_COMPLIANCE_REPORT (e.g. clinic-clock-guardian browser AI keys); do not apply migrations without owner OK.

---

### D. ~2026-10-26 — Trust / "free hosting" fear list (partial)

**Source:** `/workspace/reels/reel1.mp4` (dev.baytchain-style "0 of 6 free" / suspicious free host).  
**Status:** **Not found as a dedicated draft PR.** Related guidance already used elsewhere: prefer known free hosts (GitHub Pages / Cloudflare Pages) with real HTTPS; avoid sketchy free subdomains that browsers flag.  
**Cloud:** If implementing free landing pages, use the owner's approved free stack only; never put secrets on a "free app host" subdomain that looks like a scam.

---

### E. 2026-10-29…31 — Sawwiq Swiss UI v2 + usability review (sm-mena only)

**Source:** Owner-driven Sawwiq UI work (not the Nov UI reel).  
**Status:** Mostly **merged** on sm-mena (`Swiss UI v2…`, `fix(ux): whole-app usability review…`, follow-ups). Draft remains: sm-mena [#93](https://github.com/zaferdajani/sm-mena/pull/93) (agent dashboard / support / private chats).  
**Cloud:** Keep Sawwiq's Swiss system; when applying the new 7 UI tips, do not undo Swiss tokens — calm them instead.

---

## Not found / gaps

| Gap | Detail |
|---|---|
| Apps Ops live chat transcript | `SearchTranscripts`/`ReadTranscript` for Apps Ops (`5b2dbd9e-…`) returned no indexed messages from this executor; store.db `transcript_entries` was empty. Earlier lists reconstructed from saved reel files + existing draft PRs instead of chat quotes. |
| Exact wording of App Store tips #1, #7, #10 | Partial frames; use `docs/APP_REVIEW.md` as the implementation source of truth. |
| Any improvement reel after 2026-11-03 and before 2026-11-06 | No other improvement-list reel found in `/workspace/reel*` besides today's UI tips. Trading / free-hosting / TRELLIS reels in Me's chat were **not** UI improvement lists. |
| Im-Done Flutter verification | Privacy/perf/App Store drafts exist; Flutter not available on the box for live UI checks. |

---

## Suggested Cloud work order

1. **This file** stays docs-only (current PR).
2. Implement **NEW 7 UI tips** as one draft PR per app (no merge).
3. Sweep open App Store / perf / privacy drafts for leftover acceptance rows.
4. Report back with PR links and a per-item status table — still draft, still no deploy.
