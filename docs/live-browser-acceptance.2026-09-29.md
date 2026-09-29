# Public production browser acceptance — 29 September 2026

## Measured result
PASS: eight independent fresh browser contexts; native video playback was observed, not mocked. This closes the previous inability to observe the production intro in a browser for the configurations below. It does not establish full-platform or authenticated production acceptance.

- Observer branch: ops/vercel-access-recovery; code commit 78a460e813ee011250cf8e1c2785a95a90ae197a.
- Workflow: Public live browser acceptance, run 36548657543, job 109341123133, successful.
- Browser observations: 2026-09-29 09:23:02–09:23:53 UTC (12:23:02–12:23:53 Asia/Amman).
- Actual canonical production /api/version before AND after matched: commit 96c09da7f9eefcb6ddec88a3da88dc16ea713afd, revision collaboration-v2-r3.2, environment production.
- All tested page DOM stamps matched that identity; page direction matched ar=rtl/en=ltr, and no horizontal page overflow was measured.
- Artifact 11023542511: sawwiq-live-browser-evidence (report.json, 15 PNGs, 8 screen recordings; no fonts, raw traffic traces or credentials). ZIP SHA256: 50e715c184dfa391db6e44600225c981c0c489b44810cc9d747566571c1349de. Downloaded and checked against that hash. Arabic desktop and WebKit mobile playback PNGs and mid-recording frames from all seven playback recordings were visually inspected: the animated logo/wordmark is contained, not cover-cropped.

| Engine / viewport | Route and mode | Result |
| --- | --- | --- |
| Chromium 390x844 | /ar, eligible fresh visitor | PASS |
| Chromium 1440x900 | /ar, eligible fresh visitor | PASS |
| Chromium 390x844 | /en, eligible fresh visitor | PASS |
| Chromium 1440x900 | /en, eligible fresh visitor | PASS |
| Chromium 1440x900 | /en?intro=1, forced gate | PASS |
| Chromium 390x844 | /en?intro=1, reduced motion | PASS: no playback or overlay |
| WebKit 390x844 | /ar, eligible fresh visitor | PASS |
| WebKit 390x844 | /en, eligible fresh visitor | PASS |

All seven playback cases reached native `ended` at 4.082 seconds and reported 97 decoded frames. The media was fetched from the canonical /assets/brand/intro/sawwiq-intro-720.webm URL with a successful HTTP200/206 response. WebKit recorded an initial status-zero response before its successful HTTP200; it nevertheless decoded and completed the actual media. There were no recorded page JavaScript exceptions. Both full duration and decoded output were required; an overlay that merely disappears cannot pass.

Measured video element: phone x=39, y=134, width=312, height=576; desktop x=496, y=162, width=448, height=576. Computed object-fit=contain, muted=true. Overlay closes and background inert/intro state releases after playback. Reduced-motion case made no media request and played no frames.

## Important boundaries
- Tests run in real Chromium/WebKit engines on a GitHub runner. Phone viewport/touch behavior is emulated; this is NOT a physical iPhone/Android/Safari certification.
- Because the application intentionally bypasses its intro for navigator.webdriver, fresh-visitor cases override only that boolean to emulate the ordinary eligible visitor. Media APIs, playback time, resource responses and timers are untouched. The forced-gate case keeps the automation flag unchanged.
- All non-GET/HEAD requests were blocked. No login, publication, analytics POST, customer message, account creation, database/reset action, external model call, payment or production configuration change was performed.
- Public playback evidence is not evidence that all Explore/profile sections are visually accepted, that a five-step wizard exists, or that any social OAuth integration is operational.

## Remaining engineering, not a manual owner checklist
Authenticated testing needs dedicated least-privilege internal QA provider identities and a verified isolation policy. Reuse approved internal identities only when suitable; otherwise implement/review controlled provisioning, excluding test actors from Founder seats, public discovery, user metrics and external outreach BEFORE creating them. Never reuse or reset real users' credentials, impersonate customers, bypass MFA, or run the existing db:reset seed against production. A generic demo flag alone is not proof of all these isolation guarantees.

Run broad write/error/permission tests first on the candidate with explicitly separate disposable database/storage. Then use the isolated QA identities for a narrow non-financial production journey through normal sign-in and the actual user-facing pages. Restrict communication to the QA pair and prevent email/WhatsApp/real-freelancer notifications; keep uploads private; clean up only tagged QA records. Where isolation is not implemented, report that engineering task as pending rather than sending the owner back to manually operate the application.

The actual requested first-run wizard and native social account integrations remain separate implementation tasks under docs/upgrades/creator-onboarding/FIRST_RUN_WIZARD.md and SOCIAL_CONNECTIONS.md. Test completion cannot stand in for building those features. No authenticated QA accounts or workflows were provisioned by this observer commit.
