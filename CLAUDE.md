# CLAUDE.md — Sawwiq (Jordan agency marketplace)

Read `docs/03-product-spec.md`, `docs/04-technical-plan.md` and `docs/05-implementation-roadmap.md` before writing code. Build sprint by sprint in the order given in the roadmap. Do not start payments (Sprint 9+) until Sprint 6's end-to-end test passes.

## Non-negotiables
- Arabic is the default locale and layout is RTL. English is a full second locale. Every user-facing string lives in `messages/ar.json` and `messages/en.json`. No inline copy.
- Use CSS logical properties (`ps-`, `pe-`, `ms-`, `me-`, `start`, `end`). Never `left`/`right` for layout.
- Mobile first. Test at 390px width before desktop.
- Every external provider (SMS, WhatsApp, email, payments) sits behind an adapter interface in `lib/` with a `mock` implementation. The app must run and pass tests with no vendor credentials.
- Personal data: capture consent with version; never log phone numbers or emails; signed URLs for documents; write an AuditLog entry when staff view contact data. See `docs/08-legal-compliance.md`.
- Briefs are anonymised to agencies until they submit a proposal.
- `country` column on Agency, Brief and City, default `JO`.
- Matching lives in `lib/matching/` as pure functions with unit tests and returns a score breakdown.
- Do not commit real agency contact details, secrets, or `.env` files. `data/agency-seed-template.csv` is a template only.

## Commands
- `npm run dev` · `npm run lint` · `npm run typecheck` · `npm test` · `npm run e2e`
- `npm run db:generate` · `npm run db:migrate` · `npm run db:seed`
- `npm run import:agencies -- path/to/agencies.csv`

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
