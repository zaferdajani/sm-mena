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
2. ~~Live screen additions~~ **Done 31 Oct:** "Open to new projects" switch (`agencies.accepting_projects`, migration 0042, `lib/data/availability.ts`, `components/studio/availability-toggle.tsx`), the badge on the public page, the 60-day "still open?" nudge, and the review request on the live screen.
3. ~~"Make it stronger" first step~~ **Done 31 Oct:** first service card and the two basics on `/studio/packages` (`first-service-card.tsx`, `page-basics.tsx`, `strength-actions.ts`). Also done: in-app support notices (`lib/data/support-inbox.ts`, docs/63).
4. ~~Setup reminders~~ **Done 31 Oct** (`lib/data/setup-reminders.ts`, daily via `/api/cron/retention`; the toggle under Studio → Account). Email only: WhatsApp reminders wait for the owner's answer and a template provider.
5. ~~Funnel events~~ **Done 31 Oct** (`lib/data/funnel.ts`, tiles on `/admin`). `wa_click` is the existing `contact_click` with channel whatsapp.
6. **Bulk first run (still open):** many projects at once from one PDF or many photos as project cards (the review screen of `components/studio/portfolio-import.tsx` already does this for the import tool); then the first-run screen and `/studio/new` can share one "add work" component.
7. ~~PWA share target~~ **Done 31 Oct** (`app/manifest.ts`, `app/api/share-target/route.ts`). Only an installed app on Android Chrome shows "Sawwiq" in the share sheet; iOS Safari does not support share targets.
8. ~~Handle policy~~ **Done 31 Oct** (`lib/core/rules/handle-policy.ts`, `agencies.previous_handle`, permanent redirect in `/a/[handle]`).

## Known gaps
- `tests/live/setup-journey.mjs` (the manual live check) was updated for the one screen but has not been run against production since.
- `tests/e2e/teaser.spec.ts:24` still assumes fewer than 100 agency sign-ups before it runs.
- Reports filed on staging go to the staging database and are not seen by the bug agent.
