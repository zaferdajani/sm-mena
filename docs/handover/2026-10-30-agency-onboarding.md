# Handover prompt — agency onboarding redesign (30 Oct 2026)

Paste everything below into a new Claude Code session on `zaferdajani/sm-mena`.

---

You are continuing the agency onboarding redesign. Read `CLAUDE.md`, `docs/65-agency-onboarding-council.md` (the plan, the council's verdict and what was built), `docs/53-first-run-setup-and-connections.md` (the one-screen setup) and `docs/51-registration-phase.md` (publication is a real, audited permission) first. The specialists' full notes are in `docs/ux-council/2026-10-30/`.

How work ships here: develop on branch `claude/bug-agent`, run lint, typecheck, unit tests and the relevant e2e specs, merge `origin/main` into the branch, push it, then push it to `main` (`git push origin HEAD:main`). Then merge the same commits into `cursor/staging-qa-fafd` (never reset or force-push it) and push; `git diff origin/main origin/cursor/staging-qa-fafd` must show only staging-only files. Check `https://sawwiq.org/api/version` and `https://staging.sawwiq.org/api/version` afterwards.

Rules:
- Never change payments, escrow, contracts, monetization, pricing, legal text, permissions or authentication rules unless the owner asks. The publication acknowledgement (`Registration.publication.acknowledge`), the terms box and the 18+ box keep their wording and consent version.
- Every user-facing string lives in `messages/ar.json` and `messages/en.json`; Arabic first, RTL, 390 px first, logical CSS, providers optional.
- Nothing is pre-ticked; nothing is published without the rights box; a change of audience always needs the acknowledgement.

## Built and live (30 Oct 2026)

- One-screen sign-up (`app/[locale]/(auth)/join/join-form.tsx`): page link suggested from the name (`suggestHandle` in `lib/core/catalog/text.ts`), inline errors in the page's language, agent code behind a line, team/services/specialties moved out of sign-up.
- One-screen first-run setup (`components/setup/wizard.tsx`, `app/[locale]/(main)/portfolio-setup/actions.ts` → `finishSetupAction`, `pauseWithDraftAction`, `setVisibilityAction`): photos / PDF pictures / Behance, name, "What did you do?" chips saved as the page's services, optional part and client, the publish box with the three audiences, a live screen with the link, Share on WhatsApp and Copy link.
- Studio: four tabs plus "+ Add work" and "More" (`components/studio/studio-nav.tsx`, `components/registration/studio-shell.tsx`, `app/[locale]/(main)/studio/layout.tsx`); honest progress from `lib/core/rules/page-strength.ts` (`components/studio/page-strength-card.tsx`).
- Fixes: owner-match suggestions skip private pages; `/studio/new` no longer pre-ticks a service; the English language bar is hidden in sign-up, setup and Studio; 29 Arabic strings moved to Modern Standard Arabic.
- Tests: `tests/e2e/join-steps.spec.ts`, `tests/e2e/portfolio-setup.spec.ts`, `tests/unit/page-strength.test.ts`, `tests/unit/text.test.ts` (suggestHandle); `tests/registration/registration.spec.ts` and the role/services/welcome/agency specs were moved to the page editor where team roles and services now live.

## Next (in order; each one ships on its own)

1. **Owner answers still open** (see docs/65 "Questions for the owner"): one combined rights-and-audience box (needs legal), founder benefits tied to a published page, done-with-you setup for the founding 100, reminders by email only or WhatsApp too. Do not build any of these before the owner answers.
2. **Live screen additions (council-competitors.md):** an availability toggle "متاح لمشاريع جديدة" (default on; a new `agencies.available_until` or boolean, fed to `pageStrength` as freshness) and "ask a past client for a review" (a WhatsApp template with the existing signed review-invite link from `components/studio/review-invite.tsx`).
3. **"Make it stronger" first step = one service card**: service, price from (JOD), delivery days, optional revisions; then team size band and minimum project; each with the reason "clients filter by this". Reuse `/studio/packages`.
4. **Setup reminders (opt-in):** an unticked box at sign-up, at most 3 emails over 7 days, stopping when the page is match-ready; through the existing half-hourly Site check. No reminder without the box. Never log the address.
5. **Funnel events without personal data:** `join_view`, `account_created`, `first_photo_uploaded`, `page_published`, `link_shared`, `wa_click`; activation = published and match-ready within 24 h, and first WhatsApp click or quote within 7 days.
6. **Bulk first run:** many projects at once from one PDF or many photos as project cards (the review screen of `components/studio/portfolio-import.tsx` already does this for the import tool); then the first-run screen and `/studio/new` can share one "add work" component.
7. **PWA share target** so "Share → Sawwiq" from Photos or WhatsApp opens the add-work screen with the images loaded. No provider needed.
8. **Handle policy after first publish:** editable until the first publish, then one change with a 301 from the old link.

## Known gaps
- `tests/live/setup-journey.mjs` (the manual live check) was updated for the one screen but has not been run against production since.
- `tests/e2e/teaser.spec.ts:24` still assumes fewer than 100 agency sign-ups before it runs.
- Reports filed on staging go to the staging database and are not seen by the bug agent.
