# App review notes (Apple App Store / Google Play)

Paste the relevant parts into App Store Connect "App Review Information" and the Play Console "App access" form.

## Demo login
- Create the reviewer account with `DEMO_EMAIL=... DEMO_PASSWORD=... npm run seed:demo-account` (password 12+ characters; `DEMO_HANDLE` optional, default `app-review`). Credentials live only in the environment and the store consoles, never in the repo.
- Sign in at `/signin` (or the app's sign-in screen) with those credentials. The account is an agency with an empty draft profile, so the reviewer can reach Studio, posts, requests, chat and Security.
- The script writes to the database `DATABASE_URL` points at. Run it against staging or production on purpose, not by accident.

## What the app does
Sawwiq is a marketplace and showcase where businesses in Jordan and the region find marketing agencies, post project requests, receive quotes and chat with agencies. Arabic (RTL) is the default; English is the second language.

## Payments and in-app purchase
No digital goods or subscriptions are sold. Paid plans are off (`MONETIZATION_ENABLED`, docs/10), and protected contract payments are for real-world services between businesses, paid through a licensed payment partner (docs/32), not for digital content. If a digital-goods plan is ever turned on, the native build must use platform billing (see `docs/APP_STORE_COMPLIANCE.md`, items 1, 11, 12).

## Account deletion
Agency: Studio → Security → Close my account. Business owner: My requests → Close my account. Public instructions: `/delete-account`. Signed contracts and the payment ledger are kept as required by law.

## User-generated content and moderation
- Report: posts (flag on each post) and chats (Report in the chat header). Block: Block in the chat header closes the conversation for both sides.
- Reports go to Admin → Reports; staff can hide a post, open the reported chat (Admin → Conversations) or dismiss the report. Chat messages are never deleted; staff can hide one (docs/23).
- Terms forbid abusive content; staff can suspend accounts.

## Legal links
Privacy Policy `/privacy`, Terms of Service `/terms`, Support `/support`, summary `/legal`. All are linked from the site footer and the app shell menu; sign-in and sign-up link to the privacy page.

## Screenshots
Store screenshots must show the real, current app (Apple 2.3.3 / Play metadata policy): capture them from the build under review, in Arabic and English, on phone and iPad sizes. Do not use mock-ups, marketing renders or features that are switched off.
