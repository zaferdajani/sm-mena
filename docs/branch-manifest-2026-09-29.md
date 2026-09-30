# Branch manifest — zaferdajani/sm-mena

Date: 2026-09-29. Read-only analysis of `refs/remotes/origin/*` against `origin/main` (f60a299, 29 Sep). **No ref was deleted, moved or pushed; this document authorizes nothing.** Open-PR status was not queried; "active" follows the owner's list.

Columns: ahead/behind = commits on branch / on main since merge-base; cherry = `+` not on main / `-` patch-equivalent on main.

| Branch | Head | Last commit | Ahead/behind | Ancestor | cherry +/− | 3-dot diffstat | PR link | Class |
|---|---|---|---|---|---|---|---|---|
| audit/brochure-visual-evidence | 6a26b88 | 28 Sep — Verify merged brochure on production (Chromium/WebKit) | 3/31 | no | 3/0 | 3 files, +223 | unknown | EVIDENCE |
| audit/public-landing-profiles-20260927 | 3095a34 | 27 Sep — Isolated production interaction checks | 3/49 | no | 3/0 | 1 file, +59 | unknown | EVIDENCE |
| claude/jordan-agencies-platform-0cmjs3 | 1be3ebf | 26 Sep — Redesign /soon as vibrant animated page | 2/57 | no | 2/0 | 16 files, +419/−223 | none | SUPERSEDED |
| claude/marketing-campaign | d79fa27 | 29 Sep — Merge remote marketing branch | 30/2 | no | 19/0 | 15 files, +829/−1 | #2, #9, #10, #21 | ACTIVE |
| feat/creator-guidance-social-connections | 2f33fdd | 29 Sep — docs(onboarding): first-run wizard | 3/2 | no | 3/0 | 17 files, +754/−28 | #21 | ACTIVE |
| feat/registration-phase | 02d0310 | 29 Sep — Guarded registration-phase integration | 13/2 | no | 13/0 | 24 files, +1454 | none | ACTIVE |
| fix/layout-rhythm-intro-release | 27002a5 | 27 Sep — Merge main into branch | 4/48 | no | 2/0 | 15 files, +535/−340 | #13 (a9d92c7) | MERGED-BY-PATCH |
| fix/planner-redaction-canaries | a6ea61d | 28 Sep — docs(collab-v2) hardening evidence | 0/6 | **yes** | 0/0 | none | direct commits | MERGED-ANCESTOR |
| fix/sawwiq-hire-price-medians | b6d6cc8 | 25 Sep — Sawwiq improvement checkpoint | 3/101 | no | 3/0 | 3 files, +170/−1 | none | SUPERSEDED |
| launch-readiness-founder-activation | 0919cbb | 27 Sep — Test single Founder fee-waiver | 16/52 | no | 16/0 | 10 files, +223/−324 | #11 (d31336c) | MERGED-BY-PATCH |
| plan/collaboration-v2-upgrade | 9aa5e4c | 28 Sep — R3 hardening evidence | 0/8 | **yes** | 0/0 | none | direct commits | MERGED-ANCESTOR |
| sawwiq-human-arabic-founder-value | 8b8b4c6 | 27 Sep — restore main's strings, Founder keys | 2/54 | no | 2/0 | 12 files, +515/−267 | #7 (7c48ffe) | MERGED-BY-PATCH |
| style/brochure-design-system | 34fc095 | 28 Sep — server-safe theme bootstrap | 0/29 | **yes** | 0/0 | none | #17 + merge 43a3607 | MERGED-ANCESTOR |
| style/provider-profile-layout | bfc9fae | 27 Sep — Merge main; preserve followers workflow | 4/50 | no | 3/0 | 9 files, +467/−128 | #12 (38ee24f) | MERGED-BY-PATCH |

## Notes per branch

**audit/brochure-visual-evidence** — Adds only `.github/workflows/brochure-visual-evidence.yml`, `brochure-production-proof.yml` and `scripts/verify-brochure-production.mjs`; none exist on main. Screenshots live in Actions artifacts, not git. Pure additions.

**audit/public-landing-profiles-20260927** — Adds only `.github/workflows/public-page-evidence.yml` (read-only production checks). Not on main; additions only.

**claude/jordan-agencies-platform-0cmjs3** — Two commits redesign `/soon` (light, animated) with `components/teaser/motion.tsx` and seven `public/teaser/light/*.webp` scenes. Main instead recomposed the teaser in the brochure style (`components/teaser/teaser-view.tsx`, `app/[locale]/(landing)/soon/page.tsx`, commit 7a6a5e7). The light assets exist nowhere on main. Last touched 26 Sep, at the 3-day edge.

**claude/marketing-campaign** — Long-lived integration branch (PRs #2, #9, #10; its commits appear in #21's squash body). 13 of 15 touched files are identical on main; only `messages/{en,ar}.json` differ. Owner-listed active; keep.

**feat/creator-guidance-social-connections** — Squash-merged as #21 (37b4150) but the branch carries a `messages/creator/{en,ar}.json` split plus `i18n/request.ts` and `.github/workflows/creator-guidance-ci.yml` that main does not have (main keeps guide strings in root catalogs, f096d58). Active; keep.

**feat/registration-phase** — 13 commits, 24 new files, none on main: `lib/launch-phase.ts`, `lib/launch-access.ts`, `lib/data/publication.ts`, migration `0028_profile_publication.sql`, `components/registration/*`, `docs/51-registration-phase.md`. Active; keep.

**fix/layout-rhythm-intro-release** — PR #13's squash tree is byte-identical to this branch tip (`git diff a9d92c7 <branch>` is empty). `lib/release.ts`, `components/release-stamp.tsx`, `app/api/version/route.ts`, `docs/46-*` are all on main; later main edits explain remaining file differences.

**fix/planner-redaction-canaries** — Head a6ea61d is on main (ancestor). Nothing unique.

**fix/sawwiq-hire-price-medians** — Fix a711eb1 makes even-count medians average the two middle values. Main does the same via `lib/price-stats.ts` (`median` → interpolated `quantileSorted`, tested in `tests/unit/price-stats.test.ts`, since 1645b1b). Not on main: `tests/unit/hire-pricing.test.ts`, `docs/2026-09-25-improvement-log.md`. Its `lib/data/hire.ts` is now an older shape.

**launch-readiness-founder-activation** — PR #11 (d31336c) carries the same title and all 10 of this branch's files plus 10 more (migration `0020_founder_waiver.sql`, `founder-fees.test.ts`, `tests/e2e/founder.spec.ts`); the PR was merged from a later revision than this ref. Branch adds no file main lacks. `docs/45-founder-launch-readiness.md`, `lib/founding.ts`, `tests/unit/founder-activation.test.ts` all on main.

**plan/collaboration-v2-upgrade** — Head 9aa5e4c is on main (ancestor). Collab-v2 R1–R3 work landed by direct commits/merge 31b29fa. Nothing unique.

**sawwiq-human-arabic-founder-value** — PR #7's squash tree is byte-identical to this tip; #7's body lists both branch commits. `docs/43-arabic-voice.md`, `docs/44-founder-advantage.md`, `components/teaser/market-copy.ts` on main.

**style/brochure-design-system** — Head 34fc095 is on main (ancestor, via #17 and merge 43a3607). Nothing unique.

**style/provider-profile-layout** — PR #12's squash tree is byte-identical to this tip. `docs/provider-profile-layout.md`, `components/profile/profile-layout.module.css`, `tests/e2e/provider-profile-layout.spec.ts` on main; only later main edits to `ci.yml` and the CSS module differ.

## Update after PRs #23 and #24 (main `a078796` → `4aef3cf`, 29 Sep, later the same day)

`feat/creator-guidance-social-connections` was squash-merged again as PR #23 (the `/portfolio-setup` wizard, migration `0028_portfolio_setup_social`, platform connections). PR #24 then integrated `feat/registration-phase` (its 13 commits appear in #24's squash body) together with `fix/onboarding-acceptance`, and production moved to the registration phase (`/api/version` reports `launchPhase: registration`). Both branches therefore move from ACTIVE to MERGED-BY-PATCH once the owner re-checks `git diff <merge sha> <branch>`; this document did not re-run that comparison. `feat/registration-phase-integrated` (this session's parallel integration, head 758dd6b) is SUPERSEDED by #24: its unique remaining pieces (copy corrections, marketing alignment, docs) were ported to main as small commits; the branch can be deleted after that.

## Deletion candidates (owner decision)

MERGED-ANCESTOR (head already on main):
- fix/planner-redaction-canaries
- plan/collaboration-v2-upgrade
- style/brochure-design-system

MERGED-BY-PATCH (squash-merged; tree identical to PR commit, or superset landed):
- fix/layout-rhythm-intro-release (#13)
- style/provider-profile-layout (#12)
- sawwiq-human-arabic-founder-value (#7)
- launch-readiness-founder-activation (#11; PR is a later revision of this branch — confirm nothing local is missing)

## Keep

- ACTIVE: feat/registration-phase, feat/creator-guidance-social-connections, claude/marketing-campaign
- EVIDENCE: audit/brochure-visual-evidence, audit/public-landing-profiles-20260927
- SUPERSEDED (owner may salvage files first): claude/jordan-agencies-platform-0cmjs3 (light teaser assets, motion.tsx), fix/sawwiq-hire-price-medians (hire-pricing test, improvement log)

Nothing was deleted; every remote-tracking ref remains as found.
