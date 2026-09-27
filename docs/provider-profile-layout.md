# Provider profile layout

Scope: public agency/freelancer profiles at `/[locale]/a/[handle]` and their account collections. This is NOT a redesign of the referral-agent dashboard.

## Design

- Identity first: readable business name, logo, location and bio. Counts are secondary.
- Verification, freelancer/demo labels and dated founder recognition remain distinct. No new claims or ranking changes.
- A grouped contact panel carries existing pricing, reviews, WhatsApp, inquiry, follow and other contact links. Visible labels and >=44px contact targets replace tiny unexplained icons.
- Two work columns on small phones; three on larger screens. Account captions sit outside the image, so touch users can read them without hovering.
- Service tags wrap. Mixed Arabic/Latin names and handles use bidi isolation; long names and empty profiles must remain usable.
- Profile tabs, about sections and package cards have consistent spacing, rounded boundaries and theme-aware colors.
- The new route layout scopes thumbnail and page-section styles. The global feed, matching, Founder eligibility, transaction code, translations and referral features are not changed.
- Existing contact tracking, follow actions, inquiry forms, pricing, legal terms, review provenance, query-param navigation and structured data are retained.

## Validation

`tests/e2e/provider-profile-layout.spec.ts` checks Arabic/English, 390px/1440px, light/dark, main tabs, contact targets, no horizontal overflow, empty profiles and 320px mixed long-name stress. It attaches screenshots to the Playwright report. CI now retains the report on successful runs too.

Run the complete CI (lint, typecheck, unit tests, build and all Playwright tests), not just the new tests. Review the attached screenshots before deployment. This document describes intended coverage; it is not a claim that a particular run has passed.

## Handoff

Review the dedicated `style/provider-profile-layout` branch/PR. Preserve current main, merge only after green checks and visual review, then use the normal deploy workflow. Verify the actual live public profiles in both languages; never equate a branch or preview with production.
