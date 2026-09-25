# 25 · Moving the database and files to Supabase

Until now the site kept its database (PGlite) and uploaded files on the Fly server's own 1 GB disk. Moving to Supabase puts them in a managed Postgres database, with backups, and a file store. Fly keeps running the website itself.

- **Supabase project:** `sm-mena`, London (eu-west-2): `https://dzedhnmxywtteeduwpby.supabase.co`
- **Fly app:** `sawwiq-jo`, Frankfurt. The two talk over the internet, about 15 ms apart.

## What you do (once, about 10 minutes)

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

4. **Deploy.** Actions → **Deploy to Fly.io** → **Run workflow** (or ask Claude to deploy).

## What happens automatically

On the first boot with `DATABASE_URL` (`scripts/docker-entrypoint.sh` → `npm run db:move-to-supabase`):

1. **Database.** The Supabase database gets the app's tables (Drizzle migrations). Every row of the old database is then copied in one transaction:
   - Tables are copied in foreign-key order.
   - Row counts are checked before committing.
   - Counters (sequences) continue after the copied rows.
   - If Supabase already has data, the copy is skipped.
2. **Files.** Every uploaded file (post photos, avatars, backgrounds) goes into a **public** bucket `media`, created if missing. Contracts, NDAs and signatures are stored in the database, not in files.
3. **Markers.** `/data/.moved-to-supabase` (database) and `/data/.files-moved-to-supabase` (files) stop later boots from copying again. They are separate: if the Storage keys are missing or wrong, the database still moves, the files keep being served from the Fly disk, and the next deploy with the right keys copies them.
4. **Old data kept.** The old database and files stay on the Fly disk as a backup.
5. **If the copy fails,** the site keeps running on the old database, and the deploy prints a warning: "the move to Supabase failed". Run `flyctl logs -a sawwiq-jo` and read the lines that start with `[move]`. Fix the cause (usually a wrong password in `DATABASE_URL`), then deploy again.

The deploy waits up to 6 minutes for the first boot. Afterwards `https://sawwiq.org/api/health` shows `"database":"postgres","storage":"supabase"`.

## Checked before shipping

- **Full browser test suite on real Postgres 16:** 104 passed. That run found and fixed one Postgres-only problem, in `lib/db/index.ts`: dates written directly into hand-written queries weren't converted to text.
- **Copy script on a real seeded database** (PGlite → Postgres): 36 tables, every row count matched. The app ran normally on the copy, and running the script again did nothing.

## After the move

- Supabase makes daily backups on the Pro plan; point-in-time restore is optional.
- **Deleting the old volume copy.** Wait a couple of weeks, then delete `/data/pglite` and `/data/uploads` from the Fly disk if you want to. `flyctl ssh console -a sawwiq-jo`, then `rm -rf /data/pglite /data/uploads`. Keep the marker files.
- **Staying on Fly.** Fly still runs the website code (pages, logins, contracts, chat). Supabase only stores the data. To move the website to Vercel later, `vercel.json` already exists; it would use the same Supabase secrets.
