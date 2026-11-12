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

## Waiting on the owner

- **H-01: who may sign a client contract.** The client signs from a private link with a typed name and a drawn signature, with no account (docs/14). That is the documented design. Adding an identity step (for example a one-time code to the client's WhatsApp or email before signing) changes the contract and authentication rules, so it needs the owner's decision before go-live.
- **H-05 and L-11: test data on the staging database.** Two QA sign-up accounts are public on staging Explore, and the staging agency has leftover managed accounts. These are rows on the staging database, not code. Hide or remove them in staging Admin, or refresh staging data.
- **Test data from the QA run** (the report's "Test data to clean up" list) is on staging only.
- **Testing gaps** named by the report: a second agency account for recipient-side collaboration, and a Business plan test account for roles.

## Planned, not built

- **M-07**: mobile homepage LCP (5.6 s) comes from the hero video and posters. It needs a measured performance pass, not a guess.
- **M-08 (rest)**: the other contrast hits sit over video or background images and need a visual check.
- **A full script CSP** needs nonces through the app and a trial on staging first.
- **L-01**: the sign-up form names the first problem; showing every problem at once is a design change.
- **L-02**: the logo and photos with empty alt sit next to text that says the same; they are decorative by design.
- **L-03**: the landing page and the app have different navigation by design.
- **L-10**: keeping card details after a declined test payment would mean carrying them through the URL; left as is.
