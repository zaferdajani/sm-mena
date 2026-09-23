# 04 · Technical Plan

Optimised for one founder building with Claude Code, low running cost, and a clean path to Phase 3 payments. Nothing exotic.

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | SSR/SSG for SEO city pages, API routes for webhooks, one codebase |
| Styling | Tailwind CSS + shadcn/ui | RTL support via `dir` and logical properties; fast to build forms |
| i18n | `next-intl` | Locale routing `/ar` (default) and `/en`, message files, RTL-aware |
| Database | **PostgreSQL on Supabase** | Managed Postgres, auth, storage, row-level security, EU or Middle East region |
| ORM | Drizzle ORM | Type-safe schema in code, simple migrations |
| Auth | Supabase Auth: phone OTP (buyers and agencies) + email magic link | Jordan users live on their phone number |
| File storage | Supabase Storage (private buckets, signed URLs) | Verification documents, portfolios |
| Email | Resend | Transactional email with ar/en templates |
| SMS / WhatsApp | Provider adapter interface; start with a Jordanian SMS gateway (e.g. local aggregator), add WhatsApp Business API via Meta Cloud API or a BSP when approved | WhatsApp is the channel agencies actually read |
| Payments (Phase 2–3) | PSP adapter interface; first integration HyperPay or MEPS (card), manual CliQ top-ups confirmed by admin; eFAWATEERcom for subscriptions when volume justifies | Licensed in Jordan; split/escrow product for Phase 3 |
| Analytics | PostHog (self-serve, EU cloud) | Funnels for brief form and claim flow |
| Errors | Sentry | |
| Hosting | Vercel (app) + Supabase (data) | Near-zero cost until real traffic |
| CI | GitHub Actions: lint, typecheck, unit tests, Playwright smoke on PR | |

## 2. Repository layout

```
/
├── CLAUDE.md                 ← build rules for Claude Code
├── README.md
├── docs/                     ← this plan
├── data/                     ← taxonomy, seed template, financial model
├── app/                      ← Next.js App Router
│   ├── [locale]/
│   │   ├── (public)/         ← home, directory, agency/[slug], city/[city], service/[key], brief/new
│   │   ├── (buyer)/          ← dashboard, briefs/[id], proposals, messages
│   │   ├── (agency)/         ← agency/dashboard, profile, briefs, proposals, billing, verification
│   │   └── (admin)/          ← admin/verifications, briefs, agencies, reviews, metrics
│   └── api/                  ← webhooks (psp, sms), cron (expire briefs, review prompts)
├── components/
├── lib/
│   ├── db/                   ← drizzle schema, migrations, seed
│   ├── auth/
│   ├── matching/             ← scoring engine (pure functions, unit tested)
│   ├── notifications/        ← email, sms, whatsapp adapters
│   ├── payments/             ← psp adapter interface + implementations
│   └── i18n/
├── messages/                 ← ar.json, en.json
├── tests/                    ← unit (vitest), e2e (playwright)
└── scripts/                  ← import-agencies.ts, generate-city-pages.ts
```

## 3. Environments and secrets

`.env.example` lists every variable with a comment. Never commit real values.

```
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_DEFAULT_LOCALE=ar
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
SMS_PROVIDER=            # mock | <gateway>
SMS_API_KEY=
WHATSAPP_PROVIDER=       # mock | meta
WHATSAPP_TOKEN=
PSP_PROVIDER=            # mock | hyperpay | meps
PSP_MERCHANT_ID=
PSP_SECRET=
POSTHOG_KEY=
SENTRY_DSN=
CRON_SECRET=
```

All external providers have a `mock` implementation so the whole product runs locally and in CI without credentials.

## 4. Key design decisions

1. **Country column from day one.** `Agency.country`, `Brief.country`, `City.country`. Launch with `JO` only.
2. **Budget bands, not free numbers, on briefs.** Simplifies matching and protects buyers from anchoring.
3. **Anonymised briefs until response.** Agencies see business type, needs, budget band and city. Contact details unlock after a proposal is submitted (and the lead fee charged). This is the leakage control.
4. **Pure-function matching.** `lib/matching/score.ts` takes a brief and an agency and returns a score with breakdown. Unit tested. The admin UI shows the breakdown.
5. **Provider adapters.** Notifications and payments sit behind interfaces with mock, so Claude Code can build and test every flow before any vendor contract exists.
6. **Audit log on personal data access.** Required to answer PDPL access requests and to investigate leakage.
7. **Static generation for SEO pages.** Directory, agency profiles, city and service pages are statically rendered and revalidated on change.

## 5. Security and privacy checklist

- Supabase RLS on every table; service role only in server code.
- OTP: 5 attempts per phone per hour; codes expire in 5 minutes.
- Signed URLs (15 minutes) for verification documents; never public.
- Phone numbers masked in UI except to the counterparty after a response.
- Consent text versioned; `consent_version` stored on User and Brief.
- Data deletion: `/api/privacy/delete` anonymises User, Brief contact fields, messages; keeps aggregate metrics.
- Dependabot enabled; `npm audit` in CI.
- Rate limiting on brief submission and claim endpoints (Upstash or Vercel middleware).

## 6. Deployment

- `main` → production on Vercel; `develop` → preview.
- Supabase project per environment (dev, prod).
- Migrations run in CI before deploy (`drizzle-kit migrate`).
- Cron via Vercel Cron: expire briefs (daily), review prompts (daily), response-rate recompute (hourly).
- Domain: `<name>.jo` primary, `.com` redirect. Arabic default at root.

## 7. Testing strategy

- Unit: matching scores, budget band logic, fee/refund accounting, consent versioning.
- Integration: brief submission → moderation → routing → notification (mock adapters).
- E2E (Playwright): buyer brief flow in Arabic on mobile viewport; agency claim → verification submit; admin verify → agency appears in directory.
- Load: not needed before Phase 2.
