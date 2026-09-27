# Architecture and security contract

These are proposed changes. Confirm current schema and reuse existing models before generating migrations. The package deliberately does not supply untested SQL for an evolving production database.

## Existing integration points

| Concern | Existing source to inspect/reuse |
|---|---|
| Studio partner UI and actions | `app/[locale]/(main)/studio/partners/page.tsx`, `components/studio/partner-widgets.tsx`, `components/studio/team-fields.tsx` |
| Partners and roles | `lib/data/partners.ts`, `lib/services/catalog.ts`, `lib/services/tags.ts` |
| Signed partner contracts | `docs/14-contracts-and-milestones.md`, `lib/data/contracts.ts`, existing contract actions/builder; locate actual exports before calling them |
| Disclosed milestone shares | `lib/data/milestone-shares.ts`, `lib/contracts/shares.ts`, `components/contracts/milestone-partners.tsx`, `app/[locale]/(main)/share-actions.ts` |
| Contract execution and money | `lib/data/escrow.ts`, `lib/data/money-out.ts`, `lib/payments/readiness.ts`; these remain authoritative |
| Identity and country | `lib/auth/session.ts`, `lib/auth/guards.ts`, `lib/auth/permissions.ts`, `lib/country-choice.ts`, `lib/countries.ts` |
| Matching and AI | `lib/matching/`, `lib/ai/`, `docs/12-ai-matchmaker.md` |
| Storage/notifications | Existing storage/media pipeline; `lib/data/notifications.ts`, `lib/notify.ts`, contract notifications and jobs |
| UI and feature switches | `app/globals.css`, existing shared UI, `lib/feature-gate.ts`, Studio layout, `messages/ar.json`, `messages/en.json` |
| Release identity | `lib/release.ts`, `app/api/version/route.ts`, `components/release-stamp.tsx` |

## Important ownership distinction

In an existing partner contract, `contracts.agency_id` identifies the provider DOING the work. `client_agency_id` identifies the purchasing agency. Do not use the word agency as an authorization shortcut meaning the lead/buying agency. Resolve identity from session membership and explicit resource role on every request.

For private subcontracting, link the supplier-to-buyer contract to a work order. A parent end-client contract is an optional buyer-private association; the supplier must not gain access to it. For disclosed co-delivery, retain the existing parent milestone and share rules. Never change legacy mode semantics based on a new UI preference.

## Proposed records and boundaries

Reuse equivalents already present; document deviations from these names in the backlog.

- Collaboration preference: provider ID, opted-in modes, languages/work mode, publishing scope and consent version. Unknown/null is distinct from false. Do not derive public hiring needs from private role gaps without consent.
- Availability window: provider ID, UTC interval plus original timezone, declared work/capacity unit, confirmedAt/expiresAt and visibility. Store busy information without counterparty identity in public projections.
- Private roster entry: owner agency ID, provider ID, private group/tags, restricted notes and optional negotiated-rate reference. Uniqueness per owner/provider; saving is not acceptance. Do not clone provider identity/contact records.
- Collaboration need/inquiry: buyer provider ID, optional private project link, role/scope/locale/location/date requirements, budget currency, allowed modes, audience, expiry and version. Recipients are explicit; one offer/reply chain per inquiry/provider.
- Work order: buyer ID, supplier ID, mode, immutable accepted scope/version, linked authoritative contract ID and private parent association. This is a delivery projection/workspace, not another ledger.
- Asset version and comment: work order ID, asset ID/version, storage key, metadata and explicit audience. No public storage URL for confidential assets. Each comment has one immutable scope.
- Capacity reservation: provider ID, work order ID, interval/units, tentative/confirmed/released state, expiry and version. Confirmation requires supplier acceptance and an atomic capacity check.
- Collaborator feedback: engagement ID, verified author role, evidence/provenance class, consented publication scope, moderation and dispute state. Not merged into legacy client/Google/paid-project scores.
- Idempotent domain events/outbox: aggregate ID, transition version, event kind and deduplication key. No raw contact data/brief text in telemetry.

New tables must have indexed owner/resource foreign keys, bounded queries, timestamps, guarded transitions and documented retention. Add indexes for visible active needs, provider availability intervals, owner rosters and work-order membership. Avoid expanding the current unordered candidate cap into an unbounded scan: filter and paginate at the query layer with deterministic ordering and stable tie-breaks.

## State machines

Inquiry: draft → sent → replied → converted/declined/expired/withdrawn. A quote reply may be countered with a new version. Accepting a partnership or inquiry is not signing a contract. Self-hiring is rejected. Terminal states cannot be revived by a retried action.

Work order: draft → offered → accepted → in_progress → submitted → changes_requested/approved → closed. Decline/withdraw applies before acceptance; cancellation after acceptance follows the authoritative agreement. An amendment changes scope only after required parties accept a new version. Disputes and paused contracts block incompatible delivery/payment transitions.

These names are a proposed UI/domain projection. Do not invent a second source of financial status: map to authoritative existing contract and milestone transitions. Supplier contract review and end-client review are separate. A scheduled reminder or internal comment never approves work or releases funds.

Capacity: tentative → confirmed/released/expired. At confirmation, check declared capacity and conflicts inside the same transaction/locking strategy used to persist the booking. Retry-safe identical acceptance returns the existing outcome; a conflicting request fails explicitly. Verify the chosen approach on both PGlite and real Postgres. Expired tentative holds do not stay booked forever.

## Visibility matrix — deny by default

| Resource | Buying agency authorized staff | Assigned supplier | End client | Unrelated provider |
|---|---|---|---|---|
| Agency-private notes/roster | According to staff permission | No | No | No |
| Negotiated supplier terms | Buyer finance/authorized signer | Own agreement only | No | No |
| Parent resale price/margin | Buyer finance only | No | Own price only, never margin | No |
| Work-order scope/assets/thread | Explicitly authorized buyer members | Assigned work order only | Only deliberately published projection | No |
| Client thread/full brief | As allowed by parent contract | No by default; explicit scoped grant if permitted | Own contract only | No |
| Other partners' names, rates and files | Only as needed by role | No unless explicitly shared and permitted | Only disclosed team details | No |
| Support access | Not automatic | Not automatic | Not automatic | Authorized staff must use audited support access |

Tenant filters belong in data access, not only page guards. Enforce policy in server actions, APIs, previews, RSC/SSR payloads, exports, notifications, storage signing and background jobs. Never fetch a full record and send it to the browser before masking. A `noindex` tag or hidden tab does not enforce privacy. Do not cache user-specific responses across tenants or sessions.

No 'preview as' feature may impersonate arbitrary users. Build the preview using the exact authorized recipient projection and current grant; require the sender's right to share. Scope changes require explicit action/audit, cannot happen by editing a message's audience in place, and must revoke future access where promised.

## Input, AI and abuse controls

Validate new inputs with shared strict Zod schemas: IDs, enum modes, interval order, timezone, text limits, quantities, money/currency and allowed URLs. Prevent stored XSS. Reuse existing file validation and private access controls. Remote import or URL fetch features are out of scope; do not expand Behance's guarded fetcher into a general proxy.

Rate-limit and deduplicate inquiries/invites by sender, recipient and resource; honor rejection/blocking, and never send an invitation from search automatically. AI can only receive user-approved minimal structured task data and authorized public evidence. Treat content as untrusted instructions; ignore embedded attempts to reveal data or call write tools. AI output is validated against search IDs and current permission/availability state before display. Human approval is required before any consequential write.

## Money and signed-terms invariants

All existing fees, Founder conditions, waived-project limits, country/currency rules, signed terms versions, append-only ledger, idempotency keys and payout guards remain unchanged. Never create a fake deposit or mark protected payout received from a UI click. Never present provider payout initiation as receipt. Keep direct-payment assertions attributed to the confirming party.

Do not introduce a new currency precision convention: inspect existing `amountFils`/format helpers and conversion boundaries, reuse the authoritative helper and regression-test round trips. Do not mix currencies in a budget total, change scale globally or use floating arithmetic for ledger amounts. Legacy one-live-share constraints survive; a privacy/approval upgrade cannot bypass them.

## Migration and rollout

Additive migrations only for these releases; no reset/seed in production. Rehearse fresh and populated-database upgrades, including legacy signed contracts and shares, on disposable databases. Use explicitly logged/backfillable opt-in defaults, never assume everyone is available or publicly recruiting. Make old app versions tolerate added fields so rollback is possible. Schedule any backfill separately, bounded, resumable and idempotent.

Use server-enforced feature gates per slice with explicit unavailable states. Hiding navigation alone is insufficient. Preserve current live settings; activating a new nonfinancial slice requires its release evidence and coordinator approval. Disabling creation must not strand ongoing obligations or deny access to accepted work, evidence and existing contracts. Never modify money/monetization switches to enable collaboration.

## Testing and observability

Unit tests for pure rules, database integration tests for authorization/concurrency, and browser tests for complete journeys. Use real media separately from timing doubles. Run existing regression suites unchanged except for justified semantic selector updates. Test retries/reordered events, duplicate acceptance, invitation expiry, booked dates, stale versions and legacy contract rendering.

Audit privileged scope changes and support access. Analytics store pseudonymous IDs, event type and counters, not message/file content or contact data. User-facing logs and internal error reporting must redact secret URLs/tokens. Measure slow query counts/latency and media load without exposing private work in public artifacts.
