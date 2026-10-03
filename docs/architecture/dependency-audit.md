# Dependency audit

Branch `feat/early-access-campaign`, `package.json` as of 2026-10-01. Read-only audit: import
graph by ripgrep over `app/`, `components/`, `lib/`, `i18n/`, `scripts/`, `tests/` and the
config files; bundle evidence from the `.next/` output of the 30 Sep build
(`BUILD_ID 4sc1EIxix7nxeXIIQvjhi`, Turbopack). That output was replaced by a concurrent
`next build` during the audit, so chunk ids below belong to that earlier build.

"Imported in" counts files that `import`/`require` the package (type-only imports included and
marked). `tests/` files are counted separately so runtime use is visible.

Classifications: **1** required runtime · **2** required dev/test · **3** feature-specific ·
**4** candidate for lazy loading · **5** candidate for replacement · **6** apparently unused
(verify before removal).

## 1. Required runtime

| Package | Range | Installed | Imported in | Notes |
|---|---|---|---|---|
| next | 16.3.6 | 16.3.6 | 127 files | Framework. `next.config.ts`, `proxy.ts`, `instrumentation.ts`. |
| react | 19.2.8 | 19.2.8 | 113 files | |
| react-dom | 19.2.8 | 19.2.8 | 1 file (`components/submit-button.tsx`, `useFormStatus`) + Next peer | |
| next-intl | ^4.14.6 | 4.14.6 | 283 files; `next.config.ts` plugin; `proxy.ts` middleware | i18n backbone (ar default, RTL). |
| drizzle-orm | ^0.45.3 | 0.45.3 | 117 files | Three drivers selected at run time in `lib/db/index.ts` (`node-postgres`, `postgres-js`, `pglite`). |
| zod | ^4.6.5 | 4.6.5 | 47 files, none `"use client"` | Input validation (`lib/env.ts`, actions). Server-side only today. |
| @base-ui/react | ^1.8.0 | 1.8.0 | 11 files (`components/ui/*`, `app/[locale]/layout.tsx` DirectionProvider) | shadcn "base-nova" primitives. |
| lucide-react | ^1.47.0 | 1.47.0 | 151 files | Icons; named imports, tree-shaken. |
| class-variance-authority | ^0.7.1 | 0.7.1 | 3 files (`components/ui/{button,badge,tabs}.tsx`) | |
| cn | ^0.4.0 | 0.4.0 | 13 files (`components/ui/*` ×12, `lib/utils.ts` re-export) | shadcn's compiled clsx+tailwind-merge (`node_modules/cn/package.json`, repo `shadcn-ui/cn`). Runtime, client bundle. See §4. |
| server-only | ^0.0.1 | 0.0.1 | 83 files (`lib/**`, `components/collab/options.ts`, `app/.../studio/collab/gate.ts`) | Build-time guard. Stubbed in Vitest via `vitest.config.mts` alias → `tests/unit/server-only-stub.ts`. |
| tailwindcss | ^4 (dev) | 4.x | `app/globals.css:1` | Listed in devDependencies; needed at build only, correct placement. |
| tw-animate-css | ^1.4.0 | 1.4.0 | `app/globals.css:2` | Provides `animate-in/out`, `fade-*`, `zoom-*`, `slide-in-from-*` used in `components/ui/dialog.tsx` and `components/ui/dropdown-menu.tsx` (34 class occurrences). Used. |
| shadcn | ^4.21.0 | 4.21.0 | `app/globals.css:3` (`@import "shadcn/tailwind.css"` → `node_modules/shadcn/dist/tailwind.css`, 16 KB of `@theme` keyframes/utilities) | The CLI package; only its CSS export is consumed at build time. No JS import anywhere. See §4. |
| country-flag-emoji-polyfill | ^0.1.10 | 0.1.10 | 1 file `components/flag-polyfill.tsx` (client, mounted in `app/[locale]/layout.tsx:10`) | Loads `/fonts/TwemojiCountryFlags.woff2` (present in `public/fonts/`) only where flags do not render (Windows). Small; appears in shared layout chunk `2xrv8brlwqxfj` (29 KB total, mostly lucide/layout code). |
| postgres | ^3.4.9 | 3.4.9 | `lib/db/index.ts:72` (dynamic), `lib/db/migrate.ts:7` (dynamic), `lib/db/{db-activity,traffic-breakdown,pooler-check}.ts` (static, maintenance scripts) | postgres.js. Runtime driver **off Vercel** when `DATABASE_URL` is set, and for migrations everywhere. See §4. |
| pg | ^8.23.0 | 8.23.0 | `lib/db/index.ts:60` (dynamic), `lib/db/pg-pool.ts` (type), `lib/db/pooler-check.ts:5`, `tests/postgres/collab-ai-usage.pgtest.ts` | node-postgres. Runtime driver **on Vercel** (`process.env.VERCEL`). See §4. |
| @vercel/functions | ^3.9.9 | 3.9.9 | `lib/db/index.ts:62` (dynamic, Vercel branch only) | `attachDatabasePool`. |
| @electric-sql/pglite | ^0.5.8 | 0.5.8 | `lib/db/index.ts:85` (dynamic, no `DATABASE_URL`) | Default local/test database (CLAUDE.md non-negotiable). `serverExternalPackages` in `next.config.ts`. Required for the no-credentials run, so runtime, not dev-only. |
| sharp | ^0.35.4 | 0.35.4 | `lib/images.ts:2`, `lib/db/demo-images.ts:2` (static); 10 test files | Image pipeline for every upload (`lib/data/posts.ts`, `lib/data/portfolio-setup.ts`, `lib/behance/import.ts`, studio/admin actions). Node-only, `serverExternalPackages`. Never imported from a client file. |
| jose | ^6.2.12 | 6.2.12 | `lib/social/adapters/google.ts:2`; `tests/unit/social-connections.test.ts` | Google ID-token verification (JWKS). Server-only module. |

## 2. Required dev/test

| Package | Range | Used by | Notes |
|---|---|---|---|
| @playwright/test | ^1.63.0 | 3 configs (`playwright*.config.ts`), 53 `tests/e2e/*.spec.ts`, 2 `tests/registration/*.spec.ts`, `tests/live/setup-journey.mjs` | |
| vitest | ^5.0.1 | `vitest.config.mts`, 80 `tests/unit/*.test.ts`, `tests/postgres/*` | |
| typescript | ^5 | `npm run typecheck` | |
| tsx | ^4.23.15 | `package.json` scripts (`db:*`, `ai:eval`, `i18n:translate`, `seo:check`), `.github/workflows/maintenance.yml:67-76`, `site-check.yml:33` | Also used by Vercel build (`vercel.json` runs `npm run db:migrate`), so it must be installed in CI/Vercel; devDependency is fine because Vercel installs dev deps. |
| drizzle-kit | ^0.31.11 | `drizzle.config.ts:1`, `db:generate`, `db:studio` | |
| eslint, eslint-config-next | ^9 / 16.3.6 | `eslint.config.mjs:1-3` | |
| @tailwindcss/postcss | ^4 | `postcss.config.mjs` | |
| @types/node, @types/react, @types/react-dom | ^22 / ^19 / ^19 | implicit (tsconfig) | |
| @types/pg | ^8.23.1 | implicit for `pg` imports in `lib/db/*` | |
| @types/qrcode | ^1.5.6 | implicit for `qrcode` imports in `lib/auth/mfa.ts`, `app/[locale]/(main)/agent/page.tsx` | |

## 3. Feature-specific (server side, already optional by env)

| Package | Range | Imported in | Feature / gate | Load shape |
|---|---|---|---|---|
| @anthropic-ai/sdk | ^0.128.0 | `lib/ai/providers/anthropic.ts:2` (static), `lib/portfolio-import/ai.ts:2` (static), `lib/ai/planner.ts:49` (dynamic), `scripts/i18n-translate.ts:44` (dynamic); 1 test | AI matchmaker / planner / portfolio import, `ANTHROPIC_API_KEY` | All importers are `server-only`. `lib/ai/agent.ts:10` imports the provider statically, so the SDK is part of the server bundle of `/api/match`, `/api/health`, `/match`, `/admin` (`lib/ai/agent.ts` importers). Not in any client chunk (no match in `.next/static/chunks`). |
| openai | ^7.23.0 | `lib/ai/providers/openai.ts:2` (static), `lib/ai/planner.ts:54` (dynamic), `scripts/i18n-translate.ts:59` (dynamic); 1 test | Same, `OPENAI_API_KEY` | Same as above (`lib/ai/agent.ts:12`). Server only. |
| @supabase/supabase-js | ^2.117.1 | `lib/storage/index.ts:57` (dynamic, inside `supabaseStorage()`) | `STORAGE_PROVIDER=supabase` | Loaded only when the Supabase storage backend is selected. Server only. |
| @supabase/ssr | ^0.12.7 | `lib/supabase/client.ts:3` (`"use client"`), `lib/supabase/server.ts:2` (`server-only`) | — | **Neither module is imported anywhere** (`rg "lib/supabase/|createSupabase"` finds only the two definitions). `lib/supabase/server.ts` also needs `SUPABASE_ANON_KEY`, which `.env.example` does not list. Candidate 6, see §5. |
| jspdf | ^4.2.1 | `lib/pdf/legal-pdf.ts:15` (static), `lib/pdf/arabic-font.ts:19` (type) | Contract/NDA/receipt PDFs via `app/api/legal/[kind]/[ref]/route.ts:8`, `app/api/receipts/[ref]/[entry]/route.ts:8` | Route handlers only; `serverExternalPackages` keeps it out of client bundles (`next.config.ts:9`). |
| pdf-lib | ^1.17.1 | `lib/media/shrink.ts:12` (static); 2 tests | Lossless PDF shrink inside `legal-pdf.ts:16` | Same two API routes. Server only. |
| qrcode | ^1.5.4 | `lib/auth/mfa.ts:3` (static, `server-only`), `app/[locale]/(main)/agent/page.tsx:3` (static, server component) | TOTP enrolment QR, agent link QR | Server only. Note `lib/auth/mfa.ts` is reached from `lib/feature-gate.ts:5` and `lib/launch-access.ts:4`, which the landing page imports (`app/[locale]/(landing)/page.tsx:10`), so `qrcode` sits in the **server** bundle of the landing route. It is ~1 MB on disk, pure JS, no client impact. Candidate 4 for the server bundle only (low value). |

## 4. Browser-side heavy libraries (already lazy)

| Package | Range | Importing file | Boundary | Routes that reach it |
|---|---|---|---|---|
| pdfjs-dist | ^5.7.284 | `lib/portfolio-import/read-pdf.ts:76` `await import("pdfjs-dist/legacy/build/pdf.mjs")` | dynamic inside `readPdf()`; worker, cmaps and fonts served from `public/engines/pdfjs` (`scripts/vendor-engines.mjs:49-55`) | `/studio/import` via `components/studio/portfolio-import.tsx:13` (static import of `read-pdf.ts`); `/portfolio-setup` via `components/setup/wizard.tsx:318` (dynamic import of `read-pdf.ts`). Core chunk `1nm1zxq_lac5y` (458 KB) is separate and lazy. |
| tesseract.js | ^6.0.1 | `lib/portfolio-import/ocr.ts:26` `await import("tesseract.js")` | dynamic inside `ocrWorker()`; engine from `public/engines/tesseract` | Same two routes, through `read-pdf.ts:11` (static import of `./ocr`). Chunk `3t7w3c5lhobig` (16 KB) lazy. |
| @ffmpeg/ffmpeg, @ffmpeg/util | ^0.12.15 / ^0.12.2 | `lib/media/video-compress.ts:118,230` (dynamic) | `components/theme/background-form.tsx:52` `await import("@/lib/media/video-compress")` (line 11 is type-only) | `/admin/appearance` only (`app/[locale]/(main)/admin/appearance/page.tsx:2`). Chunks `21dl6f_2649om`, `2bkroghzkotfz`, `39sk713vzkcqz` (12 KB total) lazy; wasm from `public/engines/ffmpeg`. |
| @ffmpeg/core | ^0.12.9 | no JS import | copied to `public/engines/ffmpeg` by `scripts/vendor-engines.mjs:34-36` (`predev`/`prebuild`) | Build-time asset source (62 MB in `node_modules`). Runtime dependency in the sense that `vendor-engines.mjs` fails the build without it (`process.exitCode = 1`). |
| modern-screenshot | ^4.7.0 | `components/studio/share-card.tsx:22` `await import("modern-screenshot")` | dynamic inside `toPng()` | `/studio` (`app/[locale]/(main)/studio/page.tsx:6`). Chunk `0ouria9cvpo_v` (23 KB) lazy. |

## 5. Apparently unused (verify before removal)

| Package | Evidence | Caveat |
|---|---|---|
| @supabase/ssr | Only imported by `lib/supabase/client.ts` and `lib/supabase/server.ts`; those two files have no importers in `app/`, `components/`, `lib/`, `tests/` or `scripts/`. `lib/env.ts:9` declares `SUPABASE_ANON_KEY` optional but nothing else reads it. | Removing the package requires removing the two files too (they are dead code, not just unused exports). `@supabase/supabase-js` stays (storage). |

No other package in `package.json` is without an importer.

## Landing and registration bundle boundaries

### Routes and their trees

| Route | Page file | Direct tree | Client components in tree (`"use client"`) |
|---|---|---|---|
| `/` (registration landing) | `app/[locale]/(landing)/page.tsx` | `components/registration/registration-view.tsx` (server), `components/landing/sawwiq-page.tsx` (server), `components/teaser/teaser-view.tsx` (server), `lib/launch-phase`, `lib/feature-gate`, `lib/account-link`, `lib/country-choice`, `lib/payments/readiness` (all `server-only`) | `components/country-picker.tsx`, `components/locale-switcher.tsx`, `components/theme-toggle.tsx`, `components/landing/intro-sting.tsx`, `components/landing/ledger.tsx`, `components/teaser/share-button.tsx` |
| `/examples` | `app/[locale]/(landing)/examples/page.tsx` | `components/registration/example-profile.tsx` (server) → `components/profile/profile-header.tsx` (client), `RegistrationHeader/Footer` from `registration-view.tsx` | `profile-header.tsx` + the header widgets above |
| `/join` | `app/[locale]/(auth)/join/page.tsx` | `./join-form.tsx` (client), `lib/country-choice`, `lib/country-options`, `lib/feature-gate` (server-only) | `join-form.tsx` |
| `/portfolio-setup` | `app/[locale]/(main)/portfolio-setup/page.tsx` | `components/setup/wizard.tsx` (client), `lib/data/*` (server-only), `lib/storage` (`mediaUrl` only) | `wizard.tsx`, `components/setup/real-examples.tsx` |
| shared | `app/[locale]/layout.tsx` | `DirectionProvider`, `FlagPolyfill`, `DomGuard`, `ErrorReporter`, `LanguageOffer`, `ServiceRegistry`, `PageTracker`, `ThemeSync` | all eight are client components; none imports a heavy library |

### Does any heavy library reach these routes' client bundles?

Source-graph result: **no heavy library is statically imported by any client component in these
four trees.** The only path is `components/setup/wizard.tsx:33` → `lib/media/image-compress.ts`,
which imports only `./size-search` and `./ssim` (canvas-based, no package), and
`wizard.tsx:318` → `await import("@/lib/portfolio-import/read-pdf")`, a dynamic boundary that is
itself followed by the dynamic `pdfjs-dist` / `tesseract.js` imports.

Build evidence (`.next/server/app/[locale]/**/page_client-reference-manifest.js`, 30 Sep build):

| Route manifest | Distinct client chunks | Heavy chunks referenced (`1nm1zxq_lac5y` pdfjs, `2ebgc6y41lwk8` read-pdf+ocr, `3t7w3c5lhobig` tesseract, `21dl6f…/2bkro…/39sk7…` ffmpeg, `0ouria9cvpo_v` modern-screenshot) |
|---|---|---|
| `(landing)/page` | 11 (355 KB uncompressed, incl. shared layout chunks) | none |
| `(landing)/examples/page` | 10 | none |
| `(auth)/join/page` | 11 | none |
| `(main)/portfolio-setup/page` | 13 (references `components/setup/wizard.tsx`) | none; `read-pdf` chunk is a separate async chunk |
| `(main)/studio/import/page` (for contrast) | 15 | `2ebgc6y41lwk8` (58 KB) referenced **eagerly** 5 times |
| `(main)/admin/appearance/page` (for contrast) | 14 | none (ffmpeg chunks lazy) |

Strings `qrcode`, `supabase`, `jspdf`, `pdf-lib`, `openai`, `anthropic` do not occur in any file
under `.next/static/chunks/`, i.e. those packages are absent from every client bundle.
`sharp`, `pg`, `postgres`, `@electric-sql/pglite` are `node:`-dependent and imported only from
`lib/**` server modules; `next.config.ts:9` additionally externalises `pglite`, `sharp`, `jspdf`.

Root client files (`.next/build-manifest.json` `rootMainFiles`) total ≈427 KB and are
framework/runtime chunks (`1qwsems_2wy_n.js` 223 KB, `22lqbawc8j2e1.js` 131 KB); none contains
the heavy-library markers above.

### Concrete flags

1. **`/studio/import` loads the PDF/OCR glue eagerly** (outside the four routes asked, but the
   only eager heavy path found). `components/studio/portfolio-import.tsx:13` statically imports
   `readPdf` from `lib/portfolio-import/read-pdf.ts`, which statically imports `./ocr` (line 11)
   and `./layout`. Result: chunk `2ebgc6y41lwk8` (58 KB) is in the page's initial client graph; the
   458 KB pdf.js core and tesseract stay lazy. Minimal safe change (not made): in
   `portfolio-import.tsx` keep `import type { ReadPage, ReadProgress }` and move `readPdf` to
   `const { readPdf } = await import("@/lib/portfolio-import/read-pdf")` inside the handler that
   receives the file, mirroring `components/setup/wizard.tsx:318`. No behaviour change; the
   module is only needed after a PDF is chosen.
2. **`qrcode` in the landing server bundle** via `app/[locale]/(landing)/page.tsx:10` →
   `lib/feature-gate.ts:5` → `lib/auth/mfa.ts:3`. Server-side only, so no effect on the browser.
   If server cold-start size matters, the minimal change is a dynamic `await import("qrcode")`
   inside `startEnrollment` in `lib/auth/mfa.ts` (line 40 is its only use there). Low priority.
3. Nothing to flag on `/`, `/examples`, `/join`, `/portfolio-setup`: no heavy browser library is
   statically imported by any file in their client trees, and the 30 Sep manifests confirm it.

## Notes on specific packages

| Topic | Finding |
|---|---|
| `postgres` vs `pg` | Both are intentional and documented in `lib/db/index.ts:13-18` and `:53-59`: on Vercel (`process.env.VERCEL`) the app uses `pg` (node-postgres) through Supabase's transaction pooler because postgres.js with `prepare: false` stalls on that pooler (`docs/27`); elsewhere with `DATABASE_URL` it uses `postgres` (postgres.js). Migrations (`lib/db/migrate.ts:7-11`) and the maintenance scripts (`db-activity.ts`, `traffic-breakdown.ts`, `pooler-check.ts`, run from `.github/workflows/maintenance.yml:71-73`) use `postgres`; `pooler-check.ts` deliberately exercises both drivers. Neither is removable without changing one of those paths. |
| `shadcn` package | Only `@import "shadcn/tailwind.css"` in `app/globals.css:3` (resolves to `node_modules/shadcn/dist/tailwind.css` via the package `exports`). No runtime JS import. The CLI itself is invoked as `npx shadcn@latest add` (CLAUDE.md). Keeping it in `dependencies` pins the CSS to the version the components were generated with; it adds 8 MB + 33 transitive deps to `node_modules` but nothing to any bundle. Moving it to `devDependencies` is safe because the CSS is consumed at build time only. |
| `cn` package | Real runtime dependency: `lib/utils.ts` re-exports it and 12 files in `components/ui/` import it directly. It is the shadcn-maintained replacement for `clsx` + `tailwind-merge` (`node_modules/cn/package.json`). The lockfile also carries a nested `cn@0.2.4` under `shadcn`'s own dependencies; harmless. |
| `server-only` | 83 importers. Vitest cannot resolve it, hence the alias in `vitest.config.mts:9` → `tests/unit/server-only-stub.ts`. Keep. |
| `tw-animate-css` | Used by `components/ui/dialog.tsx` and `components/ui/dropdown-menu.tsx` (`animate-in`, `fade-in-0`, `zoom-in-95`, `slide-in-from-*`). Keep. |
| `country-flag-emoji-polyfill` | `components/flag-polyfill.tsx` runs `polyfillCountryFlagEmojis` in a `useEffect` from the locale layout; the font file is self-hosted at `public/fonts/TwemojiCountryFlags.woff2` and only fetched when the browser cannot draw flags. Small, correct placement. |
| `@ffmpeg/core` | No import; consumed by `scripts/vendor-engines.mjs` which copies the engine to `public/engines/ffmpeg` (gitignored). `docs/26-media-compression.md` describes this. It is a build input, not dead weight. |
| `@electric-sql/pglite` | Runtime fallback database (no `DATABASE_URL`), used by unit tests via `PGLITE_DIR=memory://`. Must stay in `dependencies` for the no-credentials run required by CLAUDE.md. |

## Recommendations

### Safe now (no behaviour change)

| Change | Why it is safe | Files |
|---|---|---|
| Move `shadcn` from `dependencies` to `devDependencies` | Only a CSS import at build time; no runtime or client code references it. | `package.json`, `app/globals.css:3` |
| Make `readPdf` a dynamic import in the studio portfolio importer — **done on this branch** | Mirrors the pattern already used in `components/setup/wizard.tsx:318`; removes the 58 KB `read-pdf`+`ocr` chunk from `/studio/import`'s initial graph. | `components/studio/portfolio-import.tsx` |

### Needs review

| Item | Question to settle | Files |
|---|---|---|
| `@supabase/ssr` and `lib/supabase/{client,server}.ts` | **Done 3 Oct 2026:** package and both files removed, `SUPABASE_ANON_KEY` dropped from `lib/env.ts` and `.env.example`; the AI SDKs are loaded on first use (`lib/ai/providers/{openai,anthropic}.ts`, `lib/portfolio-import/ai.ts`); `shadcn` is a devDependency. Both modules were unreferenced and `server.ts` needs an env var (`SUPABASE_ANON_KEY`) that is not documented. Confirm no planned Supabase Auth work before deleting the two files and the package. | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/env.ts:9`, `.env.example:22-23` |
| `qrcode` reached from `lib/feature-gate.ts` on every gated page | Server-only; only worth a dynamic import if server bundle size / cold start becomes a measured problem. | `lib/auth/mfa.ts:3,40` |
| `@anthropic-ai/sdk` and `openai` statically imported by `lib/ai/agent.ts` | Both SDKs (14 MB + 30 MB on disk) are in the server bundle of `/api/match`, `/api/health`, `/match`, `/admin` even when `AI_PROVIDER=mock`. `lib/ai/planner.ts:49-54` already loads them dynamically; the same could be done in `lib/ai/providers/{anthropic,openai}.ts`. Measure first. | `lib/ai/agent.ts:10,12`, `lib/ai/providers/anthropic.ts:2`, `lib/ai/providers/openai.ts:2`, `lib/portfolio-import/ai.ts:2` |
| `tsx` as a devDependency used by the Vercel build | `vercel.json` `buildCommand` runs `npm run db:migrate` (tsx). Works because Vercel installs dev deps; document the assumption or move `tsx` to `dependencies` if `NPM_CONFIG_PRODUCTION`/`--omit=dev` is ever set. | `vercel.json`, `package.json` scripts |

### Do not touch

| Package(s) | Reason |
|---|---|
| `pg`, `postgres`, `@vercel/functions`, `@electric-sql/pglite` | Three deliberate database paths (`lib/db/index.ts`); each is live in some environment or CI job. |
| `@ffmpeg/core`, `pdfjs-dist`, `tesseract.js` engine files | Vendored into `public/engines` by `scripts/vendor-engines.mjs` on `predev`/`prebuild`; removing any breaks the build (`process.exitCode = 1`). |
| `cn`, `class-variance-authority`, `@base-ui/react`, `tw-animate-css`, `shadcn/tailwind.css` | The generated `components/ui/*` depend on all of them. |
| `sharp`, `jspdf`, `pdf-lib`, `qrcode`, `jose` | Server features in daily use (uploads, legal PDFs, MFA, Google sign-in); already outside client bundles. |
| `server-only`, `country-flag-emoji-polyfill` | Tiny and load-bearing (RSC guard; Windows flag rendering). |
