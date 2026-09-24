# 13 · Admin Console, Two-Factor Sign-in, Payments, Bugs and Statistics

Modelled on the OneClickConvert admin (bug board, traffic page, owner sign-in with an authenticator), rebuilt on this app's own stack (Drizzle, server actions) and fixing its main gap: two-factor sign-in there is checked only in the browser. Here every admin page, action and export checks it on the server.

## Sections (`/admin`)

| Tab | What it does |
|---|---|
| Platform | Headline numbers, revenue switch-on readiness, system panel (database, storage, AI provider order, Google, payments, 2FA) and a warning when your own account has no 2FA |
| Statistics | Visitors, visits, page views per day/week, how far visitors get (visited → opened an agency → contacted → sent a request → accepted a quote), marketplace activity, where visits come from, how they arrived (landing page × source), top pages, devices, language, time zones, AI answers by provider. Ranges: 7 / 30 / 90 days / year |
| Payments | Agency plans tab: revenue this month and last month, monthly recurring revenue, paying agencies, pending payments, list with filters, record a CliQ / bank / cash payment, refund (optionally ending the plan), CSV export. Protected client payments tab: see `14-contracts-and-milestones.md` |
| Bugs | Error journal (browser and server errors, grouped, counted, re-opened if a fixed error returns; notes and fix commit) and user reports from "Report a problem" (new → planned → done / declined). Badge in the nav = open errors + new reports |
| Agencies, Reports, Reviews, Promotions | As before |
| Users | Every account with role, agency, 2FA state, last sign-in; admin reset of someone's 2FA (after confirming identity) |
| Audit log | Admin actions, admin sign-ins (with or without 2FA), 2FA changes, payments and refunds |
| Security | Your own 2FA |

## Two-factor sign-in

- Standard authenticator codes (RFC 6238: 6 digits, 30 seconds), implemented in `lib/auth/totp.ts` with Node's crypto and tested against the RFC's vectors. Works with Google Authenticator, Microsoft Authenticator, 1Password, Authy.
- Secrets are encrypted at rest with AES-256-GCM (`lib/auth/secret-box.ts`, key `MFA_ENCRYPTION_KEY`). The Fly workflow generates the key once.
- 10 single-use backup codes, stored as hashes, shown once (copy / download), regenerable.
- Sign-in: password → a locked, 10-minute session that grants nothing → code or backup code → full session. A code can't be reused (the last used time step is stored). 5 tries per 10 minutes per account.
- Admins: required in production (`ADMIN_REQUIRE_2FA`, default on in production). Until an admin turns it on, only `/admin/security` opens; every other admin page, server action and the CSV export refuse.
- Agencies can turn it on under Studio → Security.
- Lost phone and backup codes: another admin resets it under Users (audited, signs the person out everywhere).

## Payments (agency plans)

- `lib/payments/provider.ts` is the gateway adapter. `mock` (default) is a built-in test checkout: no real money, clearly labelled. It goes through the same path as a real gateway: a signed notification (`/api/payments/webhook/<provider>`), stored once per event id, amount must match, then the plan is activated.
- Plans are paid for 1, 3 or 12 months (12 months = 10 months' price). Renewing the same plan stacks on the time left.
- Amounts are stored in fils (1 JOD = 1000 fils).
- Manual payments (CliQ, bank transfer, cash) are recorded by an admin and activate the plan immediately.
- Studio → Plan & billing shows the current plan, the options and the agency's payment history. While `MONETIZATION_ENABLED=false` it says everything is free; the test checkout still works so the flow can be tried.
- Going live: add a provider (HyperPay, PayTabs, Tap and others are licensed in Jordan) implementing `createCheckout` and `parseWebhook`, set `PAYMENTS_PROVIDER` and `PAYMENTS_WEBHOOK_SECRET`.

## Bugs

- `components/error-reporter.tsx` sends uncaught browser errors (production only, each once per page load, at most 25 per session) to `/api/errors` (rate limited, bots ignored).
- `instrumentation.ts` records server errors with the route file (not the URL, so private tokens in links are never stored).
- `app/[locale]/error.tsx` shows a friendly page with "Try again" and "Tell us more".
- "Report a problem" (side menu on desktop, life-buoy icon on phones, `/support`): kind, message, optional email; the page it came from is attached without query strings.

## Statistics

- `components/page-tracker.tsx` records page views (production only; not admin or studio pages): path, source of the visit (UTM source, referring site or direct), a per-tab visit id, device type, language, time zone. No cookies of its own, no IP addresses, no third parties. Bots are ignored.
- AI chats are recorded per answer with the provider that answered.
- Days are grouped in Jordan time.
- Charts are plain HTML (`components/admin/charts.tsx`): one contrast-checked series colour (`--chart-1`, separate light and dark values), hover and keyboard tooltips, and a table view.
