# First-run portfolio setup — owner clarification, 29 September 2026

## Status and precedence

SPECIFICATION / NOT YET IMPLEMENTED. This commit changes requirements and handoff only. It does not implement or deploy the wizard. The branch currently implements a replayable guide page and field highlights; that is useful supporting help, but it does NOT satisfy this first-run requirement. Build the wizard below before calling onboarding complete. This document supersedes the help-page-first UX in README.md, not the security and provider requirements in SOCIAL_CONNECTIONS.md. Preserve other sessions' changes and the owner's registration-beta approach: free profile building first, advanced contracts/payments/subscriptions withheld according to the actual launch gates.

## Owner's requirement

A new provider does not know Sawwiq. Do not expect them to read a long guide or discover the right Studio tabs. Begin immediately after provider registration: "Let's set up your portfolio." Show one short step at a time, accept real input in that step, save it, and take them to the next relevant step. Show their own logo/photo, client accounts, projects and media taking shape. Offer existing imports and operational social connections at the beginning, not as a late hidden feature.

The task is NOT to add another checklist, tooltip library, modal over a full dashboard, or five links to disconnected long forms. Supporting examples/highlights stay available on demand inside the relevant step. Completing the flow must create an actual saved portfolio through existing validated data/media operations, not just set a tour-completed flag.

## Default flow: five short steps

### 1 — Your profile

Heading: "Let's set up your portfolio."
Instruction: "Add your logo or photo and tell us what you do."
Fields: editable logo/profile image, the provider name already entered during registration, a short introduction, and existing service choices prefilled. Do not ask for information the user already supplied. Keep the name and introduction in the provider's saved content language; interface language switching must not replace either text. Image crop/preview stays bounded. A creator may use their own photo; an agency may use its logo. No forced business verification, pricing or team-size form. Details can be edited later. The logo is encouraged but skippable; do not block a genuine first work sample solely for a missing photo.
Primary action: "Save and continue". Secondary action: "Do this later".

### 2 — Bring in your work

Heading: "Where is your work?"
Three compact source choices, with provider/file details revealed only after a choice:
- "Upload my files" — the current supported image workflow; explain supported formats at the picker, not a paragraph at the top.
- "Import an existing portfolio" — PDF or Behance when portfolio_import is actually on; preserve the existing source credits, permission checks and review flow.
- "Connect a social account" — Google identity, YouTube, Instagram, Facebook and TikTok listed with their actual provider readiness. Only implemented, configured and approved capabilities offer a working Connect action. Unavailable providers show a short honest reason plus the upload alternative; no fake callback, fake Connected state, or app-key-only promise.

Google identity linking is not content-import permission. Account connection, media selection and public display are separate actions. Ask "My account" or "A client account I manage" where relevant, then choose the authorized resource. Authentication/consent may leave Sawwiq temporarily, but it must return to this wizard's selected source/step with the user's draft intact. Denial, blocked popups or expired access lead back to a working manual option.

The current inspected branch has guidance plus a social integration SPECIFICATION, not implemented social OAuth. Do not imply the social connections were built merely because the user remembers the earlier research/plan. Implement per SOCIAL_CONNECTIONS.md, release supported slices and record missing external approvals separately.

### 3 — Who was it for?

Heading: "Who did you make this for?"
Show a selector of this provider's existing client/brand records and a small inline "Add client or brand" form. Initially ask only a name; an account/logo or public social link can be expanded optionally. Also offer "Personal or practice work" and "Keep the client private" without forcing a made-up client or an identifiable customer record. Explain confidentiality before writing any publicly visible client record. A pasted URL is a public link, not proof of access or a client endorsement.

One-line example (explicitly illustrative): "Example café → menu-launch campaign → photos and designs."

Use client names/account associations already provided by an authorized import as suggestions. Require confirmation; never silently infer an endorsement from a title. If the import already grouped and confirmed its client, show the selection prefilled and let the user continue rather than repeating data entry. Never select another tenant's client even with a crafted request.

### 4 — Add one project

Heading: "Show one piece of work."
Fields: project/work label, the creator's contribution in one short sentence, relevant services, and the media selected in step 2. Images within one project belong together. The first image is the cover, with an explicit change/reorder affordance. A single image is enough. The current image form allows 1–10 images/screenshots; do not claim raw video support where it does not exist. Imported videos must use a supported, policy-compliant media/display type, not a caption hack or app-mall impersonation.

Allow permitted source selection, manual addition/removal and cover review here. A source importer must return selected draft content to the same flow; merely redirecting to an importer and forgetting the wizard does not qualify. If the existing importer currently publishes immediately, refactor its review/publish boundary so setup can stage selected items privately for step 5. Keep its established non-onboarding behavior working.

Show one optional "See an example" expansion. Reuse the existing examples without pre-filling fictitious clients, images, roles or result numbers. Outcomes/results are optional and require support; do not ask new creators to invent performance figures. Additional projects for this client and additional clients come after the first successful project, through the same familiar loop.
Primary action: "Preview". It must not publish.

### 5 — Preview and finish

Heading: "This is how your portfolio will look."
Render a truthful preview of the provider header/logo, optional client, project, cover and media. Give small Edit actions returning to the right step without losing the work. Preview must use the same presentation components as the actual portfolio where practical, not a prettier disconnected mockup.

In registration/private-profile beta: finish with "Save my portfolio" and an explicit visibility message. Do not make a draft public or expose sparse marketplace discovery just because setup is complete. When public publication/sharing is enabled under the actual launch policy, use an explicitly labelled publish/share action with a rights confirmation. Saving, finishing the wizard, connecting a platform and making work public are distinct events. Do not retrofit silent public auto-publishing into the beta.

Success copy must reflect the data: "Your first project is saved" / "Your first project is published", not "Your profile is verified" or "Everything is complete" if required work was skipped. Show only "Add another project", "Add another client", and "View my portfolio" as appropriate. Do not drop users into contracts, money dashboards or empty public listings. More advanced setup is optional and later.

## Navigation and progressive disclosure

One task-focused screen, one obvious primary action, a small "Step n of 5" indicator, Back, and "Finish later". The indicator reports position, not a fabricated quality/eligibility percentage. Previously supplied valid information is prefilled; do not automatically advance past an unsaved change. Optional requirements are labelled and skippable. The number of long paragraphs in the primary task area should be zero; explanatory text is one or two short sentences, with examples in a collapsed panel.

Within the wizard, hide unrelated Studio navigation and promotional/finance panels without removing routes or changing global permissions. Keep language, help, exit and account controls reachable. On mobile, one column, bounded media, labels above inputs, touch targets at least 44px, no horizontal overflow at 320px, and the primary action above the keyboard when possible. Avoid expensive full-screen motion; respect reduced motion, restore focus after transitions, announce errors and step changes, and retain a readable 200% zoom layout.

## Entry, resume and state

After successful agency/freelancer/provider registration, start the wizard automatically; clients, referral agents and staff retain their role-specific destinations. Current signup redirects to /studio/profile?welcome=1 (also &invited=1). Reuse or redirect that entry into the wizard, preserving invite acceptance and a brief invitation notice. Do not hijack ordinary login or replace the existing full profile editor. Returning established providers see a non-intrusive optional invitation, not a forced restart.

Persist saved progression/draft references per authenticated owner and tenant on the server, with additive migrations if needed. Track not_started, in_progress, paused and finished separately from public publication and Founder status. Resume from actual saved data and safe draft state. Do not trust URL parameters, completion flags, provider readiness claims or client ids from the browser. Explicitly recheck ownership/authorization on every read/write. Avoid saving secret tokens or whole unrelated API payloads in draft JSON.

Draft text and selected-media references should survive validation failures, Back/Next, import callbacks, reload and a later authenticated session. Local File objects alone do not meet durable-save requirements. Persist draft uploads in private storage through the existing authorized media infrastructure with expiry, quota and deletion handling; never make draft URLs public or send them to external AI. If a file has not yet reached durable storage, show uploading/not saved and warn before navigation; do not say "Saved" until it has. Preserve third-party media deletion/expiry/attribution policies. Never re-download restricted raw media to implement draft persistence.

Save only changed profile fields. The current full updateProfileAction replaces numerous fields, so do not send a partial wizard form through it with omitted contacts/languages/roles translated into empty values. Extract/reuse safe patch operations with validation, rather than copying an unbounded second CRUD system. Repeated Continue/publish/import requests must not create duplicate clients, projects or charges. Version drafts and accepted writes to protect against stale tabs and retry races.

## Inspected integration points (re-check current main)

- app/[locale]/(auth)/actions.ts: signup destination and invite acceptance.
- app/[locale]/(main)/studio/profile/page.tsx: current welcome entry; GoogleForm here is not general Google OAuth evidence.
- components/studio/profile-form.tsx and studio/actions.ts: full profile editor, existing avatar compression, validators and broad update semantics.
- app/[locale]/(main)/studio/setup/page.tsx, creator-guide.tsx and messages/creator/: supporting guide/examples to refactor, not the final first-run experience.
- studio/new/page.tsx, post-form.tsx, lib/data/posts.ts: image/media validation, post limits, source and publishing boundaries.
- lib/data/portfolio-clients.ts and client-form.tsx: owned clients, links, confirmation, max-client behavior; preserve confirmation status and credits.
- studio/import and studio/import/behance: actual existing imports, readiness gates, selection/review and published/draft output boundaries.
- studio/layout.tsx: avoid overwhelming onboarding with all Studio tools. Normal navigation/badges remain intact outside the flow.
- SOCIAL_CONNECTIONS.md: authoritative OAuth/security/provider prerequisites; implement adapters only through genuine consent/approval paths.

## Acceptance — do not mark these passed from a document commit

1. A genuinely new provider reaches step 1 after registration; ordinary returning-provider, client, staff, and referral-agent routes still work, including accepted invitations.
2. The manual path saves logo/profile, chooses or creates an owned client, selects media, explains a contribution, previews and saves/publishes deliberately without visiting unrelated Studio pages.
3. The manual path also works without a logo, without a client and for explicitly labelled personal/concept work; unknown outcomes remain empty.
4. Continuing a short profile step preserves existing contacts, roles, translations, services not edited, review/client verification and Founder rules.
5. PDF and Behance paths return draft selections to the relevant wizard step, prefill known information once, preserve attribution, and never create public duplicate projects from repeated callbacks.
6. Configured and approved social providers complete genuine authorize/resource selection/review flows. Unavailable providers display honest states, deny cannot trap the user, and no fake connection or raw credential prompt is rendered.
7. Authorizing a managed client account does not assert authorship, client endorsement or public disclosure. Cross-agency resource/client/draft identifiers are refused server-side.
8. Reload, interruption, Back, validation failure, disconnect and re-login resume only the right provider's saved draft; unsaved files are never described as persisted.
9. Preview/Next/import/connection actions have zero unintended public publication, outreach, fees, contract changes or founding-seat consumption. Explicit final publishing uses existing gate and rights rules.
10. Registration-beta finish stays private according to the actual beta visibility policy; sharing is separate and explicit. Existing live/public workflows are not silently rewritten.
11. Clear success, pause/resume, re-entry and add-another-project/client loops work; completion does not hide missing required work or fabricate verification.
12. Arabic/English, 320/390/768/1440px, RTL/LTR, dark/light, keyboard, reduced motion and 200% zoom pass with real-image screenshots. Highlights/examples never erase entered content.
13. Unit/integration coverage includes stale drafts, retries, quotas, private-file access and no-credentials operation; full pre-existing CI and signed-contract/payment/Founder regression tests remain intact.
14. Final acceptance includes a controlled authenticated production journey, source SHA/revision match, and durable sanitized evidence. A successful build, walkthrough outline or provider mock alone is not proof that the wizard is live.

## Research grounding and measurement

Behance's official project flow separates content entry, Continue, cover/project details, and Save draft versus Publish; use that staged interaction pattern without importing its exact UI or assuming its feature set is our current implementation: https://help.behance.net/hc/en-us/articles/204483684-Guide-Create-Publish-A-Project (read 29 September 2026). Our step count and task wording are a Sawwiq design decision based on this owner's users, not a claimed competitor benchmark.

Once functional, test consenting first-time creators with no verbal coaching: can they distinguish their identity, a client account, a project and its media, save one genuine project, and resume an interrupted import? Record completion/abandonment, corrections and time on task with denominators. No fixed "two minutes", conversion lift or superiority claims until measured.
