# Sawwiq — open items (living list)

Kept current by the working session; every report to the owner ends with this list.
Last update: 2026-09-30 06:00 UTC, main at the commit that carries this file. Production: sawwiq.org runs the registration phase (`/api/version` → revision registration-setup-2026-09-29, launchPhase registration); the scheduled site check is green.

## Owner decisions (nobody else can close these)

1. **Founding-cohort wording.** docs/44 approves 0% commission on the first project, 7% for the launch year and six months of Pro; the earlier "first 40 founding agencies, lifetime free Pro" line was replaced in the catalogs. Confirm the cohort size the marketing kit may quote (marketing/02 says 100, per docs/44 "cohort capacity").
2. **Platform connections.** All five providers show "Not available yet" until a developer app is registered per platform, its secrets set in Vercel (never in chat), the platform approves the permissions and a controlled live test with an authorized account passes (docs/53 readiness gates).
3. **Branch deletions on GitHub** (the git proxy refuses branch deletion): merged-ancestor branches fix/planner-redaction-canaries, plan/collaboration-v2-upgrade, style/brochure-design-system; and, after a `git diff` re-check, feat/creator-guidance-social-connections (#23), feat/registration-phase (#24) and feat/registration-phase-integrated (superseded by #24). docs/branch-manifest-2026-09-29.md has the classification.
4. **PR #1** (fix/sawwiq-hire-price-medians) is still open and superseded by lib/price-stats.ts on main: close it.
5. **Payment partner, legal sign-off, Vercel plan.** Protected payments, checkout, subscriptions and paid vendors stay on HOLD until a licensed partner and legal review exist; the Vercel plan and environment cannot be read from these sessions (403).
6. **Pilot (AC36 / FIRST_RUN_WIZARD.md §measurement):** prepared, not run. Needs consenting real creators, an interviewer and a segment.

## Verification still owed (needs an authorized account, not a decision)

7. **Authenticated production acceptance of the wizard and the registration Studio** with a real provider account that the owner authorizes; the live-journey workflow uses the seeded demo provider and needs the SEED_DEMO_PASSWORD secret plus one Maintenance → seed-demo run (docs/53). No founding seat may be consumed and no guessed passwords tried.
8. **Complete intro video playback with an `ended` event directly from production** in a browser outside the sandbox (the R3 records explain why the sandbox cannot).

## Engineering follow-ups (small, unblocked)

9. Wizard visual review in dark mode, keyboard-only and 200 % zoom (light mode at 320/390/768/1440 in both languages was reviewed on the superseded branch; main's wizard differs slightly and deserves its own pass).
10. The two known flaky mobile tests (contracts.spec.ts:104, work-orders.spec.ts:39) pass on retry; root-cause them rather than keep retrying.
11. docs/proposals/ci-registration-job.diff is obsolete: main's CI already runs the registration job; delete the proposal.

## Closed since the last list

- Registration phase deployed by PR #24; migration 0028 re-dated and applied in production (PR #22 thread, 29 Sep 13:35 UTC).
- Team-role picker verified live on /join at d2c6659 (owner's upload: 6 pages, Chromium and WebKit, ar/en, 390/1440, 0 failures, 0 runtime errors).
- Retired "first Arabic platform" claim removed from the referral share text; Founder copy aligned with docs/44 (this commit).
