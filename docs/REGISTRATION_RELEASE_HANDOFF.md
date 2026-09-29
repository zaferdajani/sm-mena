# Registration release — shared session handoff

Owner: Zafer Dajani. Coordination thread: PR #22.
Canonical integration branch: `feat/registration-phase`.
This document is a checkpoint, not evidence that another session has read it.

## Required outcome

Free early-access registration and real profile building. Public examples are
labelled and available before signup. No public member counts or sparse directory.
Preserve the approved Noto Sans Arabic/brochure design and natural market copy.
No invented attendance, activity, guaranteed work or hidden surprise charges.
Private resumable profiles, owner-controlled publication, private portfolio media,
and server-enforced discovery restrictions. No new contracts, NDAs, milestone
funding or subscriptions during registration. Preserve existing signed records.
`registration` → `discovery` → `full` must not reset user data or publication choice.

## Cross-session protocol

Read PR #22 and refresh branch/main before edits. Post file ownership, current SHA
and unpushed work before editing overlapping files. Do not force-push, discard
active work, weaken tests, run production seeds/resets or enable real payments.
One integrated candidate, one final suite run, one normal production deployment.
A second session's suggested assignment is not accepted until acknowledged.

ChatGPT's current scope: media-route regression assertion and country-picker race.
Requested independent review from the other session: migration/snapshot/RLS,
private profile and media disclosure, and rollout/rollback configuration.
Until acknowledged, these remain unassigned review tasks, not delegated work.

## Verified pre-fix evidence

Run 36546948683 at 210fea0: 305 expected browser passes, 3 failures, 9 skips,
0 flaky. Two failures asserted the obsolete public upload URL on mobile/desktop.
One desktop failure followed a Saudi country selection. Build, lint, typecheck,
unit tests and the separate registration browser job passed on that older head.
Integrated head 811343c includes main 96c09da (onboarding/site-check work); those
older passes are not a green result for the integrated candidate.

## Patch under review

- New-upload compression test now requires the protected portfolio route and
  private/no-store delivery, retaining upload/stored-size assertions.
- Pickers subscribe to the same saved country. Fresh cookie checks prevent a
  later-mounted header/sidebar from replacing a user choice with stale SSR props.
- A selection generation invalidates delayed GPS results after an explicit
  choice. Server hydration uses the original server snapshot; later renders read
  the current cookie. Added browser regressions deliver late GPS deterministically.
- The original country/price/filter browser assertions remain unchanged.

## Acceptance — do not claim completed until evidenced

1. Both full-platform and registration browser suites, unit tests, lint and
   typecheck pass on the actual integrated head; inspect relevant screenshots.
2. Verify staged migration consistency, private media authorization and exposure
   through APIs/metadata/sitemaps/AI tools; keep publication choices on transitions.
3. Check production rollout prerequisites without printing credentials or secrets.
4. Merge through PR #22 only after acceptance; retain active branches.
5. Verify live sawwiq.org merge SHA, revision, launchPhase, health and rendered
   registration/demo/signup/control journeys. Use the existing read-only script
   on `audit/registration-release-check`; no production dummy registrations.
6. Record actual outputs and unresolved items in PR #22. Branch, preview, merged,
   deployed and production-verified are separate statuses.
