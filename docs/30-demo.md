# The demo (/demo)

Type `sawwiq.org/demo` to open Sawwiq with the fictional demo agencies, their work, packages, reviews and requests: for UI testing and for showing the concept. Nothing links to it, it is `noindex`, and it is not in the sitemap.

## Why it is not a separate branch or site

The demo is a mode of the same app, the same deploy and the same database. Every change merged into the platform is in the demo the moment it deploys; there is nothing to sync. A separate git branch or deployment would drift and need its own database, storage and settings.

## How it works (`lib/demo.ts`)

- `/demo` shows two choices. Both set the `sw_demo` cookie for this browser (7 days):
  - **Browse as a client**: the feed, search, hire pages and the AI matchmaker. No account is needed.
  - **Try the studio as …** (Nakhla Studio in Arabic, Petra Growth in English): signs straight in as that demo agency, with no password. Only seeded demo agencies whose owner is a plain agency account qualify; never staff.
- While the cookie is set, a thin bar on every page says "You're in the demo", with **Leave demo**. Leaving clears the cookie and ends a demo agency's session.
- In the demo, `agencyScope()` limits every listing to demo agencies: feed, explore, the stories strip, the agency directory, hire pages, prices, matching and promotions. Real agencies' pages and posts return 404.
- Requests sent in the demo are stored with source `demo`. Real agencies never see those, and only demo agencies are notified (`lib/data/requests.ts`).
- Demo page views are not counted in traffic stats. Demo agencies are never emailed, never pay (billing is refused), and cannot turn on two-factor sign-in, which would lock everyone else out.

## The main site

The main site lists demo agencies next to real ones, as before, until an admin clicks **Admin → Agencies → Hide demo agencies from the main site**. This is audited and reversible. After that, the main site shows only real agencies and demo agency pages return 404 there, while `/demo` keeps working. This is the switch to use at launch.

**Remove all demo data** still deletes the demo agencies permanently, and `/demo` is then empty. Its confirmation says so.

## Keeping it clean

The demo is shared: every visitor sees the others' edits. The Maintenance workflow runs **rebuild-demo-media** every Sunday at 02:17 UTC. It re-creates the demo agencies, their photos and the demo requests, and never touches real agencies or anything with a contract or NDA. Scheduled workflows run only from the default branch, so the reset starts once this is merged. It can also be run any time: Actions → Maintenance → rebuild-demo-media.

## Personal data

Demo visitors can still type details into forms, for example a phone number in a project request. These are stored like any request, under the same consent, and the weekly reset deletes demo requests. The `/demo` page asks visitors not to enter real details. No new personal-data field is added (docs/08-legal-compliance.md is unchanged).

## Tests

- `tests/unit/demo.test.ts`: scoping in both modes, page visibility, and the admin switch.
- `tests/e2e/demo.spec.ts`: `/demo` is noindex; client mode hides a real agency (404); the demo agency's studio works without a password; leaving signs out.
