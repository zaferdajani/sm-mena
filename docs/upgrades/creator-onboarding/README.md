# Creator portfolio guidance + native social connections

Updated 29 September 2026 following the owner's clarification. Branch: feat/creator-guidance-social-connections. Initial guidance base: baa29500b54b161eea38e0fbc4446cbc75e75348.

## Read FIRST_RUN_WIZARD.md first

The user needs an automatic, short, step-by-step portfolio setup immediately after provider registration—not merely a help page. FIRST_RUN_WIZARD.md is the current UX/acceptance contract. Five stages: own logo/profile -> bring in work -> optional client/brand -> grouped project/media -> preview and explicit finish. Back, save/resume and import returns must work. Advanced pricing/contracts/payments are not part of onboarding. Respect registration-beta visibility and other launch gates. The existing guide is supporting material only and must not be presented as the finished wizard.

## Honest state

- IMPLEMENTED IN THIS BRANCH (initial slice): replayable /studio/setup help page, first-work prompt on overview/profile, client/account explanation, four labelled examples, form-field highlights, blank description outline that does not replace existing writing, import shortcuts, Arabic/English catalogs and regression tests.
- SPECIFIED, NOT YET IMPLEMENTED: the new five-step first-run wizard, private resumable portfolio drafts and integrated source-to-preview journey in FIRST_RUN_WIZARD.md. The clarification commit changes documentation only; no application deployment or tests are claimed by that commit.
- SPECIFIED, NOT YET IMPLEMENTED: native Google/YouTube/Instagram/Facebook/TikTok OAuth and reviewed imports in SOCIAL_CONNECTIONS.md. No fake Connect/Connected state, no pasted URL treated as authorization, no publishing prerequisite tied to social connection.
- No merge to main or production deployment by this planning update. Re-check exact current branch and all CI before implementation; prior partial CI is not current production evidence.

## Reuse and boundaries

Your profile, an optional client or brand, one project/work sample, and that project's media are different objects. A source account adds where content comes from; access does not establish authorship. A single permitted image is enough to start. Never invent clients or outcomes or automatically copy fictional examples into a public portfolio. Keep personal/confidential paths, optional packages/connections and existing eligibility/payment rules intact.

The initial strings are in the CreatorSetup namespace of messages/ar.json and messages/en.json (was messages/creator/)ar.json and en.json, merged as CreatorSetup by i18n/request.ts. They may be reused for optional contextual help while a concise wizard catalog is added. Do not replace either large root catalog or drop newer translations. Use actual source/post capabilities—current manual post form accepts images, not arbitrary video files.

The first slice has no migration or external-provider credentials. The full wizard may require additive tenant-owned progress/private-draft data and media lifecycle work: rehearse PGlite and disposable Postgres, preserve existing records and signed contracts, and never claim draft persistence while files exist only as browser File objects.

## Handoff and verification

CLAUDE_HANDOFF.txt is the updated single-paragraph command; it explicitly requires implementing the wizard and adapters rather than deploying documents. Full details and 14 acceptance checks: FIRST_RUN_WIZARD.md. Provider flows/security/approvals: SOCIAL_CONNECTIONS.md. Before main: complete the integrated production build, full suites and screenshot/accessibility review. After deployment: matching canonical /api/version and rendered SHA plus an authorized real setup/import/preview/resume flow, respecting beta privacy. Keep blockers distinct from completion.

## Primary sources

- Behance project basics: https://help.behance.net/hc/en-us/articles/204483644-Guide-Project-Basics
- Behance content -> Continue -> cover/details -> draft/publish: https://help.behance.net/hc/en-us/articles/204483684-Guide-Create-Publish-A-Project
- Upwork portfolio title, role, description and skills: https://www.upwork.com/resources/portfolio-guide

These inform interaction patterns; neither a spec nor a test count proves better usability. Measure first-work completion with consenting real creators and no verbal coaching once the flow is usable.
