# 58 · Business owners register early

The registration phase was scoped to providers, and the landing followed: every button led to `/join`. A business owner had no door. This adds one, without promising anything the phase does not deliver.

## The door
- Landing: under the provider CTA and the promise line, one quiet line — «عندك مشروع وبدك تسويق؟ سجّل مشروعك» / "Have a business and need marketing? Register your business" → `/owner`.
- `/start` (the generic "Join" chooser) sends the business-owner card to `/owner` during the registration phase, with "Register your business for early access"; after the phase it goes back to `/signin`.
- `/owner`: what they get (matched first by city and services, private, free), then the emailed-code sign-in (docs/41, same `client` role, no password). A signed-in owner is sent on to the needs screen. A provider link points to `/join`.

## The one screen (`/owner/needs`)
Country and city (the join form's picker), type of business (optional, the feed's business types), the service groups they need (at least one, the catalog's nine groups), when they want to start (now / within a month / three months / later), WhatsApp (optional, only for an introduction they accept) and a note (optional, 400 characters). Saved on the account in `owner_needs` (one row per account, rewritten on edit, cascade-deleted with the user). Contract: `lib/validation/owner-needs.ts`; store and counts: `lib/data/owner-needs.ts`; migration 0034.

`/owner/done` states what happens next: pages open after this phase; owners get the fitting providers first; nobody contacts them before they choose. "Edit my answers" reopens the screen with the saved values.

An owner who signs in through `/signin` during the registration phase (any `next`) is taken to the needs screen once, until a row exists.

## Where the counts show
- Studio (registration view): "N business owners have registered so far · M in {country}", with the note that they are matched by city and services when pages open. Real rows only; there is no demo data for this table.
- Admin → Statistics: registered owners, by country, by needed service group, by timing.

## Privacy and limits
- The row is private to the account and staff; no provider sees it. The emailed-code limits (5 codes an hour per email, 10 per IP) and consent checkbox are unchanged.
- No public counts on the landing (no invented scarcity, docs/55).
- Deleting the user deletes the row.

## Tests
- `tests/unit/owner-needs.test.ts`: the contract (city must belong to the country, at least one known service group, unknown business type dropped, optionals normalised) and the store (one row per account, edit rewrites, counts).
- `tests/registration/owner.spec.ts`: ar and en journeys from the landing line to the done page and back to edit; `/signin` redirect; the needs and done screens redirect anonymous visitors to `/owner`; no horizontal overflow.
