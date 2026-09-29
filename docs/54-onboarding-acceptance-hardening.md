# Portfolio setup acceptance hardening

Prepared 29 September 2026 against the five-step wizard and native adapter implementation merged by PR #23 (main a0787961). This is implemented source and regression coverage, not a provider-approval or full-production-acceptance claim.

## Changes
- Final publication's draft version claim, post, images, provider count, source checkpoint and audit now commit in one database transaction. Concurrent callbacks/tabs return the same successful result; stale edits invalidate publication. Failed upload/commit attempts remove only their own newly generated files.
- Profile patch plus wizard progress/audit is atomic. A stale short form cannot change the public profile before returning an error. Existing omitted profile fields remain unchanged.
- Client creation uses an agency row lock and normalized same-name reuse, and commits the wizard selection with the client. Stale requests cannot create unused client records.
- Draft media batches validate before staging, enforce the ten-image limit under a row lock, and change the draft version. Reordering/removing media cannot silently change an in-flight reviewed publication. Restart refuses to erase an unfinished draft.
- Step-four Back and Finish later save bounded incomplete project text and return the server version. Publication validation remains stricter; saving a draft is not publishing it.
- OAuth attempts require the initiating user/session/provider before consumption; an unrelated callback cannot burn a legitimate state. Actual token refresh is serialized, not only the final token write. Disconnect invalidates outstanding versions; delayed provider replies cannot recreate removed source items or reopen a revoked grant.
- Non-displayable source items cannot become selectable database records, and expired metadata is rejected before retention cleanup. Provider responses are bounded while streaming by byte count, not only after buffering text.
- A visible release revision (portfolio-setup-v1.1) identifies this repair. The release test reads the same constant.

## Validation
Twelve new database/security tests run both in the default isolated PGlite suite and against disposable localhost Postgres. They exercise race conditions, transaction rollback, stale tabs, upload limits, refresh token single use, disconnect races and bounded untrusted responses. Existing provider tests are strengthened rather than skipped. Browser coverage includes the ordinary signup-to-publication journey, Arabic Behance draft import, safe private images and incomplete-text resume; screenshots of the actual steps are attached to the report for visual review.

Pre-final candidate e65e836 passed lint, typecheck, all 462 unit tests in 76 files, a production build and all 12 isolated Postgres tests. Its full browser result must be checked separately. The final candidate adds the revision stamp, screenshots and removes the one-time transport preparation job. Do not carry the earlier run's results forward as a final-candidate pass: run all checks on the exact final source before main.

## Scope and limits
All OAuth providers remain disabled until actual developer configuration and permissions/approval are ready. Mock API tests establish local code behavior only. No keys, external-provider permissions, money services or Founder terms changed. No production test accounts were created by this hardening branch. Controlled authenticated production acceptance remains a separate gate; a staging/CI test is not a live customer pilot. The private-profile registration phase in PR #22 remains a concurrent integration task, not an implicit part of this patch.

The branch-only acceptance workflow has read-only repository permissions. It uses disposable databases/storage, never production credentials, and no longer materializes or pushes code. All one-time source transport files were removed before the final candidate. Main must be refreshed immediately before a non-forced integration to preserve other sessions.
