# 19 — Connecting your own domain

Sawwiq is international (starting in Jordan), so use a domain without a country ending, for example `sawwiq.co` or a `.com`. `sawwiq.com` itself is taken (registered in 2019).

You do three things; the deploy does the rest.

## 1. Buy the domain

At any registrar (Namecheap, Cloudflare, GoDaddy, Porkbun…). Turn on two-factor sign-in and auto-renew on that account, and keep it in your own name (see docs/17-team-access.md).

## 2. Tell the deploy about it

GitHub → `zaferdajani/sm-mena` → **Settings → Secrets and variables → Actions → Variables** tab → **New repository variable**:

| Name | Value |
|---|---|
| `SITE_URL` | `https://your-domain` (no trailing slash, no `www`) |

Then **Actions → Deploy to Fly.io → Run workflow**. Open the run, expand the step **"Own domain"** → the group **"DNS records for …"**. It lists what to add.

## 3. Add the DNS records at the registrar

Usually:

| Type | Name / Host | Value |
|---|---|---|
| `A` | `@` | the IPv4 address shown in the run (from `fly ips list`) |
| `AAAA` | `@` | the IPv6 address shown in the run |
| `CNAME` | `www` | `sawwiq-jo.fly.dev` |

If the run shows an `_acme-challenge` CNAME, add that too (it proves the domain is yours so Fly can issue the HTTPS certificate). Use exactly what the run prints; the table above is the usual shape.

Wait 10–60 minutes, then **run the workflow again**. When `https://your-domain/api/health` answers, the deploy switches over automatically:

- canonical links, sitemap, share cards and WhatsApp links use your domain
- `sawwiq-jo.fly.dev/...` and `www.your-domain/...` redirect permanently (308) to `https://your-domain/...`, keeping the path
- if the domain doesn't answer yet, the deploy stays on fly.dev and says so in a warning, so nothing breaks while DNS propagates

## After it's live

1. Search Console and Bing Webmaster Tools: add the domain (DNS verification), submit `https://your-domain/sitemap.xml` (docs/18-seo.md).
2. Replace the `privacy@sawwiq.jo` address on the Contact and Terms pages with an address on your domain (ask Claude, or edit `messages/*.json` and `app/[locale]/(main)/contact/page.tsx`).
3. Optional: an email service for the domain (Google Workspace, Zoho) for `hello@` and `privacy@`.

## Keeping the landing site private

The earlier landing site on Higgsfield (`sawwiq-jordan.higgsfield.app`) stays unlisted: it is not published and only your Higgsfield account can open it. The same landing page is now the app's front page (`/ar`, `/en`), so it moves to your domain together with the app.
