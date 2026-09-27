# R0 — baseline record (COL00)

Recorded 2026-09-27 (UTC) on `plan/collaboration-v2-upgrade` after merging `origin/main` at `ecfcdda` (merge commit `31b29fa`). No production data was read or changed. Everything below was measured on the local checkout with PGlite fixtures.

## Source of truth on main

| Concern | What exists today | Reuse decision |
|---|---|---|
| Partner network | `partner_requests` (from/to agency, roles, message, pending→accepted/declined/cancelled; one open pair). `lib/data/partners.ts`: `suggestPartners` (roles the asker lacks vs. `teamRoles ∪ rolesOf(services)`, country filter, score, in-memory cap 400 rows), `sendPartnerRequest`, `answerPartnerRequest`, `listPartnerRequests` (contacts only once accepted), `pendingPartnerCount`. UI `studio/partners/page.tsx` (agency-only suggestions), `components/studio/partner-widgets.tsx`, `team-fields.tsx`. | Keep as the partnership/consent record. "Accepted partner" stays the eligibility check (`arePartners`) for contracts and shares. Discovery is rebuilt beside it, not on top of the 400-row scan. |
| Partner contracts | `contracts.agency_id` = supplier (does the work), `contracts.client_agency_id` = buying agency. `contract_requests` (buyer asks supplier to write a contract; title/brief/budget; ≤3 open per pair). Builder prefills from `?partner=&request=`. Signed terms v4, hash, fill-once signatures, review days, revision rounds, `payments_live`. | Untouched. R1 hands an accepted quote into `requestContractFromPartner`; R2 links work orders to a contract id and never writes contract terms. |
| Disclosed co-delivery | `milestone_shares` (one live share per milestone, frozen by trigger on accept, `splitRelease`), partner work page, client sees "Delivered with <partner>". | Untouched; remains the disclosed mode. |
| Money | `lib/data/escrow.ts settleMilestone`, append-only `escrow_ledger`, `money-out.ts`, `lib/payments/readiness.ts` (`protectedPaymentsLive`), Founder waiver (`contracts_founder_waiver_idx`). | Not touched by V2. No new switch, fee or rail. |
| Identity | `requireAgency()` → one agency per owner user; staff via `requireStaff(permission)`; no per-agency staff roles exist (an agency is one login). | "Buyer finance/authorized staff" collapses to the agency owner in R1–R3; documented in ARCHITECTURE deviations. |
| Feature switches | `lib/features.ts` (`on/soon/off` + pilots, 15 s cache, `FEATURE_DEFAULTS`), `featureGate`/`canUse`; `partners` key gates the partners page. | New key `collaboration` (R1). R2/R3 get their own keys. Hiding navigation is never the only gate: every page and action checks. |
| Notifications | `notifications` table, `addNotifications`, kinds in `lib/chat.ts NOTIFICATION_KINDS`, labels in `Notifications.kinds`, 90-day retention, email courtesy via `lib/notify.ts` (Resend optional). | Reused; new kinds appended. |
| Media | `lib/images.ts processImage`, `lib/storage` (local disk or Supabase), signed access for documents. | R2 asset versions reuse it. |
| Release identity | `lib/release.ts UI_REVISION`, `/api/version`, `ReleaseStamp` in footer/landing. | `UI_REVISION` changes only with a shipped slice (`collaboration-v2-r1`). |
| Rate limits | `lib/rate-limit.ts` in-memory fixed window (`RATE_LIMIT_MULTIPLIER` for e2e). | Reused for invites and inquiries. |

## Regression map (must keep passing)

Unit: 60 files / 343 tests (`npx vitest run`, 203 s). E2e: 258 passed, 9 skipped (`playwright test`, 9.7 min, mobile + desktop projects). Both measured on `ecfcdda` before this branch merged it. Suites touching collaboration surfaces: `tests/e2e/services-partners.spec.ts`, `collaboration.spec.ts`, `contracts.spec.ts`, `milestones-full.spec.ts`, `team.spec.ts`, `founder.spec.ts`, `layout-rhythm.spec.ts`, `provider-profile-layout.spec.ts`, `intro.spec.ts`, `release-proof.spec.ts`, `behance-import.spec.ts`; unit `collaboration.test.ts`, `milestone-shares.test.ts`, `contracts.test.ts`, `founder-fees.test.ts`, `messages.test.ts` (ar/en key parity).

## Journeys as they are today (step counts, one person, phone)

Counted as distinct taps/submits after sign-in, from the code paths above.

| Journey | Steps today | Notes |
|---|---|---|
| Agency discovers a freelancer for a missing role | 4 | Profile → tick "looking for" role → Save → Partners page lists suggestions. Suggestions ignore availability, language, work mode and portfolio relevance beyond post count. |
| Agency contacts a candidate | 3 | "Request partnership" → note → Send. Then waits; contact details appear on acceptance. |
| Agency scopes work with an accepted partner | 4 | Partners page → "Ask for a contract" → title, brief, budget → Send (`contract_requests`). No deliverables, dates, currency, privacy mode, recipients preview or comparison. |
| Agreement | 10 builder steps by the supplier + buyer signature | Unchanged by V2 (signed source of truth). |
| Repeat hire of the same partner | 4 | Same as scoping; nothing is reused from the previous engagement. |
| Freelancer finds work from agencies | not possible | Freelancers only receive requests; `studio/partners` shows no discovery for `kind = freelancer`. |
| Provider states availability | not possible | No field or table. |

Total discover → contact → scope today: **11 steps** for the agency plus the partner's acceptance, with no availability signal. R1 targets fewer steps on the scripted repeat-hire flow (goal in PRODUCT.md §8, to be measured, not assumed).

## Pre-existing findings (not new features; recorded, not silently fixed)

1. `suggestPartners` loads up to 400 agencies and ranks in memory; no pagination or stable tie-break. R1 replaces it for discovery and leaves the legacy page working.
2. `partners` page shows nothing actionable for a freelancer beyond incoming requests.
3. `contract_requests.status` is free text, not an enum. Left as is.
4. Partner contact details (WhatsApp, email) become visible on acceptance; that is consent-based and kept.

## Environment used for comparisons

Node 22, PGlite in-memory for unit tests, `.data/e2e/pglite` seeded by `npm run db:reset` for Playwright, Chromium 1194, 2 workers in CI mode. Timings above come from this container and are only comparable with later runs on the same setup.
