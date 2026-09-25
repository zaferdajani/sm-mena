# 11 · Build Stages (showcase model)

Replaces Sprints 1–10 of `05-implementation-roadmap.md` for v1. Status is updated as each stage lands.

| Stage | Scope | Status |
|---|---|---|
| 1 | Research, model, monetization docs | Done |
| 2 | Data layer: schema, PGlite (dev/test) and Postgres (prod), migrations, image storage with resizing, demo seed | Done |
| 3 | Agency accounts (email + password, hashed sessions), visitor cookie, admin role | Done |
| 4 | Public UI: app shell with bottom nav, home feed with agencies strip, explore grid with filters and search, agency profile, post page, saved | Done |
| 5 | Interactions: like, save, follow, contact tracking, inquiry form, report | Done |
| 6 | Studio: onboarding, profile editor, new post with multi-image upload, manage posts, inbox, insights | Done |
| 7 | Admin and monetization switches: verify, suspend, plans, reports, promotions, stats | Done |
| 8 | SEO, unit and browser tests, CI, README | Done |
| 8b | Upwork-style hire pages per service and per service + city | Done |
| 9 | Verified client reviews (invite links or after contact), sub-scores, replies, moderation; Google Business Profile rating | Done |
| 10 | Portfolio tools: service packages, pinned posts | Done |
| 11 | Project requests and quotes (bidding): invite top matches, agency opportunities, accept/decline | Done |
| 12 | AI matchmaker: matching engine, Claude agent with tools, rule-based fallback, capped paid boost | Done |
| 13 | Availability: health check, Vercel config and workflows, docs | Done |

## Architecture decisions

- **Database.** Drizzle ORM on PostgreSQL. With no `DATABASE_URL`, the app uses **PGlite** (Postgres compiled to WebAssembly) stored in `.data/`, so it runs and tests with zero setup. Production sets `DATABASE_URL` (Supabase, Neon or any Postgres).
- **Auth.** Own email + password auth with scrypt hashing and hashed session tokens in the database. No vendor needed. Phone OTP can be added later.
- **Visitors.** Anonymous `sw_vid` cookie set by the proxy. Used only for likes, saves, follows and de-duplicated view counts.
- **Images.** Uploaded images are resized with `sharp` to WebP (1080 px feed size and 480 px square thumbnail). Storage adapter: local disk in development, Supabase Storage in production.
- **Rendering.** Server Components and Server Actions; small client components for likes, carousels and uploads.
- **Matching.** Pure scoring functions in `lib/matching/score.ts` with a reason breakdown; the AI agent calls them through tools and never ranks agencies on its own. See `12-ai-matchmaker.md`.
- **Hosting.** Vercel (serverless) with Supabase Postgres and Storage (docs/27-vercel.md, docs/25-supabase.md); PGlite and a local folder for development.
