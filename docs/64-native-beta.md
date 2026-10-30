# 64 — Native beta: staging, phone builds and release (M4)

Status: the build workflow and the server endpoints are on branch `feat/m4-native-beta`. Nothing here changes production:
`API_V1_ENABLED` stays unset on Vercel production, and the workflow refuses production and localhost addresses.
Builds the device run needs: docs/60 (prototype), roadmap §11 (M3/M4).

## 1. What the app now does (M4 scope)

- **Notifications**: `GET /api/v1/notifications` (latest 50, unread count) and `POST /api/v1/notifications/read`. The
  Notifications screen lists them and marks them read on open, as the web bell does. Kinds the app does not name yet
  show "New update" instead of breaking.
- **Crash reports**: `POST /api/v1/errors` files a report into the same error journal as the web (Admin → Bugs,
  source `client`). It is public and rate limited (30 per 10 minutes per address), and keeps no personal data: the
  message, stack, path `/mobile`, and the app version and platform. Uncaught JavaScript errors are reported; promise
  rejections are not hooked.
- Not in M4: push notifications (design only, below), two-factor sign-in on the phone, avatar upload, deep links.

## 2. Phone builds: `.github/workflows/app-builds.yml`

Manual only (`workflow_dispatch`). Inputs: `api_url` (required), `iphone`, `android`.

- The iPhone job runs on macOS: `expo prebuild` (iOS), `pod install`, then `xcodebuild archive` in Release with code
  signing off. Release embeds the JavaScript bundle, so no Metro server and no Expo Go are needed. The `.ipa` is
  packaged from `Payload/*.app` and published to the fixed release `iphone-latest`.
- The Android job runs on Linux: `expo prebuild` (Android) and `assembleDebug`; the APK goes to `android-latest`.
- `api_url` must be `https://…`, not localhost, and not a production host (`sawwiq.org`, `www.sawwiq.org`, the production Vercel aliases). The job stops otherwise. Use `https://staging.sawwiq.org`: the canonical staging site, with its own database and the API switched on.
- Install the iPhone file from a Windows PC with Sideloadly and a free Apple ID (cable, Developer Mode on, trust the
  Apple ID under VPN & Device Management). It expires after 7 days. Push notifications do not work under a free Apple ID.

Cost rules (from the TeamManager experience): keep the workflow manual; do heavy web builds on Linux, not the macOS
runner; read failures from step names and annotations. Artifacts cannot be downloaded from a Claude session, so the
builds publish to releases; fetch with `gh api` and `Accept: application/octet-stream`.

## 3. Staging API (needed before a device build)

A staging deployment is a non-production copy of this web app with `API_V1_ENABLED=true` and its own database.

Option A, Vercel preview (the Varsal/Vercel route):
1. Create a separate Supabase project for staging; take its `DATABASE_URL` and Storage keys. Do not reuse production.
2. In Vercel, set these only for the **Preview** environment (or for the `feat/m4-native-beta` branch): `DATABASE_URL`,
   Supabase Storage keys, `API_V1_ENABLED=true`, `NEXT_PUBLIC_SITE_URL` set to the preview address. Keep production
   unchanged.
3. Deploy the branch. `vercel.json` runs `npm run db:migrate` against the database it is given, so staging migrations
   never touch production.
4. Use the preview URL as `api_url` in the build. Check `GET <url>/api/health` and `GET <url>/api/v1/me` (expect 401).

Option B, a local server on your own computer: `npm run db:seed`, then
`API_V1_ENABLED=true npm run start -- -H 0.0.0.0`. Use `http://<the computer's Wi-Fi address>:3000` for local tests with
Expo. Cloud builds need an https address, so option B suits the device run only if the phone can reach the machine
over the same network.

## 4. Push notifications (design, not launch)

Requirements: Apple push needs the paid Apple Developer account, so it can start only after enrollment. The design:
the server stores a device token per signed-in user (`device_tokens` table, one row per device, removed at sign-out),
sends through APNs and FCM when a notification is created (`lib/data/notifications.ts`, `addNotifications`), and
never sends the message text in the push body (only "New update" and the deep link). Retention follows the
notifications table (90 days). A new consent note and migration are required before the feature ships. Not built now.

## 5. Store releases (later)

TestFlight and the Google Play internal track need developer accounts (Apple's paid program; Google's one-time fee). The
`eas.json` profiles are set up for store builds; a store build needs an Expo account and the signing steps in Expo's docs.
Blocked until the accounts exist.

## One app, two sites (owner decision, 30 Oct 2026)

One build talks to the real site (`https://sawwiq.org`, `EXPO_PUBLIC_PRODUCTION_URL`) and to the staging site (`api_url`, normally `https://staging.sawwiq.org`, `EXPO_PUBLIC_STAGING_URL`). The rule lives in `mobile/src/api/accounts.ts` and is unit-tested (`tests/unit/mobile-accounts.test.ts`):

- **Sign in.** The real site is asked first. If it accepts, the person is in the real Sawwiq. Only if it answers "wrong email or password" (or 404, while its API switch is off) is the staging site asked; if that accepts, the app stays on staging and shows a **Test mode** strip on every screen. Any other answer from the real site (offline, server error, too many tries, staff, two-step) is shown as it is and the staging site is never tried, so a real person cannot land on the test site because the real site had a problem. Both refuse → "wrong email or password".
- **Sign up** in the app always creates a real account on the real site (`POST /api/v1/auth/signup`, the same rules as `/join` through `lib/data/provider-signup.ts`: consent and age confirmed, unique handle and email, valid WhatsApp). Test accounts are made on the staging website.
- The app remembers which site the account is on (`sawwiq.session.site` in the Keychain/Keystore) and sends every request there. Settings shows the site.
- The same email on both sites: the real account wins in the app; reach the test account on the staging website.
- A mistyped real password is also tried on the staging site, which is ours, over HTTPS, and never stores or logs passwords.
- **Going live** is one switch: `API_V1_ENABLED=true` on Production in Vercel. Until then sawwiq.org answers 404 on `/api/v1`, the app signs staging accounts in, and the sign-up screen says account creation opens soon and links to the website.
