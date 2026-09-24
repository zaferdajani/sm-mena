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

First time running browser tests: `npx playwright install chromium`, or point to an existing Chromium with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome`.

Configuration is in `.env.example`. Copy it to `.env.local` and fill in only what you need.

## Put it online

### Option A — Fly.io (recommended for the pilot, runs as is)

One machine with a 1 GB volume holds the database and uploads, so no other services are needed.

1. Create a Fly.io account and an access token (Account → Access Tokens).
2. In GitHub → this repo → Settings → Secrets and variables → Actions, add:
   - `FLY_API_TOKEN` (required)
   - `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (12+ characters) for your admin login
   - `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY` (optional, turns on the AI matchmaker); optionally `AI_PROVIDER`, `ANTHROPIC_MODEL` (e.g. `claude-haiku-4-5`) or `OPENAI_MODEL` (e.g. `gpt-4o-mini`)
   - `GOOGLE_PLACES_API_KEY` (optional, Google ratings)

   The workflow also generates `MFA_ENCRYPTION_KEY` (two-factor sign-in), `PAYMENTS_WEBHOOK_SECRET` and `CRON_SECRET` on the first deploy. After signing in the first time, turn on two-factor sign-in (the admin console asks you to).
3. Run **Actions → Deploy to Fly.io → Run workflow** (it also runs on every push to `main`).

The site comes up at `https://sawwiq-jo.fly.dev` with demo agencies (remove them in Admin → Agencies when real agencies join). The admin account is created on the first boot after the admin secrets are set, so you can add them later. Change `app` in `fly.toml` for a different name. On a live deployment demo agency passwords are random unless `SEED_DEMO_PASSWORD` is set. For the daily Google refresh, point any scheduler at `GET /api/cron/google` with `Authorization: Bearer $CRON_SECRET`.

From a terminal instead: `fly launch --copy-config --no-deploy`, `fly volumes create sawwiq_data --size 1`, `fly secrets set SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=…`, `fly deploy --ha=false`.

### Option B — Vercel + managed Postgres

Vercel functions have no persistent disk, so set `DATABASE_URL` (Supabase or Neon) and `STORAGE_PROVIDER=supabase` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and a public bucket. `vercel.json` runs migrations during the build and schedules the Google refresh daily. Seed once with `DATABASE_URL=… npm run db:seed` if you want demo data.

### Option C — any Docker host

```bash
docker build -t sawwiq --build-arg NEXT_PUBLIC_SITE_URL=https://your.domain .
docker run -p 3000:3000 -v sawwiq-data:/data -e SEED_DEMO=true \
  -e SEED_ADMIN_EMAIL=you@example.com -e SEED_ADMIN_PASSWORD='a-long-password' sawwiq
```

`GET /api/health` reports the database, storage, AI and monetization mode (never secrets).

Before scaling past one machine, move to Postgres and Supabase Storage (rate limits are in memory and PGlite is single-process).

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
| `CLAUDE.md` | Build rules for Claude Code |

## Stack

Next.js 16 (App Router, `proxy.ts`), React 19, TypeScript, Tailwind CSS 4, shadcn/ui with RTL, next-intl, Drizzle ORM on PostgreSQL (PGlite locally), sharp, Anthropic and OpenAI TypeScript SDKs, Vitest, Playwright, GitHub Actions.

## Working name

"Sawwiq" is a placeholder. Run a trademark and domain check before using it publicly.
