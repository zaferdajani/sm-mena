# Sawwiq improvement checkpoint — 2026-09-25

## Repository and scope

- Repository: `zaferdajani/sm-mena`; production domain: `sawwiq.org`.
- First improvement branch: `fix/sawwiq-hire-price-medians`.
- The preceding public-site business/SEO audit was not a complete source-code, analytics, security, or legal audit. Revalidate its findings against current source and current production before changing behavior.
- Preserve Arabic-first RTL, English parity, credential-free tests, consent protections, owner access, and launch/monetization gates documented in `CLAUDE.md`.
- `main` is a deployment branch. A branch commit or an open pull request is not a verified production fix. Do not merge or deploy without the owner's deployment authorization and the required checks.

## Batch 1: package medians

Source-confirmed defect: `packageFacts` in `lib/data/hire.ts` selected the lower middle observation for an even-sized sample. For example, package prices of 250 and 320 returned 250 instead of 285.

Implemented on the improvement branch:

- Average both middle observations for an even sample.
- Retain the central observation for odd samples and preserve null for empty delivery-time samples.
- Apply the correction to monthly prices, one-off prices, and delivery times.
- Add eight database-backed regression cases in `tests/unit/hire-pricing.test.ts`, using the existing isolated in-memory test setup. No production database is used.

The starting-price guide and package facts use different source populations. They are not expected to have identical medians unless their observations match. This patch corrects the statistical calculation; it does not redefine the populations or assert that demo prices are market evidence.

Verification: inspect the associated pull request and its latest CI run for the authoritative status. Added tests are not evidence of passing tests until execution succeeds. The editing environment could not clone the repository because external DNS was unavailable; full application checks must run in repository CI or an authorized development environment.

No payment settings, commission rates, agency eligibility rules, personal-data sharing, production records, or legal claims are changed in this batch.

## Prioritized follow-up backlog

Each item below requires a focused source review and a testable acceptance condition. These are not claims that every item is currently broken.

1. **Demo-data boundaries.** Trace demo agencies through public listings, counts, price guides, AI tools, review aggregates, and structured data. Preserve a deliberate demonstration experience while preventing demonstration data from being mistaken for genuine supply or market evidence. Existing `realOnly` and `realAgencyCount` helpers already exist in `lib/data/hire.ts`; inspect their callers before duplicating or replacing them.
2. **Pricing methodology.** Label agency starting prices versus package prices, billing periods, sample sizes, and currency/advertising-spend assumptions consistently. Check `packagePriceRange` and AI budget tools as well as hire pages.
3. **SEO and localization.** Read `docs/18-seo.md`, existing unit tests, sitemap/robots code, canonical and language helpers, and run `npm run seo:check` against the correct environment. Preserve the current page when switching languages. Reproduce any `.jo`/`.org` mismatch before changing contact addresses; address ownership must be verified.
4. **Buyer consent.** Trace request visibility and contact disclosure end to end. Test recipient authorization and ensure personal contacts are not sent to AI providers. Do not infer actual behavior from marketing copy alone.
5. **Trust labels and reviews.** Make business-identity checks, contact confirmation, and completed-project evidence distinguishable. Do not silently convert imported or demo reviews into verified project reviews.
6. **Payments and legal wording.** Reconcile claims with the actual enabled funds flow and signed provider/legal arrangements. Keep payments and monetization gated; legal approval and provider approval are owner/external dependencies, not code-only tasks.
7. **Conversion and matching.** Validate the current flow with real buyer/agency interviews and funnel measurements; assess the existing AI evaluation cases before adding more. Never invent supplier capacity, prices, or matches.

## Continuation procedure

Read this checkpoint, the latest `main`, open pull requests, and their checks before editing. Inspect actual changes from other contributors and do not overwrite their work. Deliver small, reviewable batches with explicit acceptance tests. Report separately: implemented, tested, merged, deployed, and verified live. Keep remaining work documented rather than claiming unattended or continuous execution.
