# 05 · Implementation Roadmap for Claude Code

This is the build order. Each sprint is a self-contained instruction set that Claude Code can execute in a session. Complete a sprint, run its checks, commit, then start the next. Do not skip ahead to payments before the directory and brief flows work with mock providers.

Conventions: Conventional Commits; one PR per sprint; CI must pass; Arabic strings go in `messages/ar.json` and English in `messages/en.json`, never inline.

---

## Sprint 0 · Repository bootstrap ✅ Done

Built on Next.js 16, where middleware is renamed `proxy.ts`. Locale detection is off so `/` always opens Arabic. Vercel deployment is documented in the README and needs the owner's Vercel account.

**Goal:** a running, deployable, empty bilingual app with CI.

Tasks:
1. `npx create-next-app@latest` with TypeScript, App Router, Tailwind, ESLint, `src/` off.
2. Add `next-intl` with locales `ar` (default, RTL) and `en`. Root layout sets `dir` and `lang`. Locale switcher in header.
3. Add shadcn/ui; configure logical CSS properties (`ps-`, `pe-`, `ms-`, `me-`) rule in ESLint to avoid `left/right`.
4. Add Drizzle ORM + Postgres client; `drizzle.config.ts`; `lib/db/schema.ts` empty; `npm run db:generate`, `db:migrate`, `db:seed` scripts.
5. Supabase client helpers (server, browser); `.env.example` per `04-technical-plan.md`.
6. Vitest + Playwright; one passing unit test; one Playwright smoke test that loads `/ar` and asserts `dir="rtl"`.
7. GitHub Actions: `lint`, `typecheck`, `test`, `e2e` on PR.
8. Copy `data/service-taxonomy.json` into `lib/taxonomy.ts` as typed constants.
9. Deploy preview to Vercel (document steps in README).

Definition of done: `npm run lint && npm run typecheck && npm test && npm run e2e` pass; `/ar` and `/en` render with correct direction.

---

## Sprint 1 · Schema and seed

**Goal:** database schema for Phase 1 and imported seed agencies.

Tasks:
1. Implement entities from `03-product-spec.md` §4 for Phase 1: User, Agency, AgencyMember, Service, AgencyService, Package, PortfolioItem, Verification, Brief, BriefMatch, Proposal, AuditLog. Include `country` (default `JO`) on Agency and Brief. Enums as Postgres enums.
2. Migrations generated and applied.
3. RLS policies: public read on verified/claimed agencies and services; agency members write own agency; buyers read own briefs; admin role bypass via service role only.
4. `scripts/import-agencies.ts` reads `data/agency-seed-template.csv` and upserts agencies with `status = seeded`, generating slugs and mapping services by key.
5. `db:seed` loads services from taxonomy and 10 fake agencies + 5 fake briefs for local dev (Faker, Arabic names).
6. Unit tests for slug generation and CSV mapping.

DoD: seed runs clean on a fresh database; `select count(*) from agencies` matches CSV rows.

---

## Sprint 2 · Public directory and profiles

**Goal:** the SEO-facing product.

Tasks:
1. Home page (ar/en): hero with "Get proposals" CTA, how it works (3 steps), featured verified agencies, trust strip, FAQ.
2. `/[locale]/agencies` directory: server-rendered list, filters (service, city, budget band, verified only), sort; pagination; empty state.
3. `/[locale]/agencies/[slug]` profile: header with badges (Verified, Founding, Pro), description, services, packages with prices, portfolio grid, cities served, "Get proposals from this agency" CTA (pre-fills brief), "This is my agency" claim CTA on seeded profiles.
4. `/[locale]/city/[city]` and `/[locale]/services/[key]` landing pages generated from data, with embedded brief CTA and localized metadata.
5. Sitemap, robots, Open Graph, hreflang for ar/en.
6. Playwright: directory filter by service works in Arabic on a 390px viewport.

DoD: Lighthouse mobile performance ≥ 85 on directory and profile; all copy from message files.

---

## Sprint 3 · Auth, claim, profile editor

**Goal:** agencies can claim and edit their profiles.

Tasks:
1. Phone OTP auth (Supabase) with mock SMS provider in dev; rate limit 5/hour/phone.
2. Claim flow: from seeded profile → sign up → claim request; auto-approve if email domain matches agency website domain, else admin approval queue.
3. Agency dashboard shell with nav: Profile, Verification, Briefs, Proposals, Billing (placeholder), Settings.
4. Profile editor: bilingual fields, logo upload (Supabase Storage), services with budget ranges, packages CRUD, portfolio CRUD, cities served, social links. Zod validation, ar/en errors.
5. Consent capture at signup with version; stored on User.
6. Audit log entries on profile changes.

DoD: a seeded agency can be claimed and fully edited in Arabic on mobile; e2e test covers claim → edit → public profile reflects changes.

---

## Sprint 4 · Verification and admin

**Goal:** the trust layer.

Tasks:
1. Verification submission: CCD number, certificate upload (private bucket), two references, checkbox commitments (48h response, portfolio rights). Status machine: unverified → pending → verified | rejected.
2. Admin area (role `admin`): verification queue with document viewer (signed URLs, 15 min), checklist, approve/reject with reason, notes. Email notification to agency on decision.
3. Admin agencies list: status, plan, founding flag toggle, suspend/unsuspend.
4. Verified badge appears on profile; directory "verified only" filter defaults on.
5. Audit log on every admin action.

DoD: e2e test: agency submits verification → admin approves → badge visible publicly.

---

## Sprint 5 · Brief form and buyer flow

**Goal:** demand capture.

Tasks:
1. `/[locale]/brief/new` six-step form per `03-product-spec.md` §2.1; progress indicator; state persisted in URL/localStorage; Arabic-first microcopy; budget bands from constants.
2. Phone OTP at final step; creates buyer User; consent capture with version.
3. Brief saved with status `submitted`; confirmation page; email/SMS confirmation (mock providers).
4. Buyer dashboard: list of briefs with status; brief detail page with proposals (empty state until routed).
5. Pre-fill from agency profile CTA (`?agency=slug`) and from service/city pages.
6. Rate limit: 3 briefs per phone per day.
7. Analytics events for each step (PostHog) to measure drop-off.

DoD: e2e: complete brief in Arabic on mobile in under 90 seconds of scripted interaction; brief appears in admin queue.

---

## Sprint 6 · Moderation, manual routing, proposals

**Goal:** close the loop end to end without money.

Tasks:
1. Admin brief queue: qualify / reject (with reason and buyer email) / request info; edit budget band; expiry set to 7 days on routing.
2. Manual routing UI: search verified agencies, add up to 5 to the match set, "notify" sends email + SMS/WhatsApp (mock) with anonymised summary and link.
3. Agency brief inbox: list of routed briefs, anonymised detail (no contact), countdown to expiry.
4. Proposal form (template): scope, deliverables (list), price JOD, billing, timeline, team, 2 case studies (from portfolio). On submit: contact details unlocked for that agency; buyer notified.
5. Buyer compare view: proposals side by side; shortlist; "mark as hired" (records Outcome).
6. Response-time and response-rate computation (hourly cron) stored on Agency.
7. Admin metrics page: briefs by status, qualified rate, % with ≥3 proposals in 48h, hires.

DoD: full e2e: brief → qualify → route to 3 seeded-verified agencies → 2 proposals → buyer hires one → metrics reflect it. **This is the Phase 1 release.**

---

## Sprint 7 · Automatic matching and notifications (Phase 2 begins)

Tasks:
1. `lib/matching/score.ts` implementing `03-product-spec.md` §5 as pure functions with full unit tests, returning breakdown.
2. On qualification, auto-generate match set (top 5, min score 40, at least one non-Pro); admin can pin/unpin before sending; auto-send after 2 hours if untouched.
3. Real SMS provider adapter (choose a Jordanian gateway) and WhatsApp Cloud API adapter behind the interface; template messages in Arabic; retries and delivery status.
4. Agency notification preferences.
5. Brief auto-expiry cron; reminder to agencies at 24h if no response.

---

## Sprint 8 · Chat, outcomes, reviews

Tasks:
1. Conversation per (brief, agency) after proposal; realtime via Supabase Realtime; attachments; unread badges; email digest.
2. Outcome prompts to both sides at 14 days; reconcile conflicts in admin.
3. Review flow at 30 days for hired outcomes; moderation queue; public display; rating aggregates; agency public reply.
4. Agency dashboard analytics: views, briefs received, response rate, win rate, rating, ranking factors explanation.

---

## Sprint 9 · Monetisation

Tasks:
1. Wallet: `WalletTxn` ledger; balance derived; top-up via PSP adapter (card) with mock in dev; manual CliQ top-up request confirmed by admin.
2. Lead fee: charged on proposal submit unless Pro or founding member; insufficient balance blocks submit with top-up prompt; refund on brief rejection/withdrawal.
3. Pro subscription: monthly via PSP recurring or admin-confirmed invoice; feature flags (unlimited responses, placement boost, badge); grace period 7 days.
4. Billing page: balance, transactions, invoices (PDF, JOD, tax fields).
5. Admin revenue metrics.
6. Feature-flag the whole monetisation so it can be switched on per date (Month 7).

---

## Sprint 10 · SEO scale and referral widget

Tasks:
1. Generate city × service pages with unique Arabic copy blocks; internal linking; sitemap index.
2. Pricing guide and "how to choose" content pages (MDX).
3. Agency referral widget/link: briefs arriving via an agency's link route to that agency free plus two others.
4. Performance pass: image optimisation, edge caching, Core Web Vitals.

---

## Sprint 11–13 · Transaction rail (Phase 3, after legal opinion)

1. Contract generation from accepted proposal (ar/en template), OTP e-signature, immutable snapshot.
2. Milestones; PSP marketplace/split-payment integration (platform never holds funds); fund, release, 7-day auto-release, refunds.
3. Agency payouts and statements; commission invoices.
4. Disputes: raise, evidence, admin decision, partial release; SLA 10 days.
5. Buyer "hire again"; repeat brief prefill.

---

## Backlog (not scheduled)

- PWA install prompt and push notifications
- Arabic search with normalisation (alef/ta-marbuta variants)
- Agency API for CRM export
- Second country: `SA`/`IQ` locale variants, currency, PSP
- Annual pricing report generator from Package and Proposal data
