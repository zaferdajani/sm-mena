# Creator portfolio guidance + native social connections

Updated 29 September 2026 following the owner's clarification. Branch: feat/creator-guidance-social-connections. Initial guidance base: baa29500b54b161eea38e0fbc4446cbc75e75348.

## Read FIRST_RUN_WIZARD.md first

The user needs an automatic, short, step-by-step portfolio setup immediately after provider registration—not merely a help page. FIRST_RUN_WIZARD.md is the current UX/acceptance contract. Five stages: own logo/profile -> bring in work -> optional client/brand -> grouped project/media -> preview and explicit finish. Back, save/resume and import returns must work. Advanced pricing/contracts/payments are not part of onboarding. Respect registration-beta visibility and other launch gates. The existing guide is supporting material only and must not be presented as the finished wizard.

## Honest state (updated 29 September 2026, after PR #23 and the registration-phase reconciliation)

- IMPLEMENTED ON MAIN (PR #23, `a078796`): the five-step first-run wizard at `/portfolio-setup` with private resumable drafts (`portfolio_setups`, `portfolio_setup_media`, migration 0028), upload / PDF / Behance / platform-item sources, explicit publish-once, Studio → Connected platforms, and the software side of SOCIAL_CONNECTIONS.md (five adapters, consent flow, sealed tokens, disconnect and Meta callbacks). Details: docs/53-first-run-setup-and-connections.md. Unit and browser tests: tests/unit/portfolio-setup.test.ts, tests/unit/social-connections.test.ts, tests/e2e/portfolio-setup.spec.ts.
- IMPLEMENTED, SUPPORTING ONLY: the replayable `/studio/setup` guide, first-work prompts, examples and field highlights from PR #21. They are help, not the first-run experience.
- NOT LIVE FOR ANY PLATFORM: no developer app is registered and no credentials are deployed, so every platform shows "Not available yet" with its reason and the upload alternative. A platform becomes available only after the owner registers the app, the platform approves the permissions, the secrets are set in Vercel (never in chat) and a controlled live test with an authorized account passes (docs/53 → readiness gates).
- REGISTRATION PHASE (docs/54): the wizard's publish note, button and finished screen follow the page's own publication choice (private / anyone with the link / public), and the wizard never changes that choice.
- A second wizard written in parallel on `feat/registration-phase-integrated` (`/setup`, `onboarding_drafts`) was removed when that branch was reconciled with main; nothing of it reached production.
- Production acceptance of the wizard is a separate stage: it needs an authorized real provider account and a recorded journey; a passing suite is not that evidence.

## Reuse and boundaries

Your profile, an optional client or brand, one project/work sample, and that project's media are different objects. A source account adds where content comes from; access does not establish authorship. A single permitted image is enough to start. Never invent clients or outcomes or automatically copy fictional examples into a public portfolio. Keep personal/confidential paths, optional packages/connections and existing eligibility/payment rules intact.

The initial strings are in the CreatorSetup namespace of messages/ar.json and messages/en.json (moved from messages/creator/ during review: every string lives in the two root catalogs, per CLAUDE.md). They may be reused for optional contextual help while a concise wizard catalog is added. Do not replace either large root catalog or drop newer translations. Use actual source/post capabilities—current manual post form accepts images, not arbitrary video files.

The first slice has no migration or external-provider credentials. The full wizard may require additive tenant-owned progress/private-draft data and media lifecycle work: rehearse PGlite and disposable Postgres, preserve existing records and signed contracts, and never claim draft persistence while files exist only as browser File objects.

## Handoff and verification

CLAUDE_HANDOFF.txt is the updated single-paragraph command; it explicitly requires implementing the wizard and adapters rather than deploying documents. Full details and 14 acceptance checks: FIRST_RUN_WIZARD.md. Provider flows/security/approvals: SOCIAL_CONNECTIONS.md. Before main: complete the integrated production build, full suites and screenshot/accessibility review. After deployment: matching canonical /api/version and rendered SHA plus an authorized real setup/import/preview/resume flow, respecting beta privacy. Keep blockers distinct from completion.

## Primary sources

- Behance project basics: https://help.behance.net/hc/en-us/articles/204483644-Guide-Project-Basics
- Behance content -> Continue -> cover/details -> draft/publish: https://help.behance.net/hc/en-us/articles/204483684-Guide-Create-Publish-A-Project
- Upwork portfolio title, role, description and skills: https://www.upwork.com/resources/portfolio-guide

These inform interaction patterns; neither a spec nor a test count proves better usability. Measure first-work completion with consenting real creators and no verbal coaching once the flow is usable.
