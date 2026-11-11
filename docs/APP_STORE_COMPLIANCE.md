# App Store / Google Play compliance status

Scope: this repo is a Next.js web app with an Expo beta in `mobile/` (docs/64). Native builds are not submitted yet. Items below say what was done in code, what is N/A, and what the owner still has to do.

| # | Reason | Status |
|---|---|---|
| 1 | External checkout for digital goods | **N/A today.** No digital goods or subscriptions are sold; paid plans are off (`MONETIZATION_ENABLED`) and contract payments are for real-world B2B services through a licensed partner. **Owner/dev:** before enabling any digital-goods plan, hide it in native builds or add IAP (RevenueCat) behind an abstraction. No IAP code was added because nothing needs it. |
| 2 | Sign in with Apple | **N/A.** Sign-in is email + password (agencies) and email code (business owners). There is no Google or other social sign-in. If one is added, add Sign in with Apple. |
| 3 | In-app account deletion | **Done / existing.** Agencies: Studio → Security → Close my account (`deactivateAgency`); business owners: My requests → Close my account (`closeClientAccount`). Both confirm, sign out all sessions and keep only contracts and the append-only ledger as the law requires. New public page `/delete-account` (AR/EN) for Google Play, linked from the footer and shell. **Owner:** enter that URL in the Play Console data-safety form; confirm with a lawyer what must be erased versus retained. |
| 4 | Native value / offline | **Partly done.** `OfflineBanner` shows a notice when the device is offline (all locales). Capacitor is not used (the native beta is Expo), so haptics, splash, status bar and push were not added here. **Remaining:** native beta should add push, share sheet and haptics (docs/64) so the app is more than a website. |
| 5 | Reviewer demo account | **Done.** `scripts/seed-demo-account.ts` (`npm run seed:demo-account`) reads `DEMO_EMAIL`/`DEMO_PASSWORD` from env; `docs/APP_REVIEW.md` has the review notes. **Owner:** choose credentials, run the script against the target database, enter them in the store consoles. |
| 6 | iPad layouts 768–1366 px | **Reviewed.** Layout uses logical properties, fluid grids and `max-w-*` containers (no fixed widths found; the layout e2e already runs at 768). The feed column stays 470 px until `lg`; acceptable. **Owner:** check on a real iPad before submission. |
| 7 | Screenshots match the app | **Documented** in `docs/APP_REVIEW.md`. **Owner:** capture them from the build under review. |
| 8 | No "Coming soon" screens | **N/A / existing.** "Coming soon" appears only for features an admin switches to that state (Admin → Features), not as static placeholder pages. **Owner:** for the store build, set those features to on or off, never "soon". |
| 9 | Privacy, Terms, Support | **Done.** `/privacy`, `/terms` (draft text in `messages/*.json`, namespaces `PolicyPrivacy`, `PolicyTerms`, marked "for owner and legal review"), `/support` and `/legal`; linked from the footer, the app shell, sign-in and sign-up, and in the sitemap. **Owner:** replace the draft text after legal review; add the policy URL in both store consoles. |
| 10 | UGC report / block / moderation | **Done.** Post reports and the admin review list already existed. Added chat Report and Block (`components/chat/chat-safety.tsx`, `reportChatAction`, `blockChatAction`), `reports.conversation_id` (migration `lib/db/migrations/0044_chat_reports.sql`, not applied), audit entries, and a link from Admin → Reports to the reported chat. Block closes the conversation for both sides (support can reopen); provider-to-provider blocks (`collab_blocks`) already existed. **Owner:** apply the migration at deploy; commit to a review SLA (Apple expects action within 24 h). |
| 11 | Restore Purchases | **N/A** (no purchases). Add with the IAP abstraction if item 1 ever applies. |
| 12 | Paid features labelled | **Existing.** Paid plans only add a "Featured" label and capped priority (CLAUDE.md); the Terms page states this. Paid screens are off. |

Paywall/plans screens must link the Privacy Policy and Terms; the `/privacy` and `/terms` routes exist for that.

## Owner checklist
1. Apple Developer / Google Play accounts and signing keys; Expo EAS config (`mobile/eas.json`).
2. Final Privacy Policy and Terms text; support email and URL in store listings.
3. Demo credentials via `npm run seed:demo-account`.
4. Apply `0044_chat_reports.sql` with `npm run db:migrate` when deploying.
5. If digital-goods plans or social sign-in are ever added: RevenueCat account and product IDs, Sign in with Apple keys.
