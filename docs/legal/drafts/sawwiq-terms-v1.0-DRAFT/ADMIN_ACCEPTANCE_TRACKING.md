# Admin acceptance tracking: pending implementation

This is a specification and internal release reminder only. No admin screen, scheduled reminder, database migration, acceptance enforcement or customer notification is implemented or activated by this archive.

## Until publication

Suggested owner/admin card: **Terms draft ready — legal details and publication approval pending. User acceptance has not been requested.**

Arabic: **مسودة الشروط جاهزة — بانتظار استكمال البيانات القانونية واعتماد النشر. لم يُطلب من المستخدمين قبولها بعد.**

Existing accounts remain identification/registration records. Do not relabel an old consent flag as agreement to the new terms. Do not create acceptance events on an administrator's behalf. Display any existing consent evidence as its original version and context. Do not label every account overdue or noncompliant with an unpublished draft. Optional consent refusal is not a failure to accept general terms.

## After a separately approved publication

Compute status server-side per user, applicable activity/role and immutable document version. A role may have multiple applicable schedules. Use at least:

| Status | Meaning |
| --- | --- |
| Draft / not issued | The applicable document is not published; no acceptance request exists. |
| Not applicable | This schedule is not relevant to the user's current activity. |
| Awaiting acceptance | A published applicable version is required and no matching affirmative event exists. Show whether it was actually presented; do not claim it was read. |
| Accepted | A genuine user action accepted the exact document version and scope. |
| Update requires acceptance | An older acceptance is retained, but a material new applicable version needs an affirmative action. |

Keep optional consents in a separate purpose/channel ledger with not requested / granted / declined / withdrawn and scope/expiry. Do not collapse these into the account's contract-acceptance status.

Admin filters should include role, document/version, status, language and date. The restricted detail view should show user/account ID, applicable schedule, version/hash, language, server timestamp and the affirmative action evidence. Do not expose passwords, cookies, tokens or unnecessary personal data. Avoid exporting acceptance lists into this public repository. Counts must come from the same filtered records, exclude fictional demos where appropriate, and not be fabricated in a static manifest.

## Safeguards

- Preserve existing accepted documents and their original wording; append new events rather than overwrite history.
- Record the document version, canonical content hash, presented language, actual actor/account, applicable role/scope and server-side UTC timestamp; display Asia/Amman when selected.
- Resolve applicability server-side; reject missing, stale or tampered acceptance before performing the affected action.
- No prechecked boxes, background auto-acceptance or claim that viewing a page proves reading/acceptance.
- Do not convert private profiles to public, start marketing, authorize payments or grant OAuth permissions with the general agreement.
- Keep privacy requests, account closure, security controls and access necessary to handle existing obligations available as legally appropriate.
- Reminder sending is a separate authorization: define audience, channel, permitted purpose, rate limits and stop rules before enabling. While the version is a draft, send no customer acceptance reminders.
- Access restricted to authorized staff and audited. Terms schedules do not themselves grant staff privileges.

## Acceptance tests before release

1. Draft document produces no user prompt, enforcement or overdue counter.
2. Existing account's prior consent remains unchanged; no synthetic acceptance is created.
3. New and existing users each must take their own affirmative action for the published applicable version.
4. Irrelevant role schedules are not required; additional activities can require their own schedule.
5. Optional marketing declined/withdrawn does not block unrelated registration or change contract acceptance.
6. Private publication, contact sharing, AI and social choices remain separately scoped.
7. Duplicate submissions are idempotent; concurrent versions do not accept stale terms silently.
8. Arabic/English and keyboard/screen-reader/phone/desktop flows show the same legal version with legible links and unchecked controls.
9. Admin counters and evidence match the authoritative event ledger with no privilege escalation or cross-account disclosure.
10. Privacy and closure routes work after declined new terms; remind only the eligible outstanding population after approved rollout.

Production implementation, migration, deployment and customer contact are not authorized by this document.
