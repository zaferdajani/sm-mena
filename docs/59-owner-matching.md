# 59 · Owner ↔ provider matching

Registered business owners (docs/58) were promised the fitting providers first when discovery opens, and that nobody contacts them before they choose. This is that machinery.

## The rule (`lib/core/rules/matching/owners.ts`, pure)
For one owner's need and the providers that could serve them:
- **Required**: same country, or the provider lists the owner's country among the countries it serves. Demo and inactive providers never match. A provider that covers none of the needed service groups is not a match.
- **Score**: country 30; same city +25; serves-country +10; all needed service groups covered +30 (part of them: up to +15, pro rata); the owner's business type among the provider's industries +10; published work +10; a bio +5. Service keys map to the catalog's groups. Top five, ties by id, so a rerun gives the same list.
- Reasons are keys (`same_city`, `serves_country`, `services_all`, `services_some`, `industry`, `has_work`) the owner's page translates.

## The store (`lib/data/owner-matching.ts`, table `owner_matches`, migration 0035)
One row per owner ↔ provider pair with a status: `suggested` → `sent` → `introduced` or `declined`.
1. **Compute** (`computeOwnerMatches`): recomputes suggestions for every owner. Rows already sent or answered are kept; stale unsent suggestions are removed. `dryRun` stores nothing. Idempotent.
2. **Send** (`sendOwnerMatchEmails`): one plain email per owner with unsent suggestions (their language), listing the providers and linking to `/owner/matches`; rows become `sent`. **Gate**: nothing is sent while discovery is closed (`isRegistrationPhase()`), unless `OWNER_MATCH_EMAILS=on`. Staff see "closed" in the result.
3. **Respond** (`respondToOwnerMatch`): the owner accepts or declines a sent match. Acceptance is the consent: the provider gets an in-app notification (`owner_intro`, with the city and the needed groups) and an email with the need and the owner's contact (email, WhatsApp if given); the row becomes `introduced`. Suggestions cannot be answered before they are sent; another account cannot answer them.

## Where it shows
- Owner: `/owner/matches` lists only sent matches, waiting ones first, with "Introduce me" / "Not this one"; during the registration phase it explains that providers are still building their pages. Linked from the done page.
- Provider: a notification in the studio; the email carries the details.
- Staff: **Admin → Business owners** (`owners.manage`, owners and admins): every registration with masked address, place, needs, timing and current matches; **Recompute** and **Send emails** (disabled while closed, with the reason). Admin → Statistics keeps the counts.
- Daily: `/api/cron/owner-matches` (04:23 UTC, `CRON_SECRET`) computes and, once open, sends.

## Privacy
Owners see nothing until the emails go out; providers see nothing until an owner accepts them; only then do the owner's email and WhatsApp reach that one provider. Addresses in the admin table are partly hidden. Deleting the owner's account deletes the rows.

## Tests
- `tests/unit/owner-matching.test.ts`: the rule (country, serves, demo, inactive, coverage, order, limit) and the store (dry run, compute, hidden until sent, gate, recompute keeps sent rows, acceptance notifies, foreign account refused).
- `tests/registration/owner-matches.spec.ts`: the closed-phase page and the anonymous redirect.
- `tests/e2e/owner-matching.spec.ts`: provider → owner need → staff compute and send → owner accepts → provider notified.
