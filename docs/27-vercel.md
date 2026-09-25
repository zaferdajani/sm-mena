# 27 · Running on Vercel + Supabase (no Fly)

The site needs two things: somewhere to **run the code** and somewhere to **keep the data**.
- **Code:** Vercel (free Hobby plan), made by the Next.js team. It runs the app as serverless functions: no server to pay for or keep awake.
- **Data:** Supabase (database + files), already set up (docs/25-supabase.md).
- **Domain:** Namecheap (`sawwiq.org`).

Fly is switched off: `.github/workflows/fly-deploy.yml` only runs if the repository variable `DEPLOY_TO_FLY` is `true`.

> Vercel's Hobby plan is free for personal, non-commercial projects. When Sawwiq starts charging (the 10% guarantee fee, subscriptions), Vercel's terms require the Pro plan ($20/month per member). Until then Hobby is fine.

## One-time setup (about 15 minutes)

### 1. Import the project
1. Go to https://vercel.com/signup and choose **Continue with GitHub**.
2. **Add New… → Project** → pick `zaferdajani/sm-mena` → **Import**. If it isn't listed, click "Adjust GitHub App Permissions" and allow the repo.
3. Leave the framework as **Next.js**. The build command comes from `vercel.json` (it applies database migrations, then builds).
4. Open **Environment Variables** and add the variables below. You can paste them all at once into the first "Key" box.

```
DATABASE_URL=            (same value as the GitHub secret)
SUPABASE_URL=https://dzedhnmxywtteeduwpby.supabase.co
SUPABASE_SERVICE_ROLE_KEY=   (same value as the GitHub secret)
STORAGE_PROVIDER=supabase
NEXT_PUBLIC_SITE_URL=https://sawwiq.org
MFA_ENCRYPTION_KEY=      (make up a long random password, 40+ letters/numbers; keep it safe, never change it)
CRON_SECRET=             (another long random password)
PAYMENTS_WEBHOOK_SECRET= (another long random password)
```

Optional, only if you use them: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (AI matchmaker), `GOOGLE_PLACES_API_KEY`.

5. Click **Deploy**. When it finishes, open the `….vercel.app` link it gives you. That address is fine for testing; search engines are told not to index it.

### 2. Point sawwiq.org at Vercel
1. In Vercel, go to the project → **Settings → Domains** → add `sawwiq.org` (and `www.sawwiq.org`, redirecting to `sawwiq.org`).
2. Vercel shows the DNS records. In Namecheap → sawwiq.org → **Advanced DNS**:

| Action | Type | Host | Value |
|---|---|---|---|
| Edit | A | `@` | the IP Vercel shows (usually `76.76.21.21`) |
| **Delete** | AAAA | `@` | (the old Fly address) |
| Edit | CNAME | `www` | the value Vercel shows (usually `cname.vercel-dns.com`) |

After 5–30 minutes Vercel shows the domain as **Valid** and issues the HTTPS certificate on its own.

### 3. One click to restore the photos
The demo agencies' photos were on the Fly disk. Go to GitHub → **Actions → Maintenance → Run workflow** → task **rebuild-demo-media**.
- It re-creates the demo agencies with their photos in Supabase Storage, in about 5 minutes.
- Real agencies are never changed. The log lists any of their files that are missing, so you can ask them to re-upload.

### 4. If you use two-factor sign-in as admin
The key that protected authenticator codes lived on Fly. Sign in with one of your **backup codes**, or run **Maintenance → reset-staff-2fa**, then set up the authenticator again. Contract and NDA links sent before the move can't be re-shared from the studio: send a new contract if a client needs the link again.

## Differences from the Fly setup

- **Uploads.** Vercel accepts at most about 4.5 MB per request. Photos and background videos are compressed in the browser before upload (docs/26-media-compression.md), so normal use never hits the limit.
- **Scheduled jobs.** Two daily cron jobs run from `vercel.json`: Google ratings, and data retention.
- **Region.** Functions run in London (`lhr1`), next to the Supabase database (eu-west-2).
- **Rate limits.** Limits kept in memory apply per function instance. That's fine at this size; a shared store (e.g. Upstash) is the upgrade path.
- **Deploys.** Every push to `main` deploys automatically, and every other branch gets a preview link.

## Database connections on Vercel

Each Vercel function instance opens its own small connection pool. Supabase's session pooler (port 5432, the `DATABASE_URL` secret) only allows a handful of clients on the free plan, so the site runs out of connections under load. When `VERCEL` is set, `lib/db/index.ts` sends the site's queries to the transaction pooler instead: same host and credentials, port 6543, built for serverless. Migrations (`npm run db:migrate`, run in the Vercel build) and the Maintenance workflow keep using the session pooler URL as given. Nothing to change in the secrets.

If the site shows errors, run **Actions → Vercel → Run workflow → logs**. It visits a few pages and prints the server errors. `/api/health` also returns 503 when the database can't be reached or the storage keys are missing.
