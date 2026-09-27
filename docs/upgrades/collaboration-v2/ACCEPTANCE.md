# Acceptance specification — tests to implement, not test results

All cases below are planned. Each requires real test code/evidence during implementation. Use only fixtures or expressly authorized test accounts; never run destructive test actions against production. Keep security and financial assertions even when UI structure changes.

### AC01 — baseline and legacy coverage
Record reproducible agency/freelancer/client journeys and existing test/CI state; inventory the actual schema and guards. Preserve profiles, intro, country/locale, Behance import, followers, Founder rules and partner contracts/shares. Do not label a pre-existing red test green.

### AC02 — mode and authority preservation
Private work maps to supplier `agency_id` and buying `client_agency_id`; disclosed shares retain their original client-facing flow. Forged buyer/supplier IDs and unauthorized role swaps fail server-side.

### AC03 — opt-in two-sided discovery
An opted-in published agency need is visible to eligible freelancers; an unpublished/private role gap is not. Agencies can discover freelancers or specialist agencies. Expired/withdrawn needs disappear from search and cannot be accepted through an old URL.

### AC04 — matching correctness
Filter eligibility before ranking, provide evidence/reasons, stable pagination and tie-breaking. Unavailable candidates cannot appear as confirmed available; unknowns are labelled. Suspended/self/blocked and disallowed demo candidates are excluded. Founder/paid flags do not change collaboration relevance or existing client access rules.

### AC05 — availability freshness and timezone
Test stale/expired/unknown availability, a midnight boundary, user timezone changes and overlapping UTC intervals. Busy projections never reveal a counterparty. A tentative hold is not advertised as a confirmed engagement.

### AC06 — private roster isolation
Agency A saves a provider and writes a private note/rate. Agency B, the provider and an end client cannot read those private fields through pages, APIs, server actions, rendered payloads, search, caches or exports. The supplier can read their separately agreed contract terms.

### AC07 — invitations and no duplicates
Accept/decline/expire/revoke invitation; link an existing provider without duplicating identity. Repeated sends/acceptances are idempotent and rate-limited. Blocked recipients receive nothing; invitation alone does not create membership or public affiliation.

### AC08 — complete structured inquiry
From Discover and an authorized project, create/send an inquiry with deliverables, dates, scope, currency, mode, reviewer and audience preview. Supplier can reply/decline/counter. A response is not a signature. Empty/error/loading/offline-retry states remain usable.

### AC09 — private quote comparison
Buyer compares only their received quotes with scope/currency/exclusions; suppliers cannot read competitors' offers. Cross-currency totals remain separated. No unsupported claim of a best/cheapest market rate.

### AC10 — R1 golden path
In Arabic at 390px and English desktop: publish need → discover eligible supplier → inquire → receive response → accept partnership where required → hand off to existing partner contract. Rehire creates a fresh draft, not a booking or signed commitment.

### AC11 — backward-compatible migration
Fresh install and populated-database upgrade pass on disposable PGlite and Postgres. Legacy contracts retain terms/hashes/modes, data scale and rendering. No production reset/seed. Opt-in fields default private/unknown. Backfills resume without duplication.

### AC12 — work-order linkage
Supplier-to-buyer contract and optional parent-client association remain distinct. Supplier cannot retrieve parent client identity/price by manipulating IDs or following links. No accepted work without the necessary underlying agreement state.

### AC13 — accepted scope and concurrent edits
Accepted terms are immutable. Counteroffers/amendments require new versions and required acceptance. Two simultaneous accept/edit requests produce one consistent outcome; stale updates cannot overwrite signed scope.

### AC14 — message audiences
Agency-private notes, work-order threads and client messages enforce distinct audiences. Editing a private note cannot publish it. Fuzz IDs, direct action calls, cache reuse, notifications and SSR/RSC responses. Supplier X cannot read supplier Y's work-order thread.

### AC15 — permission preview equals recipient view
For each role, compare preview projection to the authenticated recipient response. Preview is not an impersonation bypass. Revoke a grant and verify future API/file access and notification recipients are updated.

### AC16 — private file/version review
Upload permitted media, add a version and anchored comment, request revisions, then submit a new version. Previous evidence survives. Oversized/disallowed/path-traversal inputs fail. Private asset requests/expired signed URLs fail for unrelated users.

### AC17 — correct reviewer and settlement target
Private work submits to the buying agency; disclosed work keeps end-client review. Buyer approval affects only its supplier contract milestone. It cannot release a parent client milestone. Existing review/dispute/revision limits and frozen contracts stay enforced.

### AC18 — capacity race
Two concurrent acceptances exceed the provider's declared capacity: at most the permitted capacity is confirmed. Double-submit produces no duplicate reservation. Cancelling/expiring tentative holds frees capacity. Report external calendars as unverified, not synchronized.

### AC19 — direct and mock truthfulness
Direct payments show attributed sent/received confirmations, not platform protection. Mock contracts retain no-real-money wording everywhere, including notifications and receipts. Manual marks cannot create protected settlement or paid-project provenance.

### AC20 — money regression
Existing duplicate webhook/approval guards, partial refunds, share allocation, fees, waiver uniqueness, currency precision and ledger immutability tests pass. No new payment provider, monetization flag or Founder economics change is introduced.

### AC21 — R2 golden paths
Run private subcontracting and disclosed co-delivery with buyer, supplier and end-client sessions. Agree → deliver → revise → approve → correctly display mode-specific payment state. Test cancellation, dispute, old contract access and provider suspension rules.

### AC22 — scope-to-team planner
Human-approved brief yields editable work packages and distinctions between in-house, confirmed partners, proposed candidates and unfilled roles. Source IDs/evidence are inspectable. Planner never changes client matching scores or marks suggested capacity confirmed.

### AC23 — AI isolation and fallback
No key, timeout, budget exhaustion, invalid IDs and prompt injection fall back safely. Secret/contact/private-note test markers never reach model requests. AI cannot invite, sign, pay or book. A returned candidate is rechecked against authorized tool results.

### AC24 — finance-only planning
Buyer finance can view supplier costs and optional margin worksheet; nonfinance staff, suppliers and end clients cannot. Missing rates remain unknown. Multiple currencies are not silently summed. Estimates cannot be mistaken for signed quotes.

### AC25 — recurring template and rehire
Reusing a completed engagement copies a draft scope only, with renewed confirmation of dates/rates/permissions. No automatic renewal, charge or booking. Expired access tokens and prior private asset grants are not copied.

### AC26 — collaborator evidence and moderation
Only engagement parties can submit feedback; retries do not duplicate it. Client, collaborator, invited and paid-completed labels remain distinct. Confidential evidence omits client/asset identities without permission. Include dispute/moderation and opt-out cases; no retroactive relabelling of legacy reviews.

### AC27 — notifications and next actions
Correct users see due reviews/deliverables and deduplicated notices. Opt-outs/quiet hours and expired invitations are honored. Unauthorized parties receive no names, amounts, tokens or file previews. Missing email provider does not break in-app delivery.

### AC28 — honest analytics
Demo/internal/retry events do not inflate the funnel. Cohorts have explicit denominators and observation windows. Payout initiated does not equal received; direct confirmations are separately labelled. Logs/exports have no raw contact or confidential text.

### AC29 — responsive and accessible UI
Review screenshots of all changed public and authenticated screens at 320/390/768/1440/1920, Arabic/English, supported light/dark, reduced motion and 200% zoom. No page overflow, clipped Arabic marks, joined sections, inaccessible focus or huge media. Core interactive targets aim for at least 44px; keyboard journeys work.

### AC30 — performance and empty states
Under a fixed documented environment compare to R0 on realistic large/small fixture sets. No unbounded query or N+1 explosion; document measured latency and query count. Empty profiles/rosters, long mixed-language names, missing images and network retry show purposeful states rather than fabricated supply.

### AC31 — feature gates, SEO and legacy links
Test on/soon/off at server endpoints and UI. Unfinished features are inaccessible, not broken buttons. Existing accepted work remains reachable under the kill switch policy. Private routes are noindex/not in sitemap and still require authorization. Existing landing, profile, contract and partner deep links work.

### AC32 — complete application validation
Run actual lint, typecheck, all unit/integration tests, production build and full Playwright for the integrated commit. No deleted security assertions, unreviewed snapshot acceptance or newly skipped regressions to obtain green. Distinguish planning-validator success from application CI.

### AC33 — production source identity
After an authorized main integration/deployment, verify canonical `/api/version` has production environment, correct revision and matching non-null deployed SHA. Rendered stamps agree. A later SHA must contain the release commits with current source checked; main tip or a Vercel badge alone is insufficient.

### AC34 — live visual and media acceptance
Verify canonical Arabic/English landing, Explore and permitted public profile plus controlled authenticated workflows on mobile/desktop. Record actual uncropped logo playback on fresh visits, not mocked media. Restrict production tests to authorized safe data. If access/rendering fails, report blocked, not verified live.

### AC35 — rollback and ongoing work
Record prior deployment and additive migration compatibility; rehearse stopping new feature creation while keeping existing contracts/work/evidence accessible. Revert application code forward without force-pushing or dropping new tables; do not undo signed commitments or ledger entries.

### AC36 — measured pilot and honest completion
Deliver the instrumented metrics and a consent-based pilot protocol with R0 comparison, sample size/denominator rules and limitations. Actual participant recruitment and longitudinal results are post-launch business validation, not facts an agent may invent to pass software deployment. Partial release is not V2 completion and vendor documentation is not proof of superiority. Publish only observed outcomes; remaining HOLD items stay explicitly excluded.
