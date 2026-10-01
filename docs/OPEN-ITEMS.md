# Sawwiq — open items (living list)

Kept current by the working session; every report to the owner ends with this list.
Last update: 2026-10-01 09:20 UTC, main at the commit that carries this file. Production: sawwiq.org runs the registration phase with the early-access campaign (`/api/version` → d3e971b, revision registration-setup-2026-09-29, launchPhase registration; verified 2026-10-01 09:06 UTC); the scheduled site check is green.

## Owner decisions (nobody else can close these)

0. **Early-access campaign (docs/55) is on main.** Look at sawwiq.org/ar and /en on your phone and desktop and say if the wording should change; the copy keys are `Registration.launch`, `cohort`, `trust`, `early` in messages/{ar,en}.json. Architecture direction for web + PWA + native lives in docs/architecture/; the next engineering step (M1, shared brains) needs no decision, the API slice (M2) and the Expo app (M3) do.

1. **Founding-cohort wording.** docs/44 approves 0% commission on the first project, 7% for the launch year and six months of Pro; the earlier "first 40 founding agencies, lifetime free Pro" line was replaced in the catalogs. Confirm the cohort size the marketing kit may quote (marketing/02 says 100, per docs/44 "cohort capacity").
2. **Platform connections.** All five providers show "Not available yet" until a developer app is registered per platform, its secrets set in Vercel (never in chat), the platform approves the permissions and a controlled live test with an authorized account passes (docs/53 readiness gates).
3. **Branch deletions on GitHub** (the git proxy refuses branch deletion): merged-ancestor branches fix/planner-redaction-canaries, plan/collaboration-v2-upgrade, style/brochure-design-system; and, after a `git diff` re-check, feat/creator-guidance-social-connections (#23), feat/registration-phase (#24) and feat/registration-phase-integrated (superseded by #24). docs/branch-manifest-2026-09-29.md has the classification.
4. **Payment partner, legal sign-off, Vercel plan.** Protected payments, checkout, subscriptions and paid vendors stay on HOLD until a licensed partner and legal review exist; the Vercel plan and environment cannot be read from these sessions (403).
5. **Pilot (AC36 / FIRST_RUN_WIZARD.md §measurement):** prepared, not run. Needs consenting real creators, an interviewer and a segment.

## Verification still owed (needs an authorized account, not a decision)

6. **Authenticated production acceptance of the wizard and the registration Studio** with a real provider account that the owner authorizes; the live-journey workflow uses the seeded demo provider and needs the SEED_DEMO_PASSWORD secret plus one Maintenance → seed-demo run (docs/53). No founding seat may be consumed and no guessed passwords tried.
7. **Complete intro video playback with an `ended` event directly from production** in a browser outside the sandbox (the R3 records explain why the sandbox cannot).

## Engineering follow-ups (small, unblocked)

9. Roadmap M1 (docs/architecture/mobile-and-api-roadmap.md §3 steps 1–5): move catalogs and pure rules under a shared folder behind re-export shims, lift the Zod schemas out of the actions, swap `next-intl`'s `createTranslator` for `use-intl` inside lib/. Each step is small and covered by the existing suites; the boundary test guards the result.
10. Dependency audit "needs review" items: delete `@supabase/ssr` and lib/supabase/* if no Supabase Auth work is planned; lazy-load the AI SDKs; move `shadcn` to devDependencies.
11. Draw a maskable 512 px icon for the manifest.

## Closed since the last list

- Early-access campaign layer shipped (docs/55): strip, cohort mark, cohort CTA, promise line, why-join-early; validated at 320–1440, dark, reduced motion, keyboard; full and registration suites green on bb45e32.
- Mobile-ready foundation: docs/architecture/mobile-and-api-roadmap.md, dependency-audit.md, shared error contract, framework-boundary test, phase-aware manifest, lazy PDF reader on the studio importer.

- PR #1 closed (superseded by lib/price-stats.ts on main).
- Two flaky phone tests root-caused (a click landing before React hydration: a <details> summary in the contract change request, the pin tap on a work-order asset) and made deterministic; 3 consecutive runs with retries off passed.
- Wizard accessibility pass on main: dark mode (ar/en, 390/1440), 200 % zoom (720 CSS px), keyboard-only walk (Tab order, visible focus ring, Enter on Continue, focus lands on each step's heading): 39 captures, 0 overflow, 0 broken images. One fix: the step heading now keeps "Step n of 5" below the sticky header when focus scrolls to it (docs/upgrades/creator-onboarding/a11y-2026-09-30/).

- Registration phase deployed by PR #24; migration 0028 re-dated and applied in production (PR #22 thread, 29 Sep 13:35 UTC).
- Team-role picker verified live on /join at d2c6659 (owner's upload: 6 pages, Chromium and WebKit, ar/en, 390/1440, 0 failures, 0 runtime errors).
- Retired "first Arabic platform" claim removed from the referral share text; Founder copy aligned with docs/44 (this commit).
