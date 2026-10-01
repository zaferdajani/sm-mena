# Mobile and API roadmap — technical design

Status: design only (branch `feat/early-access-campaign`, 1 Oct 2026). Nothing in this document is implemented by it. The production database connection (`lib/db/index.ts`, Supabase via node-postgres on Vercel) is **not** to be touched by any step below. Server-side authorization stays authoritative for every client, web or native.

Principle throughout: **share the brains, not the pixels** — types, Zod schemas, business rules, API contracts, permissions, country/service catalogs and error contracts are shared; React Server Components, forms, `next-intl` bindings and screens are not.

---

## 1. Current architecture

### 1.1 Routing (`app/[locale]`)

| Group | Purpose | Notes |
|---|---|---|
| `(auth)` | `login`, `signin` (email code), `join`, `start`; `actions.ts`, `signin-actions.ts` | password login creates an `mfaPending` session for staff with TOTP, then `/login/verify` |
| `(landing)` | `page.tsx` (front page), `soon`, `examples` | `/soon` is where `requireDirectory()` sends visitors in the registration phase |
| `(main)` | everything signed-in or marketplace: `a/[handle]`, `p`, `explore`, `feed`, `hire`, `match`, `studio/**`, `portfolio-setup`, `admin/**`, `requests`, `chats`, `notifications`, `pay`, `legal`, … plus 12 `*-actions.ts` files at group root | `layout.tsx` only mounts `components/shell/app-shell.tsx`, which itself calls `getSessionUser()` |
| `j/[code]` | referral join links | |
| `[...rest]` | locale-aware 404 | |

`proxy.ts` (Next 16 "middleware") runs `next-intl` routing, canonical-host handling, `X-Robots-Tag` on non-canonical hosts and sets the anonymous visitor cookie `sw_vid`. It excludes `/api` and `/media`.

### 1.2 Data layer (`lib/data/*`, 60 files)

Every module imports `getDb()` from `lib/db` and the Drizzle schema; 59 of 60 touch the database, 1 (`contract-notify.ts`) imports `next-intl`. Readers take explicit ids (`agencyId`, `userId`, `Recipient`) rather than reading cookies — with one exception: `lib/data/publication.ts#mayReadAgency` dynamically imports `launchViewer()` (cookie-derived identity) to decide visibility. Domains: agencies/posts/publication, portfolio-setup/clients/import, social, conversations/inbox/notifications, requests/hire/matching, contracts/escrow/money-out/ndas/payments, collab-* (16 files), admin/staff/stats/bugs, referrals, deactivation.

### 1.3 Auth (`lib/auth/session.ts`, `guards.ts`, `mfa.ts`, `permissions.ts`, `policy.ts`)

- **Sessions**: table `sessions` (`lib/db/schema.ts:210`): `id = sha256(token)`, `userId`, `expiresAt`, `mfaPending`, `createdAt`, index on `userId`. `createSession()` inserts a 32-byte random token (30 days; 10 minutes when `mfaPending`) **and sets the `sw_session` cookie itself** (httpOnly, lax, secure in production). `getSessionUser()` (React `cache`) joins `sessions`→`users` with `expiresAt > now`, `mfaPending = false` and `accountActive()`.
- **Account disabling / staff expiry**: `accountActive()` = `users.disabledAt IS NULL AND (staffExpiresAt IS NULL OR > now)`; a disabled user has no valid session on the next request without any token revocation.
- **Logout / logout everywhere**: `destroySession()` deletes the row for the current cookie; `destroyAllSessions(userId)` deletes all rows (used by `changePassword` in `security-actions.ts:109`, `deactivateAgency` in `lib/data/deactivation.ts:70`, `adminResetMfa` in `lib/auth/mfa.ts`).
- **MFA**: TOTP (`lib/auth/totp.ts`), secrets sealed with `MFA_ENCRYPTION_KEY` (`secret-box.ts`), backup-code hashes; `adminMfaRequired()` forces 2FA for staff in production; `completeMfaSession()` destroys the pending session and creates a full one.
- **Roles / permissions**: `permissions.ts` is pure data (`STAFF_ROLES`, `PERMISSIONS`, `MATRIX`, `can()`); `policy.ts#adminAccess()` is a pure function returning `login | forbidden | enroll | ok`. `guards.ts` wraps both and **redirects** (`@/i18n/navigation` + `next-intl/server#getLocale`) instead of returning errors. User roles: `agency`, `client`, `agent`, and staff roles.
- **Second login path**: `lib/auth/email-code.ts` + `(auth)/signin-actions.ts` (6-digit email codes for client accounts, docs/41).
- **Passwords**: scrypt (`lib/auth/password.ts`).

### 1.4 Server actions inventory

33 files carry `"use server"`, exporting ~193 actions:

| Domain | Files | Actions |
|---|---|---|
| Auth & account | `(auth)/actions.ts`, `(auth)/signin-actions.ts`, `(main)/security-actions.ts`, `confirm-account/[token]/actions.ts` | 15 |
| Public interactions | `(main)/actions.ts`, `share-actions.ts`, `demo-actions.ts`, `support-actions.ts`, `review-actions.ts` | 19 |
| Provider studio & portfolio | `studio/actions.ts` (19), `portfolio-setup/actions.ts` (15), `studio/import-actions.ts`, `studio/import/behance-actions.ts`, `studio/publication/actions.ts`, `studio/connections/actions.ts` | 46 |
| Collaboration | `studio/collab/actions.ts` (21), `intel-actions.ts`, `orders/actions.ts` | 36 |
| Contracts, NDAs, billing, requests, chat | `contract-actions.ts` (29), `nda-actions.ts`, `billing-actions.ts`, `request-actions.ts`, `chat-actions.ts` | 40 |
| Admin | `admin/actions.ts` (12), `team-`, `agent-`, `appearance/`, `bug-`, `contract-`, `conversation-`, `feature-`, `payment-`, `service-actions.ts` | 37 |

27 files take `FormData`, 22 call `revalidatePath`, 15 call `redirect`, 2 call `getTranslations`. 59 `z.object` schemas live inside action files versus 30 in `lib/`.

### 1.5 API routes (`app/api/*`)

| Route | Method | Auth model |
|---|---|---|
| `admin/payments` | GET | `adminAccess(user, mfa, "payments.export")`, audited CSV |
| `collab/assets/[id]` | GET | `getCurrentAgency()` must be buyer/supplier; IP rate limit; `private, no-store` |
| `conversations/[id]/messages` | GET | `resolveParticipant()`: agency session **or** visitor cookie / private token; polled |
| `cron/google`, `cron/milestones`, `cron/retention` | GET | `Authorization: Bearer $CRON_SECRET` |
| `errors`, `track` | POST | public, crawler-filtered, IP rate limit, Zod body |
| `health`, `version` | GET | public, no secrets |
| `legal/[kind]/[ref]`, `receipts/[ref]/[entry]` | GET | uuid ref → session party or staff (`can(role,"escrow.resolve")`, audited); otherwise the client's private token |
| `match` | POST | public visitor; `canUse("ai_matchmaker")` gate; visitor + IP rate limits |
| `notifications/count` | GET | `currentRecipient()`: agency session else visitor cookie |
| `payments/webhook/[provider]` | POST | provider signature (`lib/payments/provider.ts`) |
| `portfolio-media/[...key]` | GET | `mayReadAgencyId()` (publication visibility + owner/staff via `launchViewer`) |
| `setup-media/[id]` | GET | `getCurrentAgency()` owner only; `private, no-store` |
| `social/callback/[provider]` | GET | session + OAuth `state` bound to `currentSessionId()` and user |
| `social/meta/[app]/[event]` | POST | Meta `signed_request` verification |

Every route derives identity from cookies (`next/headers`). There is no bearer-token path and no `/api/v1` namespace.

### 1.6 Storage, i18n, gating, jobs

- **Storage** (`lib/storage/index.ts`): `Storage` interface (`put/get/remove/url`); local disk or Supabase buckets `media` / `media-private`. Private prefixes `collab/`, `drafts/`, `portfolio/` never get a public URL; `portfolio/` is served by `/api/portfolio-media`, setup drafts by `/api/setup-media`. No signed URLs are issued today.
- **i18n**: `i18n/{languages,routing,request,navigation}.ts` (next-intl), `messages/{ar,en}.json` (87 namespaces, ~4.9k lines each), `lib/content-lang.ts`, `lib/i18n/*` (pure).
- **Launch-phase gating**: `lib/launch-phase.ts` is pure except `process.env` (`LAUNCH_PHASE`, `LAUNCH_PILOT_HANDLES`); `lib/launch-access.ts` adds the request identity (`launchViewer`, `canBrowseDirectory`) and `requireDirectory()` which redirects to `/soon`; `lib/feature-gate.ts` combines phase + DB feature switches (`lib/features.ts`, 15 keys) + viewer. `hire`, `match`, `explore`, `feed` pages all call `requireDirectory()`.
- **Background jobs**: `vercel.json` crons `17 3 * * *` → `/api/cron/google`, `41 3 * * *` → `/api/cron/retention` (which also runs milestone jobs, collab expiry, social purge, `purgeSetupMedia`); `/api/cron/milestones` on demand. Weekly maintenance runs in GitHub Actions (`.github/workflows/maintenance.yml`) against the live DB with `tsx` scripts.

### 1.7 Where business rules live vs. where they are coupled

Rules that are already pure: `lib/auth/permissions.ts`, `policy.ts`, `launch-phase.ts`, `contracts/rules.ts`, `legal/clauses.ts`, `matching/{score,closeness,scope}.ts`, `monetization/entitlements.ts`, `founding.ts`, `price-stats.ts`, `countries.ts`, `taxonomy.ts`, `text.ts`, `collab/{types,time,redact}.ts`, `lib/data/portfolio-setup.ts#missingForPublish`.

Concrete couplings (12):

1. `lib/auth/session.ts` — `createSession()` both inserts the row and writes the cookie; `getSessionUser()` reads `cookies()` and is wrapped in React `cache`. Session logic cannot be reused by a bearer path without a split.
2. `lib/auth/guards.ts` — `requireAgency/requireStaff/requireUser/requireAgent` redirect via `next-intl` + `@/i18n/navigation` instead of returning a typed denial; every action depends on them.
3. `lib/launch-access.ts#requireDirectory` — a redirect to `/soon` inside `lib/`.
4. `lib/data/publication.ts#mayReadAgency` — a data reader that imports request identity (`launchViewer`) to answer "may read"; the rule (`canReadProfile`) is pure but the lookup is not.
5. `lib/request.ts`, `lib/visitor.ts`, `lib/country-choice.ts`, `lib/demo-mode.ts` — `next/headers`; `country-choice.ts` also hard-codes the `x-vercel-ip-country` header.
6. `app/[locale]/(main)/portfolio-setup/actions.ts#publishSetupAction` — calls `getTranslations({ locale: contentLang(...), namespace: "Setup" })` to compute `personalLabel` and passes it into the data layer; `saveProfileStepAction` parses `FormData`, resolves services, patches profile and `revalidatePath` inline.
7. `app/[locale]/(main)/studio/actions.ts#updateProfileAction` — ~70 lines of `formData.get(...)` parsing, phone normalisation, kind/role normalisation, then `redirect` to a welcome route; the validation schema is local to the file.
8. `app/[locale]/(main)/contract-actions.ts` — 29 actions using `String(formData.get("milestoneId"))` without schemas and `JSON.parse(formData.get("payload"))`; the only mutation surface for contracts.
9. `app/[locale]/(auth)/actions.ts#join` — rate limit, user + agency creation, referral attribution, invite acceptance, session creation and redirect in one function.
10. `lib/data/contract-notify.ts`, `lib/matching/describe.ts`, `lib/ai/fallback.ts`, `lib/legal/document.ts` — `createTranslator` imported from `next-intl` with `messages/*.json`; notification and PDF text generation is tied to the Next package (the function is actually `use-intl`'s).
11. `lib/form-options.ts`, `lib/studio-options.ts`, `lib/country-options.ts`, `lib/serves-note.ts` — `getTranslations/getLocale` from `next-intl/server` inside `lib/`.
12. Components calling data/auth directly (13 value imports): `components/shell/app-shell.tsx` → `getSessionUser`, `components/notifications/header-bell.tsx` → `unreadNotificationCount`, `components/chat/request-chat.tsx` → `loadThread`, `components/registration/studio-registration.tsx` → `publicationFor`, `listPackages`.

Also: `lib/rate-limit.ts` is per-process memory (already noted in the file), `lib/features.ts` ↔ `lib/monetization/plans.ts` ↔ DB form a cycle that pulls the database into "plan" rules.

---

## 2. Target architecture

Web (Next.js, PWA) and a future Expo client call one backend. Proposed logical layout (physical monorepo later, not now):

```
apps/web                  Next.js app: app/, components/, proxy.ts, instrumentation.ts, manifest
apps/mobile (future)      Expo + TypeScript
packages/types            inferred row/view types, DTOs (SetupView, ContractView, Recipient…)
packages/validation       Zod schemas shared by forms, actions and /api/v1
packages/business         pure rules and catalogs (countries, taxonomy, permissions, launch phase, pricing, contracts rules)
packages/api              /api/v1 request/response contracts, error contract, client SDK types
packages/auth-contracts   session/token shapes, auth error codes, role/permission names
packages/i18n             messages/*.json + pure helpers (content-lang, country names); no next-intl
packages/config           feature keys, env names, site constants (no process.env reads at import)
server/database           drizzle schema, migrations, getDb, seed
server/services           lib/data/*, storage, images/media, rate limit, request-context adapters
server/notifications      notifications, contract-notify, notify (email/WhatsApp)
server/social             lib/social/* adapters + lib/data/social.ts
server/ai                 lib/ai/*
```

Mapping of existing folders ("extractable" = pure TypeScript with no `next/*`, `react`, `server-only` or `@/i18n/navigation` imports today):

| Existing | Target | Extractable now? |
|---|---|---|
| `lib/countries.ts`, `taxonomy.ts` (+`data/service-taxonomy.json`), `labels.ts`, `dial-codes.ts`, `business-types.ts`, `text.ts`, `format.ts`, `full-service.ts`, `social-links.ts`, `i18n/country.ts` | `packages/business` | yes |
| `lib/launch-phase.ts`, `founding.ts`, `price-stats.ts`, `auth/permissions.ts`, `auth/policy.ts`, `contracts/rules.ts`, `legal/clauses.ts`, `matching/{score,closeness,scope,describe-core}.ts`, `monetization/entitlements.ts`, `collab/{types,time,redact,templates}.ts` | `packages/business` | yes (`launch-phase` reads `process.env`; accept an injected env) |
| `lib/account-schema.ts`, `match-wizard-schema.ts`, `collab/schemas.ts`, `chat.ts`, `payments/provider.ts#providerEventSchema`, the 59 schemas inside actions | `packages/validation` | partly; action schemas must be lifted first |
| Types from `lib/db/schema.ts` (`Agency`, `Post`, `SetupDraftData`…), `SetupView/SetupError`, `Recipient`, `ContractView` | `packages/types` | yes as `type` re-exports; the table objects stay in `server/database` |
| `lib/auth/{session,guards,mfa}.ts` | `server/services/auth` (+ `packages/auth-contracts` for shapes) | no: cookies/redirects/react cache |
| `lib/auth/{totp,password,secret-box,email-code}.ts` | `server/services/auth` | totp/password/secret-box yes (node:crypto only); email-code needs DB |
| `lib/data/*`, `lib/db/*`, `lib/storage`, `lib/images.ts`, `lib/media/*` | `server/database`, `server/services` | server-only by nature (sharp, pg, fs); not Next-coupled except items 4 and 10 above |
| `lib/notify.ts`, `lib/data/{notifications,contract-notify}.ts` | `server/notifications` | after replacing `next-intl#createTranslator` with `use-intl` or an injected `t` |
| `lib/social/*`, `lib/data/social.ts` | `server/social` | adapters yes (fetch); `providers.ts` needs `SITE_URL` injected for `callbackUrl` |
| `lib/ai/*` | `server/ai` | yes except `fallback.ts` (translator) |
| `lib/features.ts`, `feature-gate.ts`, `launch-access.ts`, `env.ts`, `site.ts`, `release.ts` | `packages/config` (keys, names) + `server/services/gating` | keys yes; gating no |
| `i18n/*`, `messages/*.json`, `lib/content-lang.ts` | `packages/i18n` (messages, pure helpers); `i18n/*` stays in `apps/web` | messages yes |
| `app/api/*` | handlers stay in `apps/web/app/api`; contracts move to `packages/api` | contracts to be written |
| `app/[locale]/**`, `components/**`, `proxy.ts`, `instrumentation.ts`, `app/manifest.ts` | `apps/web` | n/a (pixels) |
| `lib/{rate-limit,request,visitor,country-choice,demo-mode,chat-access}.ts` | `server/services/request-context` behind an interface (`RequestContext { ip, cookies, header(name), locale }`) | `rate-limit` yes; the rest no |

Nothing here requires a workspace tool today: the first step is folder discipline plus an import-boundary test (section 3, step 0).

---

## 3. Extraction sequence (incremental, no monorepo rewrite)

Each step keeps the old path as a re-export shim until the last importer moves, so `git blame` and e2e stay intact.

| # | Extraction | Files | Risk | Proof |
|---|---|---|---|---|
| 0 | **Import-boundary test**: a Vitest test that reads a listed set of files and fails if they import `next/*`, `react`, `server-only`, `next-intl`, `@/i18n/navigation` or `@/lib/db`; add an ESLint `no-restricted-imports` override for the same folders | new `tests/unit/boundaries.test.ts`, `eslint.config.mjs` | none | the test itself |
| 1 | **Catalogs** → `lib/core/catalog/` (future `packages/business`) | `countries.ts`, `taxonomy.ts`, `labels.ts`, `dial-codes.ts`, `business-types.ts`, `text.ts`, `format.ts`, `full-service.ts`, `social-links.ts`, `i18n/country.ts` | none (pure, no env) | `tests/unit/{countries,taxonomy,dial-codes,landing-country}.test.ts` unchanged; `typecheck` |
| 2 | **Pure rules** → `lib/core/rules/` | `launch-phase.ts` (signature `launchPhase(env = process.env)`), `founding.ts`, `price-stats.ts`, `auth/permissions.ts`, `auth/policy.ts`, `contracts/rules.ts`, `legal/clauses.ts`, `matching/{score,closeness,scope,describe-core}.ts`, `monetization/entitlements.ts`, `collab/{types,time,redact}.ts` | low; `entitlements.ts` imports `plans.ts` which imports `features.ts` (DB) — split the plan table (pure) from `getFeatures` | `registration-phase`, `founding*`, `price-stats`, `matching`, `closest`, `contracts`, `collab-rules`, `legal` unit tests |
| 3 | **Validation**: lift Zod schemas out of actions into `lib/validation/<domain>.ts`, starting with `portfolio-setup` (`profileSchema`, `clientSchema`, `projectSchema`, `behanceSchema`, `version`, `uuid`), then `account-schema`, `match-wizard-schema`, `collab/schemas`, `studio/actions.ts#profileSchema`, auth `loginSchema/joinSchema` | the action files above | low; behaviour identical, actions import the schema | new schema unit tests (valid/invalid fixtures); `tests/e2e/portfolio-setup.spec.ts`, `creator-setup.spec.ts` unchanged |
| 4 | **Error contract** (section 4.2) as pure code: `lib/api/errors.ts` with the code union, HTTP mapping and a `toApiError(SetupError | SocialError | "rateLimited" …)` adapter | new file | none | unit test for the mapping; `/api/match` and `/api/errors` adopt it behind the same JSON shape |
| 5 | **Translator decoupling in `lib/`**: change `import { createTranslator } from "next-intl"` to `use-intl` (same function, no Next dependency) in `matching/describe.ts`, `ai/fallback.ts`, `legal/document.ts`, `data/contract-notify.ts`; move the four `getTranslations` option builders (`form-options`, `studio-options`, `country-options`, `serves-note`) to accept `(locale, t)` with thin Next wrappers | 8 files | low; `use-intl` is already a transitive dependency of `next-intl` (make it explicit in `package.json` at that time) | `legal-pdf`, `ai-fallback`, `matching` unit tests; `messages.test.ts` |
| 6 | **Session core split**: `lib/auth/session-core.ts` with `hashToken`, `issueSession(userId, {mfaPending})` → `{token, expiresAt}`, `sessionUserByToken(token)`, `revokeToken`, `revokeAllForUser`; `lib/auth/session.ts` keeps the cookie binding and `cache()` and delegates | `lib/auth/session.ts` + new file | medium: touches every request; no schema change | `tests/unit/{accounts,account,client-accounts}.test.ts`; new unit tests for `sessionUserByToken` (expired, mfaPending, disabled, staffExpiresAt); roles e2e (`playwright.roles-https.config.ts`) |
| 7 | **Guards return decisions**: `authorizeAgency(user, agency)` / `authorizeStaff(user, permission)` returning `{ ok } | { deny: "unauthenticated" | "forbidden" | "mfa_enroll" | "wrong_role" }`; `requireAgency()` etc. become wrappers that redirect on `deny` | `lib/auth/guards.ts` | medium | `admin-console.test.ts`, role e2e; a new unit test on the decision table |
| 8 | **Request-context adapter**: `RequestContext` interface; Next implementation over `headers()/cookies()`; `clientIp`, `getVisitorId`, `currentCountry` (header name from config, default `x-vercel-ip-country`) read through it | `lib/request.ts`, `visitor.ts`, `country-choice.ts`, `demo-mode.ts` | low | existing tests; `landing-country.test.ts` |
| 9 | **Rate-limit store interface** (`MemoryStore` default; later Postgres/Upstash) | `lib/rate-limit.ts` | low | existing tests that call `resetRateLimits()` |
| 10 | **First `/api/v1` slice** (section 8) using 3–9 | new route handlers | medium | contract tests with Vitest against the handlers + a Playwright API project |

Do not start with `lib/data/*` moves: they are already server-only and framework-agnostic enough; moving 60 files buys nothing before an API exists.

---

## 4. API boundaries for a future mobile client

### 4.1 Candidate surface mapped onto what exists

Legend — Auth: `session` = any valid non-pending session (bearer in future); `agency` = session whose user owns an active agency (`getCurrentAgency`); `staff(p)` = `adminAccess(...,p) === "ok"`. Phase: gate from `lib/launch-phase.ts` / `lib/feature-gate.ts`. "Exists" = any form today (server action, route, data fn).

| Surface | Existing code | Auth | Launch-phase gate | Never leak | Exists today |
|---|---|---|---|---|---|
| `POST /api/v1/auth/login`, `/mfa/verify`, `/logout`, `/logout-all` | `(auth)/actions.ts#login/verifyLogin/logout`; `security-actions.ts`; `lib/auth/session.ts`, `mfa.ts` | none / pending / session | none | password hashes, TOTP secrets, backup-code hashes, other users' session ids | as actions only |
| `POST /api/v1/auth/code` (email code) | `signin-actions.ts`, `lib/auth/email-code.ts` | none | none | the code (only hash stored), whether an email exists (keep current neutral replies) | as actions |
| `GET /api/v1/me` | `getSessionUser()` + `getCurrentAgency()` + `mfaStatus()` | session | none | `email` only to self; never `passwordHash`, `totp*`, `invitedBy`, `staffExpiresAt` of others | implicit in layouts |
| `GET/PATCH /api/v1/profile` | `lib/data/agencies.ts#getAgencyByOwner/updateAgency`, `studio/actions.ts#updateProfileAction`, `portfolio-setup.ts#patchProfile` | agency | none (profile editing is open in registration) | `ownerUserId`, contact phone/WhatsApp of **other** agencies unless the public rules in `toSummary` allow; `pendingServices` review notes | yes (actions) |
| `GET/POST /api/v1/portfolio` (setup draft) | `lib/data/portfolio-setup.ts#getSetup/openSetup/writeSetup/publishSetup`, `portfolio-setup/actions.ts` | agency (owner) | none for upload source; `canUse("portfolio_import")` for pdf/behance; social source needs an approved provider | other agencies' drafts (always keyed by `agency.id`); staged media keys (`drafts/…`) — serve ids, never keys | yes (15 actions) |
| `GET /api/v1/projects`, `/projects/:id` | `lib/data/posts.ts#getAgencyPostsForOwner/getPost/updatePost/deletePost/togglePin` | agency for own; public read via `mayReadAgency` | public read: `canBrowseDirectory()` for lists; a single private/unlisted profile only to owner/staff (`canReadProfile`) | `portfolio/` storage keys when visibility is private; `clientId` of private clients; demo posts in registration phase | yes |
| `POST /api/v1/media` (multipart), `GET /api/v1/media/:id` | `addSetupMedia/removeSetupMedia/orderSetupMedia/readSetupMedia`; `/api/setup-media/[id]`, `/api/portfolio-media/[...key]` | agency owner | none | bytes of another agency (`mayReadAgencyId`), `drafts/` keys | yes (routes + actions) |
| `/api/v1/collaboration/*` | `lib/data/collab-*.ts`, `studio/collab/*/actions.ts` (36 actions) | agency | `collaboration` is a DISCOVERY feature: off in registration unless staff/pilot | redacted fields per `lib/collab/redact.ts`; counterpart contact data before acceptance | yes (actions) |
| `/api/v1/messages` | `lib/data/conversations.ts#listMessages/sendMessage/markRead`, `/api/conversations/[id]/messages`, `lib/chat-access.ts#resolveParticipant` | agency **or** client token/visitor | `messaging` DISCOVERY feature | hidden messages (`setMessageHidden`), client visitor ids, email/phone inside params | yes (route GET, action POST) |
| `/api/v1/notifications`, `/count`, `/read` | `lib/data/notifications.ts#listNotifications/unreadNotificationCount/markNotificationsRead`; `/api/notifications/count` | agency or visitor recipient | none | notifications of another recipient (always filter by `Recipient`) | yes |
| `/api/v1/search` | `lib/data/agencies.ts#listAgencies`, `lib/data/hire.ts`, `lib/matching/*`, `/api/match` | public | `canBrowseDirectory()` (registration: staff/pilot only); `ai_matchmaker` gate | private/unlisted profiles (`discoverableProfiles()`), demo agencies unless demo mode | yes |
| `/api/v1/social/connect`, `/callback`, `/resources`, `/items` | `lib/data/social.ts#startAttempt/consumeAttempt/completeAttempt/confirmResources/browseItems/disconnectGrant`, `/api/social/callback/[provider]` | agency; callback bound to session id | provider readiness (`SOCIAL_PROVIDERS_APPROVED`) | access/refresh tokens (sealed with `SOCIAL_TOKEN_KEY`), provider subjects of other users | yes |
| `/api/v1/contracts/*` | `lib/data/contracts.ts` (≈50 fns), `contract-actions.ts` (29), `/api/legal`, `/api/receipts` | agency party, client token, staff(`escrow.resolve`) | TRANSACTION feature: only when `LAUNCH_PHASE=full` **and** `contracts` switch on | `clientTokenEnc`, client email/phone, IP hashes, escrow ledger of other parties | yes, web-only; **not** a mobile candidate before the full phase |

Recommendation: implement now only what the first slice needs (section 8): `auth/login`, `auth/logout`, `me`, `portfolio` (draft read/write/publish), `media` (upload/read/remove/order), and reuse `/api/version`. Everything else stays as server actions until a second slice justifies it.

### 4.2 Typed error contract

Shape (every non-2xx JSON response, and every `{ error }` result returned to a client):

```ts
type ApiError = {
  error: {
    code: "unauthenticated" | "mfa_required" | "forbidden" | "not_found" | "invalid"
        | "stale" | "conflict" | "rate_limited" | "unavailable" | "upgrade_required" | "internal";
    reason?: string;                   // machine detail, e.g. SetupError "noServices", "tooMany"
    fields?: { path: string; issue: string }[]; // Zod issues, paths only (never values)
    retryAfter?: number;               // seconds, with rate_limited
  };
};
```

HTTP mapping: `unauthenticated` 401 · `mfa_required` 401 · `forbidden` 403 · `not_found` 404 (also used instead of 403 where the web already answers 404 to avoid existence leaks, e.g. media routes) · `invalid` 400 · `stale`/`conflict` 409 · `rate_limited` 429 · `unavailable` 404 or 503 (`reason: "feature_off" | "phase"`) · `upgrade_required` 426 · `internal` 500. Existing unions (`SetupError`, `SocialError`, `"rateLimited"` from `/api/match`) map into `reason` so no message text leaves the server; clients translate `code`+`reason` from `packages/i18n`.

Versioning rule: path-versioned (`/api/v1`). Within v1 changes are additive only (new optional fields, new endpoints); removals or type changes open `/api/v2` alongside. Clients send `X-Sawwiq-Client: ios/1.2.0 (build)`; the server may answer `upgrade_required`. `/api/version` already publishes `revision`, `commit`, `environment`, `launchPhase` and is the handshake endpoint.

---

## 5. Auth strategy for native (design only; no migration now)

Web keeps the DB-backed cookie session exactly as it is. The native path reuses the **same `sessions` table and the same code** after the split in step 6:

| Concern | Design | What `sessions` already supports |
|---|---|---|
| Token | opaque 32-byte random token, sent as `Authorization: Bearer <token>`; stored as `sha256(token)` in `sessions.id` — identical to the cookie token | yes (`id` is already the hash; raw token never stored) |
| Issuance | `POST /api/v1/auth/login` → `issueSession()` returns `{ token, expiresAt, mfaPending }` instead of setting a cookie | yes (`createSession` minus the cookie line) |
| MFA | staff get an `mfaPending` row (10 min); `POST /auth/mfa/verify` with the pending bearer calls `verifySecondFactor` then `completeMfaSession` semantics (revoke pending, issue full) | yes (`mfaPending`, `getPendingMfaUser` logic) |
| Resolution | `sessionUserByToken(token)` applies the same filters: `expiresAt > now`, `mfaPending = false`, `accountActive()` (disabled users and expired staff lose access on the next call, no push revocation needed) | yes |
| Rotation | on `POST /auth/refresh` when `expiresAt - now < 7 days`: insert new row, delete old, return new token; 30-day absolute life stays | needs only code |
| Revocation | `DELETE /auth/logout` deletes the row; `/auth/logout-all` = `destroyAllSessions(userId)` (also triggered today by password change, deactivation, admin MFA reset) | yes |
| Device labels / last seen | **later**: nullable `kind` (`web`/`ios`/`android`), `deviceName`, `lastSeenAt` columns so Security can list devices; not part of this plan's first steps | no (needs a migration, deferred) |
| Device storage | `expo-secure-store` (iOS Keychain, Android Keystore); never AsyncStorage; token cleared on 401 `unauthenticated` | n/a |
| Authorization | unchanged and server-side: `adminAccess()`, `can()`, ownership checks inside `lib/data/*` (every function takes `agencyId`), `mayReadAgency`, launch-phase and feature gates. The client never receives a permission matrix it can act on; it receives decisions | yes |
| CSRF | bearer requests are not cookie-authenticated, so the cookie CSRF model (SameSite lax + action origin checks) does not apply; the handlers must **not** fall back to cookies when a bearer header is present | code rule |
| Rate limits | same `rateLimit` keys by user id / IP (step 9 makes the store shared) | yes |
| Account disabling | `users.disabledAt` is honoured at every resolution; no extra work | yes |

Social connections (`lib/social/*`): OAuth must keep happening in a system browser (`expo-web-browser` / `AuthSession`), never a WebView, because `callbackUrl()` is fixed per provider from `SITE_URL` and registered in the provider consoles. Flow: app calls `POST /api/v1/social/connect` (bearer) → `startAttempt({ sessionId: <bearer hash>, returnTo: "app" })` → opens the provider URL → provider returns to `/api/social/callback/[provider]` on the web host → `consumeAttempt(provider, state, sessionId, userId)` must accept the attempt's **stored** session id instead of reading the cookie (the state is already single-use and bound to session + user) → the callback redirects to a universal/app link (`https://sawwiq.org/ar/studio/connections?social=choose&grant=…` associated to the app via AASA / Android App Links, with an `sawwiq://` scheme fallback) → the app finishes with `confirmResources`. Tokens stay sealed server-side (`SOCIAL_TOKEN_KEY`); the app never sees provider tokens. Meta deauthorize/delete callbacks are unaffected.

Explicitly: no migration happens now; cookies remain the only path until step 6 and the first slice land; server-side authorization remains authoritative for both clients.

---

## 6. PWA plan

### 6.1 Manifest audit (`app/manifest.ts`)

| Field | Today | Finding |
|---|---|---|
| `name/short_name/lang/dir` | Arabic, `rtl` | fine |
| `start_url` | `/ar` | fine (front page is the landing per owner decision); `/` would let `proxy.ts` honour the saved language |
| `display` | `standalone` | fine; consider `display_override: ["standalone","minimal-ui"]` |
| `theme_color` / `background_color` | `#0e6b46` / `#f2f2ed` | matches brand green `primary`; no `viewport.themeColor` export found in `app/[locale]/layout.tsx`, so the browser bar colour outside the installed app is not declared |
| `shortcuts` | committed (`HEAD`, 7f06c0d): `/ar/hire`, `/ar/match`, `/ar/explore`; this branch: `isRegistrationPhase()` ? `/ar/join` + `/ar/examples` : the three above, plus `id` and `scope` | the committed targets **all call `requireDirectory()` and redirect to `/soon` during `LAUNCH_PHASE=registration`**; this branch fixes exactly that (its `/ar/join` and `/ar/examples` targets are open in registration). Remaining gap: a signed-in provider gets no shortcut to `/ar/portfolio-setup` or `/ar/studio` — shortcuts cannot be per-user, so keep them public |
| `icons` | `/brand/mark-192.png`, `/brand/mark-512.png` (RGBA) | no `purpose: "maskable"` icon; `app/icon.png` and `app/apple-icon.png` exist for favicon/apple-touch |
| missing | `id`, `scope`, `screenshots`, `categories` | `id: "/ar"` keeps identity stable if `start_url` changes later |
| installability | manifest + icons + HTTPS present; **no service worker exists** (no `serviceWorker`, `web-push` or `PushManager` references in `app/`, `components/`, `public/`) | Chrome no longer requires a SW for install, but offline fallback and update UX need one |

### 6.2 What is safe now vs. what needs review

Safe now (manifest only, no runtime behaviour), done on this branch: the phase-aware shortcuts in `app/manifest.ts` (join + examples in registration; `manifest.ts` runs on the server, so reading `isRegistrationPhase()` is fine); add `id`, `scope: "/"`, a maskable 512 icon, `categories`; add `viewport.themeColor` in the locale layout. Proof: a `tests/unit` snapshot of `manifest()` under `LAUNCH_PHASE=registration` and `full` (the vitest config pins `LAUNCH_PHASE: "full"`, so the test must set the env per case); Lighthouse PWA check in CI is optional.

Needs review (service worker): a Workbox-style worker is a new trust boundary. Rules it must obey, derived from the routes above:

| Request class | Strategy | Why |
|---|---|---|
| `/_next/static/**`, `/brand/**`, `/fonts/**`, `/engines/**` | cache-first, versioned by build hash | immutable |
| `/media/**` (public bucket, `cacheControl: 31536000`) | stale-while-revalidate, capped | public portfolio images only |
| `/api/portfolio-media/**`, `/api/setup-media/**`, `/api/collab/assets/**`, `/api/legal/**`, `/api/receipts/**` | **never cached** (network-only); responses already carry `private, no-store` | access-checked per request; a cache would outlive logout |
| any `/api/**` JSON, future `/api/v1/**`, any Supabase storage URL, any response with `Set-Cookie`, `Cache-Control: private|no-store` or `Vary: Cookie` | network-only | private data |
| HTML navigations | network-first; on failure serve `/<locale>/offline` **only** for unauthenticated routes; never store HTML that was rendered with a session cookie | RSC payloads embed per-user data |
| Server actions (`POST` with `Next-Action`), `/api/match`, `/api/track`, `/api/errors` | pass-through, no background sync | mutations and analytics |

Offline fallback: a static `/[locale]/offline` page in both locales with no data fetch. Update behaviour: no `skipWaiting` on install; poll `/api/version` (already `no-store`) and show "update available" → `registration.update()` + reload on tap. Push readiness: not before M3 — needs a VAPID key pair, a `push_subscriptions` table (user/agency, endpoint, keys, user agent, consent version per docs/08), a fan-out from `addNotifications`, and an opt-in UI; notifications today are polled once a minute (`components/notifications/header-bell.tsx`).

---

## 7. Expo / React Native strategy

- Expo (managed workflow, EAS Build) + TypeScript, iOS and Android from one codebase; `expo-router` for screens, `expo-secure-store` for the session token, `expo-image-picker`/`expo-file-system` for uploads, `expo-web-browser` for OAuth, `expo-notifications` later. RTL first: `I18nManager.forceRTL` decided from the saved language, Arabic as default, mirroring `i18n/languages.ts`.
- Native advantages worth the cost: camera/gallery multi-select with on-device compression (today the web vendors ffmpeg.wasm, `scripts/vendor-engines.mjs`), resumable uploads on bad networks (the draft model in `portfolio-setup.ts` with `version` already tolerates retries), push notifications, Keychain-held sessions, share-sheet targets for publishing work from Instagram/TikTok.
- When to start: **only after one vertical slice's `/api/v1` exists and is covered by contract tests** (M2 exit). Starting earlier would force the app to scrape server-action endpoints, which Next does not version.
- Shared: `packages/{types,validation,business,api,auth-contracts,i18n,config}` — DTOs, Zod schemas (client-side validation identical to the server), `SetupError` codes, country/service catalogs, permission names, message JSON.
- Not shared: React components, Tailwind/shadcn styles, `next-intl` hooks, server actions, `components/setup/wizard.tsx` (694 lines of web form state), anything importing `lib/db` or `sharp`.

---

## 8. First mobile vertical slice

Candidates evaluated against the code:

| Candidate | What it exercises | Code reality | Verdict |
|---|---|---|---|
| **A. Provider sign-in → profile → portfolio setup → private image upload → reload/resume → preview → save → owner access** | bearer auth, `/me`, multipart upload, private media, optimistic-version writes, publish transaction, visibility rules | `lib/data/portfolio-setup.ts` already takes explicit `agencyId/userId/version`, returns `SetupView` (serialisable), has pure `missingForPublish`, stale/duplicate handling, and is unit-tested on PGlite (`tests/unit/portfolio-setup.test.ts`) and e2e (`tests/e2e/portfolio-setup.spec.ts`). The action layer (`portfolio-setup/actions.ts`) is thin: `requireAgency` + Zod + call. Only couplings: `getTranslations` for `personalLabel` in `publishSetupAction`; `canUse("portfolio_import")` for pdf/behance; `revalidatePath`. Open in the registration phase by design (docs/51, 53). | **recommended** |
| B. Notifications / messages | polling, recipients, read cursors | `Recipient` is `{agencyId}|{visitorId}` and client-side chat relies on the visitor cookie or request token (`lib/chat-access.ts`); `messaging` is a DISCOVERY feature, off in registration except staff/pilots; nothing to show real providers today | later |
| C. Examples browsing | public read, pagination | `lib/data/setup-examples.ts` is 48 lines and public; the directory itself is closed by `requireDirectory()` in registration; proves neither auth nor media | too thin |

Recommended slice A, scoped to the upload source (no pdf/Behance/social in v1):

1. `POST /api/v1/auth/login` (password; `lib/auth/password.ts` + `issueSession`) and `/logout`; staff MFA excluded from the mobile beta (provider accounts do not require 2FA).
2. `GET /api/v1/me` → `{ user: {id, role, mfaEnabled}, agency: toSummary + owner fields, setup: getSetup() }`.
3. `PATCH /api/v1/profile` → `patchProfile(agency, {name, bio, services, avatar}, {version, userId})` with the lifted `profileSchema`; `resolveServices` unchanged.
4. `POST /api/v1/portfolio/open` → `openSetup`; `PATCH /api/v1/portfolio` → `writeSetup(agencyId, version, change)` for source/client/project steps using lifted `clientSchema`/`projectSchema`; `addClientOnce` for a new client.
5. `POST /api/v1/media` (multipart, ≤ `MAX_IMAGES_PER_POST`) → `addSetupMedia`; `DELETE /media/:id` → `removeSetupMedia`; `PUT /media/order` → `orderSetupMedia`; `GET /media/:id` → `readSetupMedia` with bearer (mirrors `/api/setup-media/[id]`, `private, no-store`).
6. Reload/resume is free: `GET /me` returns `step`, `version`, `data`, `media` from the server; a stale `version` yields `409 stale` with the fresh view.
7. Preview: client runs `missingForPublish(view)` from `packages/business` (same function the server runs).
8. `POST /api/v1/portfolio/publish { version, rights }` → `publishSetup` with `personalLabel` taken from `messages/<contentLang>.json` on the server without `next-intl` (step 5 of section 3).
9. Owner access: `GET /api/v1/projects/:id` → `getPost` + `mayReadAgency`; images via `/api/portfolio-media/**` with bearer → `mayReadAgencyId` (private visibility → owner only; staff → audited later).

Why A: it is the only flow that is both open in the current launch phase and already engineered as a resumable, versioned server-side state machine; it touches every cross-cutting concern the native client needs (auth, private media, conflicts, gating) with the smallest surface (≈9 endpoints), and its tests exist.

---

## 9. Hosting portability

| Coupling | Where | Class | Adapter / what another host needs |
|---|---|---|---|
| `buildCommand: npm run db:migrate && npm run build` | `vercel.json` | replaceable | any CI step before deploy; `.github/workflows/maintenance.yml` already runs `db:migrate` outside Vercel |
| `regions: ["lhr1"]` | `vercel.json`, docs/27 | accidental (latency to Supabase eu-west-2) | pick the host region near the DB; no code |
| Cron schedules | `vercel.json` → `/api/cron/*` | replaceable | any scheduler that can send `Authorization: Bearer $CRON_SECRET` (GitHub Actions `schedule`, systemd timer, Cloud Scheduler); the handlers are host-neutral |
| `maxDuration = 60` | `app/api/cron/retention/route.ts` | accidental | ignored elsewhere; keep as documentation of the job's budget |
| `process.env.VERCEL` selects node-postgres + `attachDatabasePool` from `@vercel/functions` + pooler port rewrite 5432→6543 | `lib/db/index.ts`, `lib/db/pg-pool.ts` | **essential** (production DB path; do not touch) | future adapter: `DB_DRIVER=pg|postgres-js` and `DB_POOLER_PORT` env defaulting to today's behaviour when `VERCEL` is set; `attachDatabasePool` behind `try { await import("@vercel/functions") }`. Only after a staging test against a non-prod database |
| `x-vercel-ip-country` | `lib/country-choice.ts` | replaceable | `GEO_COUNTRY_HEADER` config (Cloudflare `cf-ipcountry`, Fly `fly-client-ip` + lookup); default unchanged |
| `VERCEL_PROJECT_PRODUCTION_URL` fallback | `lib/site.ts` | accidental | `NEXT_PUBLIC_SITE_URL` is already primary; set it on any host |
| `VERCEL_GIT_COMMIT_SHA`, `VERCEL_ENV` | `lib/release.ts` | accidental | `GITHUB_SHA` fallback exists; add `APP_ENV` |
| `outputFileTracingIncludes` for `public/fonts` | `next.config.ts` | replaceable | OpenNext honours tracing; a plain `next start` host has the files anyway |
| `images.remotePatterns` for Supabase; 10 `next/image` users | `next.config.ts`, components | replaceable | self-hosted `next start` optimises with `sharp` (already a dependency); OpenNext needs its image handler; or `unoptimized` for the Supabase host |
| In-memory `rateLimit` | `lib/rate-limit.ts` | accidental | per-instance on every serverless host; step 9 store interface |
| `serverActions.bodySizeLimit: "60mb"` | `next.config.ts` | replaceable | check the new host's request-body ceiling; uploads rely on client-side compression (`lib/media`, `public/engines/ffmpeg`) |
| `scripts/vercel-admin.mjs`, `.github/workflows/vercel.yml` | tooling | accidental | replaced by the new host's CLI; not runtime |
| `instrumentation.ts` (`NEXT_RUNTIME === "nodejs"`) | generic Next | none | works on any Node host |
| `x-forwarded-for/host` handling | `lib/request.ts`, `proxy.ts` | generic | ensure the proxy sets them |

A Node host (`next start` behind a reverse proxy) or an OpenNext target (AWS Lambda, Cloudflare via OpenNext adapters) therefore needs: `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` + an external scheduler, a region near Supabase, persistent-process-aware DB pooling (the postgres-js branch of `lib/db/index.ts` already exists for non-Vercel), and a decision on image optimisation. The production `DATABASE_URL`, pooler mode and driver choice are not part of this roadmap and must be validated separately on staging before any change.

---

## 10. Dependency strategy

Keep the runtime surface small and framework-light: everything that moves into `packages/*` may depend only on `zod` and the TypeScript standard library (plus `use-intl` for message formatting where unavoidable); `server/*` may add `drizzle-orm`, `pg`/`postgres`, `sharp`, `@supabase/supabase-js`, `jose`, `qrcode`, provider SDKs; `apps/web` owns `next`, `react`, `next-intl`, shadcn/Base UI, Tailwind, `@ffmpeg/*`, `pdfjs-dist`, `tesseract.js`, `modern-screenshot`; `apps/mobile` owns Expo packages and must never import `next-intl`, `server-only` or anything from `server/*`. Native modules (`sharp`, `pg`, `@electric-sql/pglite`) stay server-only; `@vercel/functions` stays an optional dynamic import. The detailed per-package audit (versions, duplicates such as `pg` + `postgres`, `cn`, `shadcn` as a runtime dependency, upgrade risks) is in `docs/architecture/dependency-audit.md`.

---

## 11. Risks and milestones

Highest-risk couplings: (1) cookie-bound session issuance and redirect-based guards (`lib/auth/session.ts`, `guards.ts`) — every request path depends on them; (2) the Vercel-specific production database path (`lib/db/index.ts`) — a wrong "portability" change breaks production, so it is explicitly out of scope; (3) ~193 server actions as the only mutation surface, with FormData parsing, `revalidatePath` and `next-intl` calls inline (e.g. `publishSetupAction`), plus `next-intl` inside `lib/` business code — the mobile API must not re-implement these rules twice.

Other risks: per-instance rate limiting; `mayReadAgency` reading cookies inside a data module (a bearer path would silently see "anonymous"); service worker caching private media; OAuth state bound to the cookie session id; the demo/registration visibility rules duplicated between `publication.ts` and `launch-access.ts`.

| Milestone | Scope | Exit criterion |
|---|---|---|
| **M0 — now** | this document; manifest fixes (phase-aware shortcuts, `id`, `scope`, `viewport.themeColor` — done on this branch; maskable icon still to draw); boundary test (step 0, `tests/unit/boundaries.test.ts` — done); error-contract module (step 4, `lib/api/errors.ts` — done, not yet adopted by a route) | `npm run lint && typecheck && test` green; installed PWA shortcuts open real pages in the registration phase |
| **M1 — shared brains** | steps 1–3 and 5: catalogs, pure rules, lifted Zod schemas, `use-intl` in `lib/`; shims keep old imports | boundary test covers ≥ 30 files; no `next-intl` import remains under `lib/` except Next wrappers; all existing unit + e2e suites unchanged and green |
| **M2 — API slice** | steps 6–10: session core, decision guards, request-context adapter, rate-limit store, `/api/v1` for slice A with bearer auth and contract tests; staging only | Playwright API project completes sign-in → upload → reload → publish → owner-only media with a bearer token; web cookie flows unchanged (roles e2e green); zero changes to `lib/db/index.ts` |
| **M3 — Expo prototype** | Expo app implementing slice A against staging; secure-store sessions; RTL; `upgrade_required` handling; SW review decision for the web PWA | one provider completes the slice on a physical iOS and Android device; private media returns 404 without a token; logout-all revokes the device |
| **M4 — native beta** | TestFlight / internal track; notifications list + count via `/api/v1/notifications`; crash and error reporting into `recordError`; push design (not launch) | 20 pilot providers; no P1 auth or privacy finding; API error budget met for two weeks; decision on push and on the second slice (messages or collaboration) once `LAUNCH_PHASE` leaves registration |
