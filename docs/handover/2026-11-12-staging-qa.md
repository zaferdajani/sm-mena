# Staging QA report of 11 Nov 2026: what was done

The owner shared an external QA report of staging.sawwiq.org (27 findings: 0 Critical, 5 High, 11 Medium, 11 Low). This note records the outcome of each finding by its ID. The report itself stays with the owner: it holds test account names and contract links that do not belong in a public repository.

## Fixed in shared code (production and staging)

| ID | Fix |
| --- | --- |
| H-03 | `/api/health` answers `{ ok }` to everyone. The configuration detail needs `Authorization: Bearer $CRON_SECRET` (`scripts/vercel-admin.mjs` sends it). |
| H-04 | The app sidebar starts at the `lg` breakpoint (1024 px). Tablets get the phone header and bottom tabs. The landing header keeps its section links in a menu button below 960 px (`components/landing/header-menu.tsx`). |
| M-01 | Sign-up: the WhatsApp code starts at the business country and follows it until the person picks a code (`PhoneField` `follow`). |
| M-02 | `AgencyAvatar` shows the initials when the photo file is missing. The missing staging file itself is data (see below). |
| M-03, L-05, L-06 | Every response sends HSTS with `includeSubDomains`, `nosniff`, `X-Frame-Options: SAMEORIGIN`, CSP `frame-ancestors 'self'`, `Referrer-Policy` and `Permissions-Policy`. No `x-powered-by`. next-intl's unused `NEXT_LOCALE` cookie is off. |
| L-04 | `/favicon.ico` serves the app icon. |
| M-04 | Unknown paths get a "Page not found" title. After scripts run, the 404 already had the language and an h1. |
| M-05, M-06 | The Explore Filters button, the landing language switch and the short Join link have accessible names that match what is shown. |
| M-08 | The footer build stamp uses the full muted text colour. |
| M-09 | Explore says "No exact matches; the closest agencies are below" instead of "No results" above the closest matches. |
| M-10 | A contract total must be from 1 to 1,000,000 JOD (`MIN_CONTRACT_FILS`, `MAX_CONTRACT_FILS` in `validateContract`, used by the form and the server). A negative total is never split into milestones. |
| L-07, L-08 | Owner page titles no longer repeat the brand. The examples page title has no stray full stop. |

## Fixed on staging only (`cursor/staging-qa-fafd`)

| ID | Fix |
| --- | --- |
| H-02 | A contract client has no staging account, so nothing opened their test wallet and every card, 4242 included, failed as insufficient. The client's wallet now opens with 2,000 (or the milestone amount if larger) the first time the funding page or card payment runs (`openContractClientWallet`). |
| M-11 | The test wallet shows readable labels. A declined attempt is struck through and says nothing was charged. |
| L-09 | The TEST MODE banner hides "Sign in" for a signed-in user. |

## Fixed in the second round (owner asked to fix all)

| ID | Fix |
| --- | --- |
| H-01 | Before a client signs a contract or NDA from a private link, they prove they hold the email it was sent to: they type that address, get a one-time code (purpose `sign`) and enter it. The contract and NDA store `client_signer_email` and `client_verified_at` (migration 0044). Signed-in owners who already proved the email skip the code. `lib/auth/signer-check.ts`, `components/contracts/signer-verify.tsx`. |
| L-01 | The sign-up form shows every problem at once and moves focus to the first. |
| L-03 | The landing header links to Explore, inline and in the phone menu. |
| CSP | Every response sends a full Content-Security-Policy (`default-src 'self'`, no plugins, `base-uri 'self'`). Scripts keep `'unsafe-inline'` until nonces are added; `tests/e2e/security-headers.spec.ts` fails on any CSP violation on the main pages. |
| M-07 | The landing scroll video and its posters wait until the page has loaded and gone idle (or the visitor scrolls). Mobile page weight on first load fell from 5.8 MB to 0.75 MB. The hero photo is preloaded; the rest of the LCP time is script work on a throttled phone. |
| M-08 | axe found no contrast problems on the main public and Studio pages, light and dark, at 390 px. |
| L-10 (staging) | After a declined test payment the form keeps the test card number and CVC for the tab (session storage, test cards only). |
| H-05 (staging) | Each staging build hides agencies whose handle starts with `qa.` from Explore (audited as `staging.qa_fixture_hidden`). |

## Left with the owner

- **L-11 and QA run data**: leftover managed accounts and portfolio clients on the staging agency stay; the staging seed keeps what users add. Remove them in staging Studio. Contracts and payments from the QA run stay: the escrow ledger is append-only.
- **Testing gaps**: a second agency account for recipient-side collaboration, and a Business plan test account for roles.
- **L-02**: empty alt text is on decorative images next to text that says the same; no change.
- Rotate the staging agency password used in the QA run.
