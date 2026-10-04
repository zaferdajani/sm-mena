# M3 physical-device acceptance — staging only

Status: **NOT RUN. M3 remains open.** This package prepares the run; it is not device evidence.
PR #61's historical CI and release proof remain in `release-evidence.2026-10-03.json`. Record the exact acceptance-branch commit deployed to staging, not that historical validated head. This package was reconstructed after workspace maintenance removed the unpushed checkout; see `repository-verification.2026-10-04.json`.

## 1. Prepare the isolated target

- Deploy `chore/m3-staging-acceptance` to **Preview/staging only**, never merge/deploy it to production as part of this run. Record full commit SHA, deployment ID and HTTPS origin.
- Check staging `DATABASE_URL`, `STORAGE_PROVIDER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET` (or isolated `PGLITE_DIR`/`UPLOADS_DIR` for a persistent local server). Confirm database and storage are separate from production. Record only non-secret resource identifiers. Preview variables can inherit production resources: a preview URL alone proves nothing.
- Scope `API_V1_ENABLED=true` **and** `API_V1_ENVIRONMENT=staging` to this staging target/branch. `VERCEL_ENV=production` or `VERCEL_TARGET_ENV=production` always vetoes the API, even if both opt-ins are copied. Do not override hosting markers. A non-Vercel production build also requires the explicit staging scope; that is not proof of resource isolation.
- Keep `LAUNCH_PHASE=registration` and provider visibility `private`. Leave `API_MIN_APP_VERSION` unset or at/below app version `0.1.0`. Do not enable payments, connections or campaigns.
- Use one consenting disposable staging provider, password account without MFA/staff role. Provision through the staging web flow if absent. Both phones use this same account; never copy a production database/account. Record a pseudonymous provider reference.
- Confirm both phones can reach the preview. Hosting-protection redirects or HTML are not API responses; use approved staging access. Never put bypass secrets in `EXPO_PUBLIC_*`.
- Record staging `GET /api/version`; its commit must equal the candidate. No-token `GET /api/v1/me` with `X-Sawwiq-App: expo/0.1.0 (ios)` must return **401 JSON, `error.code=unauthenticated`**, not 404, 426 or a login page. Repeat with `(android)`.
- Read-only production sentinel before and after: `https://sawwiq.org/api/v1/me` must stay **404**, with no app header and with `X-Sawwiq-App: expo/0.1.0 (ios)`. Record `/api/version`. Do not set, clear or redeploy production variables. If it differs, stop/report rather than repairing production from this run.

## 2. Mobile setup (Node 22+)

From repository root:

```sh
npm ci
npm run typecheck
npx vitest run tests/unit/api-v1-environment.test.ts tests/unit/api-v1.test.ts tests/unit/mobile-client.test.ts
cd mobile
npm ci
npm run typecheck
npx expo install --check
npx expo export --platform ios --platform android --output-dir /tmp/sawwiq-m3-export
```

Use committed lockfiles; do not upgrade Expo during acceptance. `mobile/package.json` pins SDK 57 (`expo ~57.0.26`), React Native `0.86.3`; `app.json` identifies version `0.1.0` and iOS/Android application identifier `org.sawwiq.app`. The repository verification file distinguishes fresh checks from historical ones. The previous online Expo dependency check timed out; offline validation reported up to date but warned that it was unreliable. Run the online check on the operator workstation.

Export proves bundling, not physical compatibility. Record each phone's Expo Go version and whether it supports SDK 57. If it cannot open the project, mark blocked; a simulator, web preview or development build does not satisfy this requested Expo Go run.

Create uncommitted `mobile/.env.local` (same file format on Windows/macOS/Linux):

```dotenv
EXPO_PUBLIC_API_URL=https://YOUR-ISOLATED-STAGING-HOST
```

Use the HTTPS **origin**, without `/api/v1`, credentials or query parameters. This value is public in the bundle. Never use `sawwiq.org`, a production alias or `localhost` (which means the phone).

```sh
# From mobile/: common physical-phone command for both platforms
npx expo start --go --clear --lan
```

Keep computer and phones on a mutually reachable network. iPhone: scan QR with Camera and open Expo Go. Android: scan from Expo Go. `npm run ios` and `npm run android` launch local simulator/emulator targets, not this physical-phone procedure. If needed use `npx expo start --go --clear --tunnel` for Metro (requires tunnel dependency/network); it does not tunnel the API. Restart Metro after changing the API origin. Capture Settings showing API URL and version on each phone. No Android Studio, Xcode or paid EAS build is needed for this Expo Go run.

## 3. Complete slice A twice, sequentially

Copy `device-acceptance.template.json` into a dated directory here, e.g. `device-run-YYYY-MM-DD/evidence.json`. Store redacted screenshots there using relative paths. Record UTC timestamps and actual results. Never commit passwords, tokens, cookies, authorization headers, raw traffic captures or personal photos.

For **iPhone first**, then **Android**, use the same provider and perform every step on the phone:

1. Sign in. Record model, OS, Expo Go version, app version, staging origin and provider reference. Capture Arabic-first RTL home; note layout issues.
2. In Profile save name/bio and at least one catalog service. Open Setup and Continue.
3. Choose upload source, then personal or unnamed client (implemented mobile choices).
4. Enter a unique platform-labelled project title, contribution and service. Pick a non-sensitive photo from the phone library; verify the private draft preview renders. Record picker permission/result. Save with Next, then force-close/reopen Expo Go and verify saved fields, draft and photo resume. Unsaved typed text is not expected to persist.
5. In Preview confirm publication requires rights confirmation; enable it, publish, open the project. Verify its photo renders and the staging web studio shows the same project. Keep provider visibility private: publishing a project does not authorize making the provider public.
6. Capture project ID and exact media paths for the checks below. Capture draft-media checks before publishing. Save evidence before resetting anything.

**Between platforms:** there is no restart-draft button in the app. Once the first project is finished, use the same staging provider's authenticated API session to `POST /api/v1/portfolio/restart` (empty body, bearer header). Expect **201** and a fresh in-progress draft, preserving the finished project. Do not restart an unfinished draft or reset the database. Reload/sign in on Android and repeat all six steps. Avoid concurrent draft edits.

## 4. Privacy checks for each platform's actual project

Use a local API client with credentials held only in its secret/session store. Login: `POST /api/v1/auth/login`, JSON `{ "email": "…", "password": "…" }`, expect 201 and retain token privately. `GET /api/v1/me` supplies draft-media paths; `GET /api/v1/projects/<postId>` supplies finished image paths. Never export login responses to evidence. Record only path, status, content type, cache policy and timestamp.

| Resource | Owner bearer | No bearer, no cookies | Other provider bearer (optional regression) |
| --- | --- | --- | --- |
| Draft `/api/v1/media/<id>` before publication | 200 image/webp | 401 unauthenticated | 404 |
| Private project `/api/v1/projects/<postId>` | 200 JSON | 404 | 404 |
| Exact finished `/api/portfolio-media/…` image path | 200 image | 404 | 404 |

Use GET and fresh requests, no cached image, no cookies and no followed redirects. First establish owner 200 for the **same** resource: a guessed nonexistent path or login-page redirect proves nothing. Media must carry `Cache-Control: private, no-store`. Finished media supports the web session, so the anonymous probe must omit web cookies too. Pair authenticated image rendering on each phone with rejection of its exact private image anonymously. Draft 401 is intentional; never rewrite it as 404 in evidence.

## 5. Prove logout-all revocation

- Sign the same provider into both phones and verify fresh successful requests on both. Keep online. Optionally keep an additional API-client session for a token-status record without extracting Keychain/Keystore data.
- On iPhone select Settings → sign out all; expect sign-in. Force-close/reopen Android (or use Home refresh) to trigger fresh `/me`: it must sign out and fail to load protected data until a new login. Capture times and both screens. The additional pre-existing API session, if used, must return 401 `unauthenticated` on `/api/v1/me`.
- Sign in again on both and repeat with Android initiating and iPhone revoked; record separately.
- A locally cleared session alone is **not** proof: the app clears local state even when logout fails/offline. The other phone's fresh unauthorized result is mandatory. Old pixels in memory are not a successful fresh fetch: relaunch and record the network-backed result.

## 6. Close out honestly

Repeat the read-only production sentinel; retain staging version/timestamps. Review evidence for secrets and record defects/blocks. All observations must refer to one candidate/deployment; repeat acceptance if either changes. Stop Metro, remove local credentials, revoke remaining test sessions, disable only staging API switches after capture and record cleanup.

M3 stays open until both physical Expo Go slice runs, owner/anonymous privacy pairs and device revocation have actual evidence. The run sheet exercises revocation in both directions. CI, unit tests and exports remain repository verification, never device results. No production changes are authorized by this package.
