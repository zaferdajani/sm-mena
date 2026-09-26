# 41 · Client accounts: sign in to follow, save and like

Until now, business owners browsed with no account, and follows, likes and saves were tied to an anonymous device cookie (docs/09). That let anyone push a follower count up from their own phone. From now on, **following, liking and saving need an account**, so every count is a real person.

## How business owners sign in
- `/signin` asks for an email and consent, then sends a **6-digit code** (Resend, docs/29). There's no password.
  - A code lasts 10 minutes and allows 5 tries; only a keyed hash is stored (`login_codes`). Rows are deleted after a day.
  - Rate limits: 5 codes an hour per email, 10 per IP.
- The first sign-in creates a `client` account (role `client`) with no usable password.
  - Emails that belong to an agency or staff account are refused ("sign in with your password"). A code must never get around a password or two-factor sign-in.
- Tapping Follow, Like or Save while signed out opens `/signin?next=<this page>` and comes back there after signing in.
- The agency login page links to it, and `/saved` shows either the sign-in prompt or the signed-in email with a sign-out button.

## Where interactions live
- Rows in `follows`, `likes` and `saves` for accounts use the key `u:<user id>` (`accountKey`, `interactionKey()`). Signed-in agencies use the same.
- **On sign-in** (code or password), the device's earlier anonymous rows move to the account: duplicates are dropped and the counts they touch are recounted (`mergeDeviceInteractions`).
- **Counts** (follower, like and save counts) come only from account rows. Migration 0017 recounted every real agency and post. Demo agencies keep their sample numbers.
- Everything else tied to the device cookie stays as it was: requests, chats, contract links, inquiries, promotion caps and view counts.

## Without email
- `/api/health` reports `email: true/false`. With no `RESEND_API_KEY`, production can't send codes and `/signin` says sign-in is unavailable.
- Development and the e2e server show the code on screen instead (`AUTH_SHOW_CODES=true` in `playwright.config.ts`). Never set that in production.
