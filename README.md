# Sawwiq (سوّق) — Jordan Marketing Agency Marketplace

A two-sided marketplace connecting Jordanian businesses with verified social media and digital marketing agencies. Businesses post a brief in Arabic, verified agencies respond with standardised proposals, and (from Phase 3) the contract and payment happen on the platform.

This repository holds the research-backed business plan and the application itself, built sprint by sprint with Claude Code following `docs/05-implementation-roadmap.md`.

**Status:** Sprint 0 complete. A bilingual Arabic/English shell with CI. Next up is Sprint 1, the database schema and agency import.

## Contents

| File | What it is |
|---|---|
| `docs/01-business-plan.md` | Executive summary, problem, solution, market, competition, business model, GTM, operations, financials, risks, milestones |
| `docs/02-market-research.md` | Sourced data on demand, supply, pricing, competitors, payments, legal, funding |
| `docs/03-product-spec.md` | Personas, journeys, features by phase, data model, matching rules, non-functional requirements |
| `docs/04-technical-plan.md` | Stack, repo layout, environments, design decisions, security, deployment, testing |
| `docs/05-implementation-roadmap.md` | Sprint-by-sprint build instructions for Claude Code |
| `docs/06-financial-model.md` | Assumptions, 3-year projection, funding need, sensitivities |
| `docs/07-go-to-market.md` | Supply seeding, founding member offer, demand launch, partnerships, metrics |
| `docs/08-legal-compliance.md` | Company setup, PDPL, e-transactions, terms, payments/escrow, checklist |
| `data/service-taxonomy.json` | Service categories, business types, platforms, budget bands, cities |
| `data/agency-seed-template.csv` | Column template for the agency seed list |
| `data/build_financial_model.py` → `data/financial-model.csv` | Reproducible financial model |
| `CLAUDE.md` | Build rules for Claude Code |
| `app/`, `components/`, `i18n/`, `lib/`, `messages/`, `tests/` | Application code |

## Run it locally

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local   # optional; everything runs on mock providers
npm run dev                  # http://localhost:3000 opens /ar
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run lint` | ESLint, including a rule that blocks left/right classes so RTL layouts stay correct |
| `npm run typecheck` | Generates Next.js route types, then runs TypeScript |
| `npm test` | Unit tests (Vitest) |
| `npm run build && npm run e2e` | Production build, then browser tests (Playwright) on mobile and desktop |
| `npm run db:generate` / `db:migrate` / `db:seed` | Database migrations and seed (from Sprint 1) |

First time running browser tests: `npx playwright install chromium`. If a Chromium is already installed elsewhere, point to it with `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome`.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui with RTL, next-intl (Arabic default, English), Drizzle ORM on Supabase Postgres, Vitest, Playwright, GitHub Actions.

## Deploy a preview to Vercel

1. Go to vercel.com, choose **Add New → Project**, and import `zaferdajani/sm-mena`.
2. Keep the detected Next.js settings. No environment variables are needed until Sprint 1.
3. Deploy. Every pull request then gets its own preview URL.

## Continue building

Open this repo with Claude Code and say: "Read CLAUDE.md and docs/05-implementation-roadmap.md. Execute the next sprint."

## Working name

"Sawwiq" is a placeholder. Run a trademark and domain check before using it publicly.
