# 25 · Database and files on Supabase

The live site keeps its database (Postgres) and uploaded files (Storage) on Supabase. The website code runs on Vercel (docs/27-vercel.md). Locally, without `DATABASE_URL`, the app uses an embedded database (PGlite) and a local upload folder instead.

- **Supabase project:** `sm-mena`, London (eu-west-2): `https://dzedhnmxywtteeduwpby.supabase.co`
- **Vercel region:** London (`lhr1`), next to the database.

## Setting it up (once)

Never paste these values into chat; they go only into GitHub.

1. **Database connection string.** In Supabase, click **Connect** (top bar) → **Connection String** → method **Session pooler** → copy the URI. It looks like
   `postgresql://postgres.dzedhnmxywtteeduwpby:[YOUR-PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:5432/postgres`
   - Replace `[YOUR-PASSWORD]` with the database password you chose when creating the project. If you've lost it: Project Settings → Database → Reset database password.
   - Add `?sslmode=require` at the end.
2. **Secret key.** Project Settings → **API Keys** → copy the **service_role** key (or a **Secret key**, starting `sb_secret_`). It gives full access, so keep it secret.
3. **GitHub secrets.** GitHub → `zaferdajani/sm-mena` → Settings → Secrets and variables → Actions → **New repository secret**, three times:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the connection string from step 1 |
   | `SUPABASE_URL` | `https://dzedhnmxywtteeduwpby.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | the key from step 2 |

4. **Copy them to Vercel.** Actions → **Vercel** → Run workflow → **setup**. Afterwards `https://sawwiq.org/api/health` shows `"database":"postgres","storage":"supabase"`.

## How the app uses it

- **Tables.** Drizzle migrations (`lib/db/migrations`) run during every Vercel build (`npm run db:migrate`), and from Actions → Maintenance → **migrate**.
- **Connections.** Migrations and maintenance jobs use the session pooler URL as given. The live site sends its queries through the transaction pooler (same host, port 6543), which is made for serverless functions (`lib/db/index.ts`).
- **Files.** Post photos, avatars and backgrounds go into a **public** bucket `media`, created on first use (`lib/storage`). Contracts, NDAs and signatures are stored in the database, never in files. Every upload is compressed first (docs/26-media-compression.md).
- **Demo data.** Actions → Maintenance → **seed-demo** adds demo agencies and anything new in the demo data; **rebuild-demo-media** re-creates the demo agencies with their photos.

## Checked

- **Full browser test suite on real Postgres 16.** That run found and fixed one Postgres-only problem in `lib/db/index.ts`: dates written directly into hand-written queries weren't converted to text.

## Backups

Supabase makes daily backups on the Pro plan; point-in-time restore is optional. On the free plan, export the database from Supabase (Database → Backups) before big changes.
