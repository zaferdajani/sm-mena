# 29 · Email with Resend

Sawwiq emails agencies when a client sends an inquiry or a chat message (`lib/notify.ts`; chat emails are throttled to one per conversation per 15 minutes and never include the message text). Until `RESEND_API_KEY` is set, nothing is sent and the server logs `[notify:mock]` instead. Resend's free plan covers 3,000 emails a month (100 a day).

## Setup (about 15 minutes, once)

Never paste the API key into chat; it goes only into GitHub.

1. **Account.** Sign up at resend.com (use the owner's email, turn on two-factor sign-in).
2. **Add the domain.** Resend → **Domains → Add Domain** → `sawwiq.org`, region **Ireland (eu-west-1)** (closest to the site and database in London).
3. **DNS at Namecheap.** Resend shows 3–4 records. In Namecheap → Domain List → sawwiq.org → **Advanced DNS**, add each one. In the **Host** field type only the part before `sawwiq.org` (Namecheap adds the domain itself):

   | Resend shows | Namecheap type | Host | Value |
   |---|---|---|---|
   | MX `send.sawwiq.org` | MX Record (under **Mail Settings → Custom MX**) | `send` | `feedback-smtp.eu-west-1.amazonses.com`, priority `10` (copy Resend's exact value) |
   | TXT `send.sawwiq.org` | TXT Record | `send` | `v=spf1 include:amazonses.com ~all` (copy Resend's) |
   | TXT `resend._domainkey.sawwiq.org` | TXT Record | `resend._domainkey` | the long `p=…` key Resend shows |
   | (recommended) TXT `_dmarc.sawwiq.org` | TXT Record | `_dmarc` | `v=DMARC1; p=none;` |

   The MX record is on the `send` subdomain only, so it doesn't change where mail to `@sawwiq.org` goes. Namecheap only lets you add MX records after switching **Mail Settings** to **Custom MX**; that turns off Namecheap's free email forwarding for the domain. If you use that forwarding, keep it: add the MX record the same way anyway and set Mail Settings back if the forwarding stops, or ask Claude to use a DNS host with both.
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
