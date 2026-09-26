# 19 — The domain

Sawwiq is international (starting in Jordan), so it uses a domain without a country ending: **`sawwiq.org`**, bought at Namecheap (2026-09). `sawwiq.com` is taken (registered in 2019). Keep the Namecheap account in your own name with two-factor sign-in and auto-renew on (docs/17-team-access.md).

## DNS at Namecheap (Advanced DNS)

| Type | Host | Value |
|---|---|---|
| `A` | `@` | the IP Vercel shows (usually `76.76.21.21`) |
| `CNAME` | `www` | the value Vercel shows (usually `cname.vercel-dns.com`) |

No `AAAA` record on `@`. Actions → Vercel → **status** checks these and prints `OK` or what to change. Vercel issues the HTTPS certificate on its own.

## How the app uses it

- `NEXT_PUBLIC_SITE_URL` is `https://sawwiq.org` (set by Actions → Vercel → setup). Canonical links, the sitemap, share cards and WhatsApp links use it.
- The bare domain serves the site; `www.sawwiq.org/...` redirects permanently (308) to `https://sawwiq.org/...`, keeping the path. Vercel does this, and `proxy.ts` does it again as a safety net.
- Any other host serving the app (Vercel preview links, `*.vercel.app`) sends `X-Robots-Tag: noindex`, so only sawwiq.org is indexed.

## After it's live

1. Search Console and Bing Webmaster Tools: add the domain (DNS verification), submit `https://sawwiq.org/sitemap.xml` (docs/18-seo.md).
2. The Contact and Terms pages list `privacy@sawwiq.org`: set up forwarding for that address at your DNS host (Namecheap → Domain → Redirect Email) so messages reach you.
3. Optional: an email service for the domain (Google Workspace, Zoho) for `hello@` and `privacy@`.

## Keeping the landing site private

The earlier landing site on Higgsfield (`sawwiq-jordan.higgsfield.app`) stays unlisted: it is not published and only your Higgsfield account can open it. The same landing page is now the app's front page (`/ar`, `/en`) on sawwiq.org.
