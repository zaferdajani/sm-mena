# Sawwiq (سوّق) — Jordan's showcase for marketing agencies

An Instagram-style platform where Jordanian social media and marketing agencies show their work, and businesses find, compare and hire them. Clients describe a project to an AI matchmaker that recommends the best-suited agencies with a realistic budget, then invite them to quote. Agencies build a portfolio, collect verified client reviews and show their Google rating.

Arabic first (RTL), English second. **Free for everyone at launch.** Paid plans, recommendation priority and sponsored slots are built in and switched off (`MONETIZATION_ENABLED=false`).

## What's in it

| For clients | For agencies | For the platform |
|---|---|---|
| Home feed of real work, agencies strip | Studio: insights (views, contact clicks, inquiries, recommendations, quotes) | Admin: stats and monetization readiness |
| Explore with filters: service, city, platform, industry, budget, search | Portfolio posts with multi-image upload, pin up to 3 | Verify, suspend and set plans for agencies |
| Agency profiles: work, reviews and about tabs, packages with prices | Service packages (up to 6) with price and delivery time | Reports queue and review moderation |
| **AI matchmaker** (`/match`): chat about the project → ranked agencies, reasons, budget range | **Opportunities**: matched project requests, send quotes | Promotions with pacing rules (feed, strip, explore) |
| **Project requests**: invite the top matches, compare quotes, accept one | Review invites: single-use links for past clients | Remove all demo data with one click |
| Verified reviews (Airbnb style), Google rating | Connect Google Business Profile for the rating | Health endpoint, daily Google refresh cron |
| Upwork-style hire pages per service and city (SEO) | Inbox for inquiries | |

### Contracts and protected payments

Agencies build packages from a catalogue (posts, reels, stories, accounts handled per platform, ads, websites and maintenance, branding, on-site shoots and events, reports), then turn a package or a won quote into a contract: milestones with dates, amounts and checklists, the client's special requests pinned to milestones, an optional NDA, and a choice of **protected payment** (the client pays each milestone into Sawwiq; it's released when the client confirms every checklist item; disputes go to admin) or **direct payment** (no guarantees). Both sides sign online; the client needs only a private link. See `docs/14-contracts-and-milestones.md`.

### Languages

Arabic first (right to left), English second. The site never switches language by itself: it offers the likely language in one line (from the device language and the time zone's country, no IP lookups) and remembers the choice. `npm run i18n:translate -- --to <code>` drafts new languages with Claude or OpenAI, with placeholder and brand-name validation. See `docs/15-languages.md`.

### Admin console

Platform overview and system status, statistics (traffic sources, how visitors arrived, funnel, activity), payments (plans, CliQ/bank/cash recording, refunds, CSV export), bugs (automatic error journal and user reports), agencies, reports, reviews, promotions, users, audit log. Admins sign in with an authenticator app (two-factor, required in production and checked on the server). See `docs/13-admin-console.md`.

### Team access

Maintenance, backbone (engineering) and support teams get their own roles with only the tools their job needs (Admin → Team). You stay the **owner**: only you invite people, change roles, time-box or switch off access, export payments or hand over ownership, and nobody can demote or lock out the owner. Invitations are single-use links, staff must turn on two-factor sign-in, and every change is audited. `docs/17-team-access.md` also covers keeping GitHub, Vercel, Supabase and the other accounts in your name (CODEOWNERS, branch protection) and a break-glass recovery.

### How matching works

`lib/matching/score.ts` scores every active agency out of 100: services (35), portfolio depth (15), budget fit (15), city (10), reputation from verified reviews (15, a Bayesian average so one 5-star review doesn't beat twenty 4.8s), platform (5), industry (5), verified (3). Every score comes with a breakdown that the UI shows as reasons.

Subscriptions buy **priority, not relevance**: Pro adds 6 points and Business 10, only for agencies that already score 45 or more, and those results are labelled "Featured". The boost is off while monetization is off. See `docs/12-ai-matchmaker.md`.

### The AI agent

The chat runs on **Claude or OpenAI**, whichever key you set (`AI_PROVIDER` picks the order when both are set). Either model uses the same three tools (`search_agencies`, `price_guide`, `recommend_agencies`): it asks a few questions at most, searches the real database, quotes market prices from actual packages, and returns a structured recommendation. If a provider fails (outage, spend limit, refusal) the other one answers, and if neither can, a rule-based Arabic/English matchmaker does, so the feature never goes down.

`AI_PROVIDER=mock` runs a scripted, offline stand-in for the model through the same tools: free, no key, for development and demos (answers are marked "test mode").

**Compare providers before choosing:** `npm run ai:eval` scores providers on 30 test conversations (`tests/fixtures/matchmaker-cases.ts`: Arabic, Jordanian dialect, English, mixed, vague, off-topic and a prompt-injection attempt) and reports pass rate, tokens and latency. For example, `npm run ai:eval -- --provider openai,anthropic --price-in 0.15 --price-out 0.60` (prices in USD per million tokens; each real run costs a few cents).

## Run it locally

Requires Node.js 22 or newer. No accounts or keys needed: the database is embedded (PGlite) and images are stored on disk.

```bash
npm install
npm run db:seed      # 12 fictional demo agencies, 64 posts, reviews, packages
npm run dev          # http://localhost:3000 opens Arabic; /en for English
```

Demo logins (development only):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sawwiq.test` | `admin-pass-123` |
| Agency | `nakhla-studio@sawwiq.test` | `demo-pass-123` |

Every demo agency logs in as `<handle with dots replaced by dashes>@sawwiq.test` with the same password. `npm run db:reset` wipes and re-seeds.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run lint` | ESLint, including a rule that blocks left/right classes so RTL layouts stay correct |
| `npm run typecheck` | Generates Next.js route types, then runs TypeScript |
| `npm test` | Unit tests (Vitest, in-memory PGlite) |
| `npm run build && npm run e2e` | Production build, then browser tests (Playwright, mobile and desktop) on a freshly seeded database |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:reset` | Migrations and seed |
| `npm run i18n:translate -- --to <code>` | Draft a new interface language (see docs/15) |
| `npm run ai:eval` | Score AI providers on the test conversations (mock and rules when no key is set) |
| `npm run seo:check -- <url>` | Check canonical, hreflang, robots, H1 and structured data on a running site (docs/18) |

First time running browser tests: `npx playwright install chromium`, or point to an existing Chromium with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome`.

Configuration is in `.env.example`. Copy it to `.env.local` and fill in only what you need.

## Put it online

The site runs on **Vercel** (free Hobby plan) with **Supabase** for the database (Postgres) and uploaded files (Storage). Everything is driven from GitHub Actions; see `docs/27-vercel.md` for the full walkthrough and `docs/25-supabase.md` for the database.

1. In GitHub → this repo → Settings → Secrets and variables → Actions, add:
   - `VERCEL_TOKEN` (vercel.com → Account Settings → Tokens)
   - `DATABASE_URL` (Supabase → Connect → Session pooler, with `?sslmode=require`), `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (12+ characters) for your admin login
   - `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` (optional, turns on the AI matchmaker); optionally `AI_PROVIDER`, `ANTHROPIC_MODEL` or `OPENAI_MODEL`
   - `GOOGLE_PLACES_API_KEY` (optional, Google ratings)
2. Run **Actions → Vercel → Run workflow → setup**. It copies the secrets into Vercel, generates `MFA_ENCRYPTION_KEY`, `PAYMENTS_WEBHOOK_SECRET` and `CRON_SECRET` once, adds the domain and deploys. Every push to `main` deploys again.
3. Run **Actions → Maintenance → Run workflow → seed-demo** to create your admin account (and the demo agencies). Sign in at `/login` with the admin email and password, then turn on two-factor sign-in when asked.

Other buttons in **Actions → Vercel**: `status` (latest deployments, build log, DNS check) and `logs` (recent server errors). In **Actions → Maintenance**: `migrate`, `seed-demo`, `rebuild-demo-media`, `reset-staff-2fa`, `recover-owner`.

`GET /api/health` reports the database, storage, AI and monetization mode (never secrets). Locally, without `DATABASE_URL`, the app uses an embedded database (PGlite) and a local upload folder, so `npm run dev` needs nothing else.

## Documents

| File | What it is |
|---|---|
| `docs/01-business-plan.md` … `docs/08-legal-compliance.md` | Business plan, market research, product spec, technical plan, roadmap, financial model, go-to-market, legal |
| `docs/09-benchmark-and-model.md` | Houzz, Dribbble, Behance, Contra, Thumbtack, Bark, Instagram and why the showcase model |
| `docs/10-monetization.md` | Free now, paid later: triggers, prices, recommendation priority, trust rules |
| `docs/11-build-stages.md` | What was built, stage by stage |
| `docs/12-ai-matchmaker.md` | Matching score, AI agent design, requests and quotes, safety |
| `docs/13-admin-console.md` | Admin console, two-factor sign-in, payments, bugs, statistics |
| `docs/15-languages.md` | Language offer, location concept, RTL, translation pipeline |
| `docs/14-contracts-and-milestones.md` | Deliverables catalogue, contracts and NDA, milestones, protected and direct payments |
| `docs/18-seo.md` | SEO: the OneClickConvert playbook, what's in place, owner to-do, keyword map |
| `docs/20-client-voice.md` | A real client's needs and pains, and how the platform answers them |
| `docs/21-countries.md` | Jordan, the Gulf and Egypt: country picker (GPS), cities, currencies, per-country hire pages |
| `docs/19-domain.md` | The domain: sawwiq.org at Namecheap pointing at Vercel |
| `docs/25-supabase.md` | Database and file storage on Supabase |
| `docs/27-vercel.md` | Hosting on Vercel, the GitHub Actions buttons, first-time setup |
| `docs/28-portfolio-clients.md` | Agency introduction and strengths, countries served, portfolio clients and their accounts |
| `docs/29-email.md` | Email to agencies with Resend: DNS at Namecheap, API key, setup |
| `docs/30-services-and-partners.md` | Services as tags (researched catalog, type-ahead, admin review), freelancers, partner network |
| `docs/17-team-access.md` | Staff roles, owner protections, GitHub and Vercel access for the team, break-glass, sites directory |
| `CLAUDE.md` | Build rules for Claude Code |

## Stack

Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind CSS 4, shadcn/ui with RTL, next-intl, Drizzle ORM on PostgreSQL (PGlite locally), sharp, Anthropic and OpenAI TypeScript SDKs, Vitest, Playwright, GitHub Actions.

## Working name

"Sawwiq" is a placeholder. Run a trademark and domain check before using it publicly.
