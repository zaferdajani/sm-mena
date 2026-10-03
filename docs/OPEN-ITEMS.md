# Sawwiq — open items (living list)

Kept current by the working session; every report to the owner ends with this list.
Last update: 2026-10-03 16:35 UTC, main at the commit that carries this file. Production: sawwiq.org runs the registration phase on e9368c1 (`/api/version` → e9368c1; Vercel dpl_sxgPKasvKR5hWEr8vLAvy7r1gmNV; verified live 16:33 UTC). Today's evidence: docs/upgrades/landing-redesign/release-evidence.2026-10-03{,b,c,d,e}.json, docs/upgrades/join-steps/release-evidence.2026-10-03.json, docs/upgrades/live-journey-2026-10-03/journey.json.

## Owner decisions (nobody else can close these)

0. **Landing first fold: done as directed.** Locate button and theme toggle gone (#52), three hero slides with the platform statement on a frosted panel (#53, #54), the announcement strip dropped (#55). Nothing is pending here unless you want a different photo or line on slides 2 and 3. #41 can be closed on GitHub as superseded.
1. **Founding-cohort size: closed — 100.** The code enforces 100 seats (`lib/core/rules/founding.ts`), marketing/01 and marketing/02 quote 100, and docs/44 now says 100 explicitly instead of "cohort capacity". Nothing left to decide unless you want a different number, which would be a code and copy change.
2. **Platform connections.** All five providers show "Not available yet" until a developer app is registered per platform, its secrets set in Vercel (never in chat), the platform approves the permissions and a controlled live test with an authorized account passes (docs/53 readiness gates). Checked 3 Oct: no provider app keys exist in the Vercel project (names only were read), so every connection stays "Not available yet" by design; the live journey confirms the setup shows 5 honest blockers and 0 connect buttons.
3. **Branch deletions on GitHub** (the git proxy refuses `git push --delete` and answers 403 to the REST delete — re-confirmed 3 Oct 15:50 UTC — so only you can do it; today's merged branches can go too: design/landing-quiet-header, design/landing-hero-slides, design/modern-select, design/landing-drop-strip, ci/intro-playback-check, docs/open-items-sweep-2, feat/m1-shared-brains, feat/m2-api-slice-a, fix/landing-laptop-fit, fix/remove-ahl-al-tasweeq, fix/registration-pages-measure, feat/join-steps, design/landing-fold-simplify, fix/about-registration-redirect, chore/audit-icon, design/landing-calm-premium-v3): merged-ancestor branches fix/planner-redaction-canaries, plan/collaboration-v2-upgrade, style/brochure-design-system; and, after a `git diff` re-check, feat/creator-guidance-social-connections (#23), feat/registration-phase (#24) and feat/registration-phase-integrated (superseded by #24). docs/branch-manifest-2026-09-29.md has the classification.
4. **Payment partner, legal sign-off, Vercel plan.** Protected payments, checkout, subscriptions and paid vendors stay on HOLD until a licensed partner and legal review exist; the Vercel plan and environment cannot be read from these sessions (403).
5. **Pilot (AC36 / FIRST_RUN_WIZARD.md §measurement):** prepared, not run. Needs consenting real creators, an interviewer and a segment.

## Verification still owed (needs an authorized account, not a decision)

6. **Authenticated production acceptance: done 3 Oct 16:06 UTC.** The Live journey workflow (run 37135571604, GitHub runner, seeded demo provider, no account created) passed 10/10 on production 1be3fb3: sign-in, setup opens at step 2, providers honest (5 blockers, 0 connect buttons), image staged privately and hidden from others (404), resume after reload, project saved and opened by its owner, test project deleted (404). Evidence: docs/upgrades/live-journey-2026-10-03/. Re-run it after any deploy from Actions → Live journey.
7. **Intro video playback to `ended` from production: done for the files, page-level waits for the full phase.** The intro sting lives on the full-phase landing, which production does not render during registration, so the page itself cannot be played yet. The new Intro playback workflow (#56) plays the production intro files to their `ended` event in a real Chromium on a GitHub runner (run 37136798003: webm and mp4 both ended, 4.08 s, evidence docs/upgrades/intro-playback-2026-10-03/). When the full phase opens, run it with `page=https://sawwiq.org/ar?intro=1` to prove the sting itself.

## Engineering follow-ups (small, unblocked)


9. Roadmap M3 (Expo client) needs your decision before it starts (docs/architecture/mobile-and-api-roadmap.md §5); M1 and M2 are on main. To try the API on a staging deployment set `API_V1_ENABLED=true` there (never in production until the mobile beta).

## Closed since the last list

- 3 Oct (latest): launch strip dropped (#55 → 03e19e4, dpl_21vUaYtT4kPjn8Gvr5MS2igRb7hA; live: 0 strip elements, page opens with the header, ar/en 1440/390/320); cohort size settled at 100 across code, kit and docs/44; authenticated production acceptance done by the Live journey workflow (run 37135571604, 10/10 on 1be3fb3); intro files play to ended from a GitHub runner (#56 → e9368c1, run 37136798003). Evidence: docs/upgrades/landing-redesign/release-evidence.2026-10-03e.json.

- 3 Oct (afternoon): quiet landing header (#52 → 8b3c22d), hero slides with the platform statement (#53 → cd381d1, dpl_9ZEWSMhajsDbUz46AzzELts5gjWe), modern selects and a deeper slide-caption scrim (#54 → 50e5a82, dpl_78qyjV2Wsx65LGoUCz7bajgE3ym9). Verified live on 50e5a82 in ar/en at 1440/390 and ar at 320: no theme toggle or locate button on the landing, three slides with the statement, no "first platform" wording, dots work, no overflow, CTA in the first fold; join dropdowns show one chevron at the inline end in both languages, light and dark.

- 3 Oct (earlier): first-fold simplification (#49 → 60958b0); /about no longer nests a second landing in the app shell during registration (#50 → 3a741e8); dependency audit items done and a maskable app icon added (#51 → 1c4f620). All verified live on 1c4f620.

- 3 Oct (later): the example page and every registration page share the landing's laptop measure (#47 → 1a8cdc5; gutter 192 → 80 px on your laptop); sign-up is three short steps with a browser-kept draft (#48 → 63ea94c), verified live in ar/en at 1536/390/320 without creating an account.

- 3 Oct: rejected phrase «أهل التسويق» removed from every Arabic string and the campaign script (#46 → 6eb2518, verified on the rendered pages); landing fits laptop screens edge to edge (#44 → 82ff5c3, measured live at 1536×722@1.25, 1366×657, 1280×600@1.5, 1440×900, 1920×1080, 1024×680, 390×844); roadmap M1 (#43 → e1e6629) and M2 (#45 → ba40b06, API switch off in production) merged and deployed.

- Landing redesign PR #42 repaired (duplicate why-join-early section, phone headline pushing the CTA below the fold, 7px strip overflow), validated green on 3db28c2 (CI run 37107343465: all three jobs; local full Playwright 335 passed), squash-merged as ed65697, deployed by Vercel (dpl_2JBDn8ChzxQUupu1AV6EUBtE5mbr) and verified live on sawwiq.org ar/en at 390/1440 and ar at 320: no overflow, no broken assets, language switch and CTA → /join work, nothing submitted.

- Early-access campaign layer shipped (docs/55): strip, cohort mark, cohort CTA, promise line, why-join-early; validated at 320–1440, dark, reduced motion, keyboard; full and registration suites green on bb45e32.
- Mobile-ready foundation: docs/architecture/mobile-and-api-roadmap.md, dependency-audit.md, shared error contract, framework-boundary test, phase-aware manifest, lazy PDF reader on the studio importer.

- PR #1 closed (superseded by lib/price-stats.ts on main).
- Two flaky phone tests root-caused (a click landing before React hydration: a <details> summary in the contract change request, the pin tap on a work-order asset) and made deterministic; 3 consecutive runs with retries off passed.
- Wizard accessibility pass on main: dark mode (ar/en, 390/1440), 200 % zoom (720 CSS px), keyboard-only walk (Tab order, visible focus ring, Enter on Continue, focus lands on each step's heading): 39 captures, 0 overflow, 0 broken images. One fix: the step heading now keeps "Step n of 5" below the sticky header when focus scrolls to it (docs/upgrades/creator-onboarding/a11y-2026-09-30/).

- Registration phase deployed by PR #24; migration 0028 re-dated and applied in production (PR #22 thread, 29 Sep 13:35 UTC).
- Team-role picker verified live on /join at d2c6659 (owner's upload: 6 pages, Chromium and WebKit, ar/en, 390/1440, 0 failures, 0 runtime errors).
- Retired "first Arabic platform" claim removed from the referral share text; Founder copy aligned with docs/44 (this commit).
