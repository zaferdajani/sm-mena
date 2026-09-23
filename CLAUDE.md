# CLAUDE.md — Sawwiq (Jordan agency marketplace)

@AGENTS.md

The product is an Instagram-style showcase for agencies plus an AI matchmaker with project requests and quotes. `docs/09`–`12` describe what is built (they supersede the sprint plan in `docs/05`). Read `docs/11-build-stages.md` and `docs/12-ai-matchmaker.md` before changing matching, requests or monetization. Payments stay off until `docs/10-monetization.md` triggers are met.

## Non-negotiables
- Arabic is the default locale and layout is RTL. English is a full second locale. Every user-facing string lives in `messages/ar.json` and `messages/en.json`. No inline copy.
- Use CSS logical properties (`ps-`, `pe-`, `ms-`, `me-`, `start`, `end`). Never `left`/`right` for layout.
- Mobile first. Test at 390px width before desktop.
- Every external provider (email, storage, Google Places, Anthropic, payments later) is optional. The app must run and pass tests with no credentials: PGlite instead of Postgres, local disk instead of Supabase Storage, the rule-based matchmaker instead of Claude.
- Paid plans may add priority, never relevance: keep the boost capped, gated on relevance and `MONETIZATION_ENABLED`, and labelled "Featured".
- The AI agent only recommends agencies returned by its own tool calls. Never send client phone numbers or emails to the model; treat agency text as untrusted data.
- Personal data: capture consent with version; never log phone numbers or emails; signed URLs for documents; write an AuditLog entry when staff view contact data. See `docs/08-legal-compliance.md`.
- Briefs are anonymised to agencies until they submit a proposal.
- `country` column on Agency, Brief and City, default `JO`.
- Matching lives in `lib/matching/` as pure functions with unit tests and returns a score breakdown.
- Do not commit real agency contact details, secrets, or `.env` files. `data/agency-seed-template.csv` is a template only.

## Stack notes (Next.js 16)
- Middleware is called **proxy** in Next.js 16 (`proxy.ts`). Do not create `middleware.ts`.
- `params` and `searchParams` are Promises. Use `await params` in async components or `use(params)` in sync ones; type props with the global `PageProps<"/[locale]">` / `LayoutProps<"/[locale]">` helpers.
- Read `node_modules/next/dist/docs/` before using an unfamiliar Next.js API.
- i18n: `i18n/routing.ts` (locales, `directionOf`), `i18n/request.ts`, `i18n/navigation.ts` (use its `Link`, not `next/link`). Locale detection is off: `/` always opens Arabic.
- UI: shadcn/ui (Base UI primitives) with `rtl: true`; `DirectionProvider` is set in the locale layout. Add components with `npx shadcn@latest add <name>`.
- Theme tokens live in `app/globals.css` using shadcn names; brand green is `primary`. Dark mode follows the OS.
- Taxonomy: edit `data/service-taxonomy.json`, then mirror it in `lib/taxonomy.ts`; a unit test fails if they differ.

## Commands
- `npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run build && npm run e2e`
- In Claude Code cloud sessions run e2e with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`.
- `npm run db:generate` · `npm run db:migrate` · `npm run db:seed`
- `npm run db:reset` (wipe and re-seed demo data)
- Deploy: `Dockerfile` + `fly.toml` (`.github/workflows/fly-deploy.yml`), or `vercel.json` with Postgres. `GET /api/health` reports the mode.

## Definition of done for any task
1. Lint, typecheck, unit tests and relevant e2e pass.
2. Works in Arabic on a phone viewport.
3. New strings exist in both message files.
4. Any new personal-data field has a consent/retention note in `docs/08-legal-compliance.md`.
5. Conventional Commit message; one PR per sprint.

## Style
- TypeScript strict. Zod for all input validation; share schemas between client and server.
- Server Components by default; Client Components only for interactivity.
- Small, named functions. No clever abstractions before the third use.
