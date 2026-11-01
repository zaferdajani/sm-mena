# Performance audit

This is a Next.js 16 App Router app with React Server Components, Drizzle, PostgreSQL (or local PGlite), and server actions. Preserve permission checks and private media caching boundaries. No hosting configuration, live database, environment files, paid services, or dependencies were changed.

| # | Item | Status | Reason |
|---|---|---|---|
| 1 | Skeleton loaders | Applied | Localized main-route loading boundary preserves navigation, reserves space, and respects reduced motion. |
| 2 | WebP/AVIF images | Already in place | `lib/images.ts` produces size-bounded WebP uploads and thumbnails; public artwork already uses WebP. |
| 3 | Dedupe API calls | Applied | Header/sidebar bells share pending count requests, with no retained response cache; server session and bell reads already use React cache. |
| 4 | Debounce search | Not applicable | Explore searches submit a form; service-picker suggestions search local data, so neither triggers an API call per keystroke. |
| 5 | Paginate API results | Already in place | Feed uses cursors and bounded page sizes; directory and notification queries use limits. |
| 6 | CDN for static files | Recommended (infra) | Verify delivery of immutable public media and Next assets through the existing host's CDN before adding infrastructure. |
| 7 | Background jobs | Already in place | Existing cron routes handle retention, matching, Google refreshes, and milestones; media engines load on demand. |
| 8 | N+1 queries | Already in place | Feed `attachImages` batches post images and clients with IN queries; no per-card image query. |
| 9 | Brotli/gzip | Recommended (infra) | Verify deployed Content-Encoding for JS/CSS/HTML; compression defaults in the framework do not establish proxy behavior. |
| 10 | Free caching | Already in place | Feature switches and service tags have short in-memory TTLs; sessions use request-scoped React cache. |
| 11 | Remove unused dependencies | Not applicable | No dependency was removed; no clearly unused package was established during this scoped audit. |
| 12 | External API timeouts | Applied | Added 10-second abort signals to notification and sign-in/reset email fetches; social, Google, payment and AI clients already have deadlines. |
| 13 | Stream AI responses | Not applicable | Matchmaker returns structured tool results and validated recommendations; changing its response protocol is outside a low-risk performance patch. |
| 14 | Optimistic UI | Already in place | Post likes and saves use React useOptimistic with server reconciliation. |
| 15 | Lazy-load images | Applied | Added native lazy loading and async decoding to feed client logos and showcase images; Next Image already lazily loads non-priority feed media. |
| 16 | Parallel independent requests | Applied | Post image/client reads and studio client-list/overview reads run together; header session and recipient reads also run together. |
| 17 | Database indexes | Already in place | Schema/migrations already cover feeds, agency services, images, notifications and common foreign-key lookups; no speculative migration added. |
| 18 | Trace slow requests | Recommended (infra) | Existing instrumentation records failures, not latency; use host request timings and local profiling to identify slow routes before adding tracing infrastructure. |
| 19 | Servers near DB | Recommended (infra) | Verify runtime and PostgreSQL regions together; no deploy-region changes made. |
| 20 | SSR/static rendering | Already in place | Pages use Server Components; locales have static params; data-driven pages retain their runtime permission checks. |
| 21 | Defer third-party scripts | Not applicable | No global third-party script loader found; theme/bootstrap scripts are first-party and must run early to prevent visual flashes. |
| 22 | Route/code splitting | Applied | App Router already splits routes; optional help-chat voice/video fields now use next/dynamic and load when rendered. |
| 23 | Virtualize long lists | Not applicable | Existing paginated feeds retain carousel state and mobile scroll snapping; virtualization needs measurement and dedicated interaction work. |
| 24 | Select needed columns | Applied | Publication lookup selects visibility only; analytics and client summaries already project explicit fields. |
| 25 | Connection pooling | Already in place | Singleton DB clients use bounded pools; serverless PostgreSQL has connection/query deadlines and transaction-pooler handling. |
| 26 | Avoid extra re-renders | Already in place | Feed callbacks and service-picker suggestions already use useCallback/useMemo; no broad speculative memoization. |
| 27 | Browser caching headers | Already in place | Public media has one-year immutable caching; portfolio/support/setup media intentionally retain private/no-store behavior. |
| 28 | Load balancing | Recommended (infra) | Measure production concurrency and pool saturation before changing the host's scaling or balancing. |
| 29 | Self-host fonts/limit weights | Already in place | next/font self-hosts one variable Arabic/Latin family with swap; variable weights avoid separate static-weight downloads. |
| 30 | Free real-user monitoring | Applied | Stable next/web-vitals callback logs only metric name, value and rating to browser console, with no endpoint or dependency added. |
| 31 | Slow devices/networks | Applied | Added a production Playwright mobile smoke check with 4x CPU throttling, 150ms latency and limited throughput; execution is blocked by sandbox port permissions. |

## What's left

- Verify infrastructure recommendations against the deployed service: CDN hit rate, compression, region proximity, request latency, scaling and database connection limits. No Redis or paid monitoring is required.
- Run `npm run build` then `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npx playwright test -c playwright.performance.config.ts` for the isolated slow-mobile check. Its server overrides DATABASE_URL and uses in-memory PGlite; it never connects to a live database or submits an email.
- Profile feed scrolling with many loaded pages before considering virtualization. Review less common permission-filtered/admin queries with local EXPLAIN before proposing further indexes; any future indexes belong in new migration files only.
- Web Vitals are intentionally console-only. Capture representative mobile sessions (LCP, INP, CLS, TTFB) before claiming a measured performance improvement.
- The repository contains a much larger seeded end-to-end suite (`npm run e2e`); the focused performance check does not replace it.

## Validation

- `npm run typecheck`: passed, including the new Playwright configuration and test.
- `npm run lint`: passed with no warnings or errors.
- Focused regression runs: 38 tests passed across notification-count, registration-phase, support-notify, portfolio-payload, work-orders and collab-r3.
- `git diff --check`: passed.
- `npm run build`: baseline Turbopack build was killed; retry did not complete. `npm run build -- --webpack` fails with `Could not parse output from TypeScript's --showConfig` on both the modified tree and an untouched `git archive HEAD` copy. The shell has Node 20.19.2; package.json requires Node >=22. No build workaround or hosting config change was committed.
- Slow-mobile Playwright test discovery passed. Execution is blocked: the sandbox denies local server binds (`listen EPERM` on port 3115), including a development-server fallback. Run the production test outside this sandbox after a successful build; mobile performance has not been measured here.
- Git commits are blocked because `.git` is mounted read-only (`Unable to create .git/index.lock: Read-only file system`). Changes remain in the working tree; no push or remote operation was attempted.

- Full unit suite: **113 files / 674 tests passed**, run in two groups to limit resource use: 110 files / 662 tests with two workers, followed by `seed.test.ts`, `demo-text-refresh.test.ts` and `ai-providers.test.ts` with one worker (3 files / 12 tests). Commands: `npm test -- --maxWorkers=2 --exclude '**/seed.test.ts' --exclude '**/demo-text-refresh.test.ts' --exclude '**/ai-providers.test.ts'` and `npx vitest run tests/unit/seed.test.ts tests/unit/demo-text-refresh.test.ts tests/unit/ai-providers.test.ts --maxWorkers=1`.

No live migrations or deploy commands are part of validation.
