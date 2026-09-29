# Creator portfolio guidance + native social connection brief

Prepared 2026-09-29. Base: baa29500b54b161eea38e0fbc4446cbc75e75348. Branch: feat/creator-guidance-social-connections.

## State (do not conflate these)
- Implemented in this branch: replayable /studio/setup guide, first-work prompt on overview/profile, client-versus-account explanation, four labeled illustrative examples, real form field highlighting, blank description outline that never overwrites existing text, existing import shortcuts, Arabic/English catalogs, unit and Playwright regression coverage.
- OAuth connections and native social media import: RESEARCHED / SPECIFIED, NOT IMPLEMENTED by this guide. Read SOCIAL_CONNECTIONS.md for the official API plan, platform requirements and implementation acceptance. The guide explicitly says it does not enable social imports. Do not display a fake Connected state, mark a pasted URL verified, or make OAuth a publishing prerequisite.
- Not deployed by preparation. Local environment cannot resolve GitHub/sawwiq.org to clone/install/render; GitHub connector read/write works. Isolated syntax/pure-function checks are not full app CI or visual/production acceptance. The branch-only workflow requests the full existing suites without opening a PR or changing main.

## Product model
Your profile -> optional client/brand -> one project or work sample -> 1–10 images/screenshots in the existing form. One image is sufficient. Multiple clients or unrelated projects should not be mixed merely to fill the maximum. Personal/practice work can omit a client, but must be described honestly. A social account/source is not a portfolio client, an OAuth grant is not authorship, and an example is not a published record.

The default path remains fast: complete your profile, add one work sample, then expand. Optional clients/packages/connections do not affect the guide's two-step count or Founder rules. This educational count is not an eligibility check.

## UX and accessibility
No forced full-screen tour, hidden close button, new mandatory fields or newsletter gate. Four step buttons focus and highlight the real image/caption/client/service fields; Escape clears the highlight and returns focus. Motion respects reduced-motion. All explicit controls have 44px minimum height. Example cards switch content but never alter the form. A description outline is inserted only by an explicit action into an empty field, in the provider's configured content language, not automatically from a fictional example. Existing uploads, publishing validation, form actions, client confirmation, post types, imports, auth and permissions are unchanged.

New localized strings are in the CreatorSetup namespace of messages/ar.json and messages/en.json (the project rule: every string lives in the two root catalogs). Locale routing remains ar/en. No external telemetry, new personal data, OAuth secrets or migrations in the guidance slice.

## Acceptance before merging the guidance
Run lint, typecheck, all units, production build and full Playwright on a candidate integrated with current main. Review screenshots at 320, 390, 768, 1440px, both locales, light/dark and 200% zoom; exercise keyboard/reduced motion. Test before/after selecting files and writing text so the guide never destroys progress. Verify import off/soon/on does not advertise unavailable imports. Read-only guide visits must not change post/client counts, send messages, consume seats or affect Founder flags. Confirm standard publish/edit/delete flows still pass. Check main immediately before push and preserve concurrent changes. Update the appropriate UI revision and release-proof expectations together only on the integrated candidate. After deployment, verify /api/version + rendered SHA and controlled authenticated studio routes on sawwiq.org. Do not claim visual acceptance without viewing the rendered evidence.

## Research used (primary sources)
- Behance explains projects as grouped media around one theme and offers cover/title/preview concepts: https://help.behance.net/hc/en-us/articles/204483644-Guide-Project-Basics and https://help.behance.net/hc/en-us/articles/204483684-Guide-Create-Publish-A-Project
- Behance explains a cover as the entry point into the full project: https://help.behance.net/hc/en-us/articles/204483484-Guide-Cover-Image-Project-Title
- Upwork's portfolio guidance asks for title, role, project description and relevant skills: https://www.upwork.com/resources/portfolio-guide

Adapted patterns, not copied UI or proof that our onboarding outperforms theirs. Proposed validation: ask consenting first-time creators to publish one permitted work sample without verbal coaching; observe whether they correctly distinguish provider/client/project/image and note abandonment/help requests. No pilot results yet.
