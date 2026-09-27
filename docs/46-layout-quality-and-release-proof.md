# Layout repair and release evidence — 27 September 2026

## Ownership and scope
The repository-scoped Claude Code definition is `.claude/agents/sawwiq-layout-specialist.md`. It configures a specialist for an actual Claude Code session; creating this file does not launch a worker or schedule background execution. Invoke that specialist from a session with this branch checked out. The first repair batch in this branch was implemented directly, not by a secretly running worker.

Public provider-profile changes remain in PR #12, independently reviewable. Do not discard or claim that branch is on production. Studio/user settings grouping still needs a route-by-route authenticated audit; it is not declared repaired by this batch.

## Owner evidence and confirmed source causes
The attached screenshots show the trust heading against a joined card grid, an oversized rating, weak separation of Explore results, and a footer dominating a two-result listing. The owner also reports a missing initial logo intro and a huge cropped intro after clicking home.

Source inspection found a desktop exclusion in the intro gate and a full-screen `object-cover` video. The inline-only initial gate did not provide an equivalent SPA lifecycle check. Landing `.sw p/h2/ul/...` reset selectors override several single-class component spacing rules. The repair introduces a route-scoped spacing contract, which has sufficient specificity without affecting app/profile typography. It separates trust cards, restores heading/body/list spacing, bounds the rating, and retains honest example labels and all existing content.

Explore now has a visible title/count, a distinct filter group, selected-tab surface, and individual provider cards. The shell has a growing content area before its footer; desktop sidebar controls remain reachable by scrolling. The footer retains its SEO/service/trust links but groups them more compactly.

## Release identity
`/api/version` responds without caching and returns only `revision`, `commit`, `environment`. Landing and application footers expose the same revision and SHA. Missing deployment-provided SHA is `null`/`unknown`, never silently substituted with the main branch tip. The revision name is not evidence that CI passed.

## Required acceptance
Run lint, typecheck, all unit tests, production build and full Playwright. New tests check landing text/card gaps, intro viewport bounds and lifecycle, Explore/footer separation, and matching version/stamp values. Retain successful screenshot artifacts. These assertions do not replace visual review or a real-media autoplay check.

Check Arabic and English at 320/390/768/1440/1920 widths, including dark app theme, empty supply, long mixed-language names, 200% zoom, navigation to home, existing-session return, blocked storage, reduced motion, media failure and stalled playback. Test keyboard focus and mobile navigation. Do not delete tests or pretend a test double proves actual video decoding/autoplay.

## Production acceptance — independent of CI
After an approved merge, fetch the exact merged SHA and deployment status. Request the canonical production /api/version with no cache; require `environment=production`, a non-null matching SHA, and the expected revision. Confirm that the rendered landing and Explore/profile footer stamps show that same SHA. Capture actual production screenshots and an intro recording, not merely a preview. Verify both fresh and existing browser sessions. Record exact URLs, locale, viewport, timestamp, release SHA and observations.

At preparation time this environment could read/write GitHub, but could not clone/install the app or reach/render sawwiq.org. Local syntax checks are not a full build. Live source matching, media playback and visual acceptance are therefore unverified until executed with browser access. No production deployment is claimed by this document.
