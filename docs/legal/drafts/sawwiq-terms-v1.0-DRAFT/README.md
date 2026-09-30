# Sawwiq terms: unpublished reference archive

Status: DRAFT / NOT ISSUED / NOT ACTIVE.

Owner instruction (2026-09-30): keep the bilingual terms aside in the repository for reference, with an internal acceptance-tracking reminder/specification, because they have not been published for users to accept.

## What is archived

- `terms.en.md` and `terms.ar.md`: original English and Arabic terms, including all six role schedules.
- `acknowledgements.en.md` and `acknowledgements.ar.md`: original contextual checkbox wording (20 acknowledgements per language).
- `draft-registry.json`: inactive metadata and source checksums; this is NOT an application configuration or a per-user consent ledger.
- `ADMIN_ACCEPTANCE_TRACKING.md`: future admin-board implementation specification, not an implemented feature.

The original formatted PDF/DOCX and wider implementation package remain in the conversation download `Sawwiq_Terms_and_Acknowledgements_Package.zip`. This repository archive copies the four user-facing Markdown sources, not the binary documents or every file from that ZIP. Its SHA256 is recorded in the registry for traceability.

## No activation or implicit acceptance

Do not import this directory into runtime routes or use it to update existing `consentVersion` fields. Do not collect acceptance of draft wording, pre-tick boxes, create synthetic consent records, or mark users as noncompliant for a document not yet issued. Existing registration and identity records remain unchanged. Existing acceptance of older wording, if any, is neither erased nor evidence of accepting this new draft.

Unpublished means not active in the Sawwiq service. Repository access follows GitHub permissions; this is not a confidential storage area. Never put user names, emails, acceptance exports, secrets or other production data here.

## Before any separately authorized rollout

- [ ] Confirm legal operator name, legal form/registration, address, legal contact, privacy contact and effective date.
- [ ] Complete and align the separate Privacy Notice, actual data practices, commercial offers and relevant legal review.
- [ ] Resolve all placeholder fields and obtain owner approval of one immutable bilingual release version.
- [ ] Implement role-specific server-enforced acceptance, auditable version/language/hash/time records and a restricted admin view.
- [ ] Test new and existing users, role changes, declined optional consents, privacy rights, accessibility and localization in isolation.
- [ ] Obtain explicit approval before publication, production schema changes, user reminders or deployment.

## Branch safety

Archive branch: `docs/legal-drafts-2026-09-30`, based on application commit `ecbb2a6661de00b6cfa8b235c13106572c428b76`.

The branch-only `vercel.json` deployment rule disables Git-triggered deployments for this exact archive branch, avoiding its migration-running build command. Main and its deployment settings are unchanged. This branch is a reference archive, not an application release. If integrating the documents later, copy/cherry-pick the documentation deliberately; do not treat this branch as permission to deploy or activate the terms.
