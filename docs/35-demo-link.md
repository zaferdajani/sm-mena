# The demo link (/demo)

Typing `sawwiq.org/demo` opens a page for showing Sawwiq with its sample agencies: for UI testing and for explaining the concept. Nothing links to it, and it is `noindex`. It builds on the labelled demo view (docs/31-trust-and-demo.md), so it is the same app, database and code as the platform and gets every change the moment it deploys.

## What the page offers

- **Browse as a client** turns the demo view on (`sw_demo` cookie, one day) and opens the home page. The feed, explore, the hire cards, the strip and the matchmaker then include the sample agencies, and every page shows the demo banner with **Leave the demo**.
- **Try the studio as Nakhla Studio** (Arabic) or **as Petra Growth** (English) also signs in as that sample agency, with no password (`enterDemoAction`, `DEMO_STUDIO_HANDLES` in `lib/demo-mode.ts`). Only seeded demo agencies whose owner is a plain agency account qualify, never staff.
- **Leave the demo** (the banner) ends the demo view and signs out of a sample agency.
- If an admin switched the demo view off (Admin → Features → demo view), the page says the demo is off and offers nothing.

Everything else follows docs/31: real visitors see real agencies only, demo requests reach sample agencies only, and prices and counts stay real-only.

## Shared accounts

Every visitor who opens a sample agency's studio shares it. So:
- sample agencies cannot turn on two-factor sign-in (it would lock the others out);
- they are never emailed (fictional addresses);
- the Maintenance workflow runs **rebuild-demo-media** every Sunday at 02:17 UTC, re-creating the sample agencies, their photos and demo requests. Real agencies and anything with a contract or NDA are never touched. Scheduled workflows run from the default branch only.

The `/demo` page asks visitors not to enter real phone numbers or personal details; demo requests are deleted by the weekly reset.

## Tests

`tests/e2e/demo.spec.ts`: `/demo` is noindex; browsing as a client shows the banner and sample agencies; a sample agency's studio opens without a password; leaving signs out.
