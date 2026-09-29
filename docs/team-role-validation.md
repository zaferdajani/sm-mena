# Team role release validation

Owner requests: add personal specialties, suggest existing complete/partial matches
before creating, prevent duplicate roles, and display **SEO** in every UI language.
PR #25 contains the existing implementation. No global taxonomy or payment changes.

## Recovery of the interrupted WebKit check

Diagnostic run 36583828362 on baac256 showed the custom title and canonical SEO
role checked and present in native FormData before signup. The post-signup error
context was the **sign-in page**, not the profile with lost role values. The test
ran a production Next server with Secure session cookies on HTTP localhost.
Do not fix that by removing Secure or inserting a fake authenticated cookie.

`playwright.roles-https.config.ts` runs the actual production app behind a test-only
HTTPS loopback proxy, using a generated one-day self-signed certificate. Production
auth code and cookie policy are unchanged. The private key is generated in OS temp,
not checked in or exported. Only ephemeral e2e PGlite/uploads are used; production
DB/deployment environments are rejected. Browser certificate warnings are ignored
only in this test configuration. No production accounts are created.

The same original role persistence, removal, duplicate, keyboard, RTL and narrow
layout assertions run in WebKit phone/desktop and Chromium phone, with zero retries,
in both registration and full launch phases. Use the merged candidate's CI result,
not old tests from the pre-registration branch, as the release gate.

References: https://playwright.dev/docs/test-webserver and
https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies .
