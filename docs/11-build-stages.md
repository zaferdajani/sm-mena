# 11 · Build Stages (showcase model)

Replaces Sprints 1–10 of `05-implementation-roadmap.md` for v1. Status is updated as each stage lands.

| Stage | Scope | Status |
|---|---|---|
| 1 | Research, model, monetization docs | Done |
| 2 | Data layer: schema, PGlite (dev/test) and Postgres (prod), migrations, image storage with resizing, demo seed | Pending |
| 3 | Agency accounts (email + password, hashed sessions), visitor cookie, admin role | Pending |
| 4 | Public UI: app shell with bottom nav, home feed with agencies strip, explore grid with filters and search, agency profile, post page, saved | Pending |
| 5 | Interactions: like, save, follow, contact tracking, inquiry form, report | Pending |
| 6 | Studio: onboarding, profile editor, new post with multi-image upload, manage posts, inbox, insights | Pending |
| 7 | Admin and monetization switches: verify, suspend, plans, reports, promotions, stats | Pending |
| 8 | SEO, unit and browser tests, CI, README | Pending |

## Architecture decisions

- **Database.** Drizzle ORM on PostgreSQL. With no `DATABASE_URL`, the app uses **PGlite** (Postgres compiled to WebAssembly) stored in `.data/`, so it runs and tests with zero setup. Production sets `DATABASE_URL` (Supabase, Neon or any Postgres).
- **Auth.** Own email + password auth with scrypt hashing and hashed session tokens in the database. No vendor needed. Phone OTP can be added later.
- **Visitors.** Anonymous `sw_vid` cookie set by the proxy. Used only for likes, saves, follows and de-duplicated view counts.
- **Images.** Uploaded images are resized with `sharp` to WebP (1080 px feed size and 480 px square thumbnail). Storage adapter: local disk in development, Supabase Storage in production.
- **Rendering.** Server Components and Server Actions; small client components for likes, carousels and uploads.
