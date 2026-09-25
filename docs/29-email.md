# 29 · Email with Resend

Sawwiq emails agencies when a client sends an inquiry or a chat message (`lib/notify.ts`; chat emails are throttled to one per conversation per 15 minutes and never include the message text). Until `RESEND_API_KEY` is set, nothing is sent and the server logs `[notify:mock]` instead. Resend's free plan covers 3,000 emails a month (100 a day).

## Setup (about 15 minutes, once)

Never paste the API key into chat; it goes only into GitHub.

1. **Account.** Sign up at resend.com (use the owner's email, turn on two-factor sign-in).
2. **Add the domain.** Resend → **Domains → Add Domain** → `sawwiq.org`, region **Ireland (eu-west-1)** (closest to the site and database in London).
3. **DNS at Namecheap.** Resend shows 4 records (it now uses CNAMEs, no MX). In Namecheap → Domain List → sawwiq.org → **Advanced DNS** → Host Records → **Add New Record**, add each one. Resend's table shortens long values with "[…]", so copy every value with its copy button. In the **Host** field type only the part before `sawwiq.org`:

   | Namecheap type | Host | Value |
   |---|---|---|
   | TXT Record | `resend._domainkey` | the full `p=…` key |
   | CNAME Record | `rsend` | the full `rsend-eu….mta.net` value |
   | CNAME Record | `send` | the full `send.for….mta.net` value |
   | TXT Record | `_dmarc` | `v=DMARC1; p=none;` |

   TTL Automatic. Leave "Enable Receiving" off, and don't touch the `A @` and `CNAME www` records that run the site.
4. **Verify.** Back in Resend click **Verify DNS Records**. It usually turns green within 5–30 minutes (sometimes a few hours).
5. **API key.** Resend → **API Keys → Create API Key**: name `sawwiq-vercel`, permission **Sending access**, domain `sawwiq.org`. Copy it (it's shown once).
6. **GitHub.** Repository → Settings → Secrets and variables → Actions:
   - **Secrets** tab → New repository secret: `RESEND_API_KEY` = the key.
   - Optional, **Variables** tab → `EMAIL_FROM` = `Sawwiq <noreply@sawwiq.org>` (this is the default when unset; use e.g. `سوّق <hello@sawwiq.org>` to change the sender name).
7. **Copy to Vercel.** Actions → **Vercel** → Run workflow → **setup**. It copies the key to Vercel and redeploys.

## Check it works

Send an inquiry from a demo agency's page to an agency whose profile email is yours (Studio → Profile → Email), or ask Claude to run a test send. In Resend → **Emails** you see each email and whether it was delivered. If nothing arrives: Actions → Vercel → **logs**, and Resend → Domains (the domain must be **Verified**).

## Later

- Replies go to the `from` address; set up an inbox for `hello@`/`privacy@sawwiq.org` (Zoho Mail free plan, or Google Workspace) if you want to receive mail at the domain. Their MX records go on `@`, which doesn't clash with Resend's `send` records.
- Client emails (receipts, contract signed) can use the same adapter.
