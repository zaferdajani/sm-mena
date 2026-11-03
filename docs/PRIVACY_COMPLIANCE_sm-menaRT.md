# Privacy compliance report: sm-mena (Sawwiq)

Branch `claude/privacy-compliance`. Scope: Saudi PDPL, Jordan PDPL, GDPR. Nothing was merged, deployed or applied to any database; migrations are files only.

## Items and status

| # | Item | Status |
|---|---|---|
| 1 | TeamManager AI minimisation | N/A (other repo). Here the AI already never receives client phones or emails (CLAUDE.md); the policy states it. |
| 2 | Public buckets to private | N/A for the TeamManager and clinic buckets. Here Storage already splits a public bucket (brand and published portfolio images) from a private bucket (`collab/`, `drafts/`, `portfolio/`, `support/`), served through access-checked routes. No change needed. |
| 3 | RLS on all tables | **Done.** Migration `0046_enable_rls.sql` enables RLS on every public table, with no policies (deny-all for Supabase `anon` and `authenticated`) and revokes their table privileges. The app connects with a direct Postgres connection (drizzle, `DATABASE_URL`) as the table-owning `postgres` role, which bypasses RLS (BYPASSRLS on Supabase; superuser on PGlite and local Postgres). RLS is deliberately not forced. supabase-js is used only for Storage with the service role, never for table access. Unit test `privacy-db.test.ts` fails if any public table lacks RLS, so new tables must enable it. |
| 4 | clinic-clock-guardian edge function | N/A (other repo). |
| 5 | Account deletion removes Storage files | **Done.** `lib/data/account-erasure.ts`; `deactivateAgency(..., "self")` deletes avatar, post images and thumbnails, client logos and staged setup images, plus posts. Admin and demo closures keep files so support can reopen. Client (business owner) accounts upload no files. Work-order deliverables and contracts stay (shared with the other party, legal duty). Test `account-erasure.test.ts`. |
| 6 | Incident response | **Done.** `docs/INCIDENT_RESPONSE.md` (detection, containment, SDAIA and GDPR 72 h, informing users, contact placeholders). No `breach_incidents` table exists in this repo, so no alert wiring. |
| 7 | Privacy policy and consent | **Done.** `PolicyPrivacy` rewritten in Arabic and English (13 sections: controller, data, legal bases, AI, named vendors, transfers, cookies, retention, rights, 30-day response, children, security, changes). Real vendors found in code: Vercel (London), Supabase (London), Anthropic, OpenAI, Resend, Google Places, Google Analytics, payment partner. Sign-up screens already had a required policy checkbox; the agency form already had a separate unticked marketing box; added the same unticked marketing box to the business-owner sign-in. |
| 8 | Consent log, age gate, export, retention, subprocessors, GA gating | **Done.** `consent_log` table (migration 0045) written by `createUser` with policy version `2026-11`. The 18+ declaration was already required at every sign-up (kept; consent log records it). "Download my data" JSON: `/api/account/export` with buttons in Studio security and for business owners. Retention: the daily `/api/cron/retention` already existed; migration `0047_retention_pg_cron.sql` adds pg_cron jobs (sessions, page views 13 months, events 26 months, error events 12 months), skipped where pg_cron is unavailable. `/subprocessors` page linked from the footer and sitemap. Google Analytics: the repo had no gtag; added a banner with equal-size Accept and Reject buttons that loads `gtag.js` only after Accept and only when `NEXT_PUBLIC_GA_ID` is set; footer "Cookie settings" reopens the choice. |
| 9 | DPA checklist | **Done.** `docs/DPA_CHECKLIST.md`. |

## Test status

- `npm run typecheck`: pass. `eslint` on `lib app components tests/unit`: pass.
- `vitest run`: 116 files, 681 tests pass (new: `account-erasure`, `privacy-db`, `analytics-consent`). One earlier full run had a `beforeAll` timeout in `chat.test.ts` under load; it passes alone and on the next full run.
- Playwright e2e and `next build` were not run in this session; the new banner renders nothing unless `NEXT_PUBLIC_GA_ID` is set.
- Migrations were exercised only on in-memory PGlite (all tests run them), never on Supabase.

## What the owner must do

1. Review and approve the policy text in `messages/en.json` and `messages/ar.json` (`PolicyPrivacy`, `PolicySubprocessors`) with a lawyer. Fill `[LEGAL ENTITY NAME]` / `[REGISTERED ADDRESS]` (and the Arabic equivalents). Confirm the retention periods match practice (briefs 24 months, sessions, backups 35 days) and that the Jordan law reference is right.
2. Confirm the privacy@sawwiq.org mailbox exists and is monitored; answer requests within 30 days.
3. Sign the DPAs/SCCs in `docs/DPA_CHECKLIST.md`; name the payment partner in `/subprocessors`.
4. Apply migrations 0045, 0046, 0047 with `npm run db:migrate` (Vercel runs it on deploy). Before 0046 on production, confirm `DATABASE_URL` connects as the `postgres` role (not `anon`/`authenticated`); enable the pg_cron extension in Supabase if you want 0047's jobs.
5. Decide on Google Analytics: set `NEXT_PUBLIC_GA_ID` only if wanted; configure IP anonymisation and short retention in GA4.
6. Fill the contacts in `docs/INCIDENT_RESPONSE.md` and check SDAIA's current breach-notification channel.
7. Same changes should reach staging per CLAUDE.md (`cursor/staging-qa-fafd`); this branch was not merged anywhere.

## Not done / limits

- Cross-border AI consent switch per organisation (TeamManager) does not apply; sm-mena has `AI_PROVIDER` fallback to the rule-based matcher with no credentials.
- No separate parental-consent flow; sign-up is blocked for under-18s by the existing declaration.
- Full consent/age declarations of accounts created before 2026-11 are not back-filled into `consent_log` (their `users.consent_*` columns still hold the proof).
