# 53 · First-run portfolio setup

Owner requirement (29 Sep 2026, docs/upgrades/creator-onboarding/FIRST_RUN_WIZARD.md): a new provider does not know Sawwiq and must not be left to discover Studio tabs. Right after registration they land in a five-step setup at `/setup` that accepts real input, saves it and shows the portfolio taking shape. The setup guide at `/studio/setup` stays as supporting help; it is not the first-run experience.

## The five steps

| Step | Screen | What is saved |
|---|---|---|
| 1 | Your profile: logo or photo, short introduction, services | The agency's `bio`, `services`, `avatarKey` through `updateAgency` (a patch of exactly these fields; contacts, roles, translations and the name are untouched) |
| 2 | Where is your work?: upload / import (PDF, Behance) / connect a social account | Uploaded images go to the draft's private media; import pages opened with `?from=setup` stage the first kept project into the draft and return to step 3; social providers are listed with an honest "not available yet" and no Connect button (no app is approved; see SOCIAL_CONNECTIONS.md) |
| 3 | Who did you make this for?: an existing client, a new one (name only), personal work, or "keep the client private" | `client_mode`, `client_id` (must belong to the agency; a suggested name from an import is prefilled but never written without confirmation) |
| 4 | Show one piece of work: label, one-sentence contribution, services, platforms, media with cover and remove/add | The draft's project fields; the first image is the cover |
| 5 | Preview and finish | The real `ProfileHeader` in preview mode plus the project; "Save my portfolio" creates one post |

Every screen has "Step n of 5", Back and "Finish later" (the draft is paused; `/studio` opens as usual). Explanatory text is one or two sentences; examples sit in a collapsed panel (the existing `PortfolioExamples`).

## Data and state (`lib/data/onboarding.ts`, migration 0029)

`onboarding_drafts`: one row per agency (unique), owned by the owner user, with `status` in_progress | paused | finished, `step`, a `version` that every accepted write increments, the source, client choice, project fields, `media` (private keys under `portfolio/<agency>/drafts/…`, served only through the access-checked `/api/portfolio-media` route) and `expires_at`.

- Every read and write is scoped by the signed-in agency; a client id is verified against the agency before it is stored; a foreign media key is ignored.
- Forms carry the draft version. A form built from an older version (a stale tab) is refused and the page reloads with a notice; nothing is overwritten.
- Files are not "saved" until they are in storage: the upload form says so while uploading.
- `finishDraft` claims the draft with a version-checked update and then creates the post through `createPostFromStoredImages`, the same rows as Studio → New, reusing the private keys (no copy). A draft that already produced a post returns that post on any later submit, so a double click or a retry never creates a second post. Visibility is not touched: the post is as visible as the page is (registration beta: the page's publication setting; the finish screen says which).
- "Add another project" resets the draft to a new in-progress one, keeping the client when asked; "Add another client" starts at step 3.
- The daily cron (`/api/cron/retention`) deletes unfinished drafts older than 30 days with their private media. Finished drafts are history and stay.

## Entry and resume

Registration redirects to `/setup?welcome=1` (with `&invited=1` when a collaboration invitation was accepted). Sign-in goes to the Studio as before; the Studio's setup nudge offers "Set up my portfolio" while the page has no posts; the registration-phase Studio's "Add work" step opens the wizard for an empty page. Reload, Back, a validation error, a new sign-in and an import callback all return to the saved draft.

## Not in this release

Native social connections (OAuth) per SOCIAL_CONNECTIONS.md: the wizard shows their honest state and the upload alternative. Draft persistence of a PDF's local pages is not needed: the import stages processed images server-side. Crop UI: the avatar is centre-cropped as in the profile editor.

## Tests

`tests/unit/onboarding.test.ts` (one draft per agency, stale version, foreign client and key, media cap and cover, single post on finish and idempotent retry, private/personal work, purge). `tests/e2e/setup-wizard.spec.ts` (Arabic and English, phone and desktop: register → five steps → one post, reload and re-login resume, social providers unavailable, stale tab refused, returning provider not forced). Existing suites still register through the same form and now land in the wizard.
