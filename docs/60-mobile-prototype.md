# 60 — Mobile prototype (roadmap M3): the Expo app for slice A

Status: prototype code on main; the device run that closes M3 (one provider completes the slice on a physical iOS and Android phone) is the owner's step, see §6.
Builds on: docs/architecture/mobile-and-api-roadmap.md (§5 auth, §7 Expo strategy, §8 slice A, §8.1 the API as built), docs/53 (first-run setup), docs/41 (sign-in).

## 1. What exists

`mobile/` is an Expo SDK 57 app (TypeScript, `expo-router`) that implements slice A against `/api/v1`:

| Screen | Route | API it calls |
|---|---|---|
| Door | `/` | reads the Keychain/Keystore session, `GET /me`; sends the provider to sign-in, the app, or the update screen |
| Sign in | `/sign-in` | `POST /auth/login` (password; MFA accounts and staff are turned away with the server's reason) |
| Update required | `/upgrade` | shown after any `426 upgrade_required`; nothing else is offered |
| Home | `/(app)` | `GET /me`: page name, handle, visibility, setup step, link to the saved project |
| Profile | `/(app)/profile` | `PATCH /profile` (name, bio, services from the same catalog as the web; `version` is the draft's) |
| Setup | `/(app)/setup` | `POST /portfolio/open`, `PATCH /portfolio` (step, source, client, project), `POST /media` (photos picked with `expo-image-picker`), `DELETE /media/:id`, `POST /portfolio/publish` |
| Project | `/(app)/project/[id]` | `GET /projects/:id`; images through `/api/portfolio-media/**` with the bearer header |
| Settings | `/(app)/settings` | language (Arabic default, right to left; English), `POST /auth/logout`, `POST /auth/logout-all` |

The parts the screens never repeat live in `mobile/src`:

- `api/contract.ts` — the server's shapes and error codes, the media limit and the publish rule (`missingForPublish`). `tests/unit/mobile-client.test.ts` fails if they drift from `lib/api/errors.ts`, `lib/core/catalog/media-limits.ts` or `lib/data/portfolio-setup.ts`.
- `api/client.ts` — a framework-free client: bearer header from a `TokenStore`, `X-Sawwiq-App: expo/<version> (<platform>)` on every call, the error contract as `ApiFailure`, `unauthenticated` → clears the device session and tells the app, `upgrade_required` → stops the app with the server's minimum, token rotation when fewer than 7 days remain (one refresh for concurrent callers), logout/logout-all always clear the device even offline.
- `secure-store.ts` — the token in `expo-secure-store` (iOS Keychain, Android Keystore), never AsyncStorage (roadmap §5).
- `session.tsx`, `i18n.tsx`, `errors.ts`, `ui.tsx`, `private-image.tsx` — one client for the app, one language context (`I18nManager.forceRTL` from the saved language), reason codes → sentences (values never come from the server), small logical-direction UI pieces, and an `<Image>` that sends the bearer header for private media.
- `catalog/services.json` — the web's service taxonomy, copied by `scripts/sync-mobile-catalog.mjs`; the unit test fails when they differ.

Server side, one addition: `API_MIN_APP_VERSION` (unset by default). When set and a request names an older app in `X-Sawwiq-App`, every `/api/v1` route answers `426 upgrade_required` with `X-Min-App-Version` before anything else runs (`lib/core/rules/app-version.ts`, pure; wired in `lib/api/v1.ts`). Requests without the header are not apps and pass.

## 2. Proof

- `tests/unit/mobile-client.test.ts` (10): contract parity (codes, media limit, publish rule on five drafts, catalog copy) and client behaviour against a fake server (headers, token lifecycle, `unauthenticated`, `upgrade_required`, rotation, offline logout, multipart field name).
- `tests/unit/api-v1.test.ts`: the server refuses `expo/2.0.9` when the minimum is `2.1.0` and judges a current app, a malformed header and no header on their own merits.
- `tests/e2e/mobile-client.spec.ts`: the app's client completes the slice against the real e2e server — sign in (wrong password refused) → profile → source → upload (`image/webp` back, 401 without the token) → resume from `/me` → client → project → the publish rule → stale version refused → publish → owner reads the project and its image, anonymous and another provider's app get 404 → the web studio shows the work → logout-all ends a second device's session. Runs in the Full-platform regression job.
- `mobile`: `tsc --noEmit` clean; `expo export` bundles iOS and Android (Metro) — the "Mobile prototype (Expo) typecheck" CI job runs the typecheck on every push.

## 3. Running it against staging

Production answers 404 on `/api/v1` until the mobile beta (`API_V1_ENABLED` unset). To try the app:

1. Deploy a staging copy (a Vercel preview of `main`, or `npm run build && npm run start` locally) with `API_V1_ENABLED=true` and `API_V1_ENVIRONMENT=staging`. Do not set either in production; production hosting markers veto the API.
2. `cd mobile && npm ci && EXPO_PUBLIC_API_URL=https://<staging-host> npx expo start --go --clear --lan`, then open the Expo Go app (SDK 57) on the phone or an EAS development build.
3. Sign in with a provider account that exists on that deployment (a password account without a second factor). Nothing in the app creates accounts.

Note on previews: Vercel preview deployments share the production database variables unless they are scoped to the preview target; a staging deployment for the app must point at a staging database before the switch is turned on there.

## 4. What is not in the prototype

PDF/Behance/connected-platform sources (web only; the source screen says so), avatar upload, media reordering UI (the client has `orderMedia`), existing-client selection and new-client creation (the client has them; the screen offers personal and unnamed-client), MFA accounts, staff, notifications, push, deep links from the web into the app, crash reporting. These are M4 items (roadmap §11).

## 5. Service worker decision for the web PWA (asked by M3)

Decision: **no service worker in the registration phase**. The manifest is installable and phase-aware (M0); a worker that caches pages or media would have to be taught the private draft media (`/api/setup-media/**`, `/api/v1/media/**`), the owner-only portfolio media and the per-user studio pages, and the gain during registration (a provider editing their own page) is small. Revisit with M4 under these conditions: an offline page only (`/[locale]/offline`), never caching anything under `/api/**`, `/studio/**` or `/portfolio-media/**`, no `skipWaiting`, and the update prompt driven by `/api/version` as §6.2 of the roadmap describes.

## 6. What closes M3 (owner)

The exit criterion is a physical-device run: one provider completes the slice on an iOS and an Android phone against staging, private media answers 404 without the token (the e2e proves this server-side; the device run proves the app sends the header), and logout-all revokes the device. That needs a phone, Expo Go or an EAS build (an Expo account; no paid vendor is required for Expo Go), and a staging deployment with `API_V1_ENABLED=true`. Record the run (screenshots from both platforms, the staging `/api/version`) under `docs/upgrades/mobile-prototype/`.

## 7. Acceptance package

Use [the staging run sheet](upgrades/mobile-prototype/staging-acceptance-run-sheet.md) and [the unfilled device evidence template](upgrades/mobile-prototype/device-acceptance.template.json). M3 remains open. The requested acceptance uses physical Expo Go on both phones. Draft media intentionally returns 401 anonymously; finished private media returns 404. The run sheet covers fresh drafts for the same provider and cross-device logout-all proof.
