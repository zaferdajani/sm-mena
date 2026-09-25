# 17 — Team access without giving away ownership

Maintenance, backbone (core engineering) and support teams get the access their job needs, and nothing that would let them take the platform. This covers two places: **inside the app** (the admin console) and **outside it** (GitHub, Vercel, Supabase, Higgsfield, domain, AI and payment accounts).

## The rule

There is always exactly one **owner**. Only the owner can:

- invite people, change their role, time-box or switch off their access
- export payment data, remove demo data
- hand ownership to someone else (password + authenticator code, and the new owner must already have two-factor sign-in on)

Nobody can demote, switch off, time-box or reset the two-factor sign-in of the owner. Every change is in the audit log (`staff.invite`, `staff.accept`, `staff.role`, `staff.disable`, `staff.enable`, `staff.expiry`, `ownership.transfer`, `mfa.reset_by_admin`).

## Inside the app: roles

| | Owner | Admin | Backbone | Maintenance | Support |
|---|:-:|:-:|:-:|:-:|:-:|
| Dashboard, own security page | ✓ | ✓ | ✓ | ✓ | ✓ |
| System health | ✓ | ✓ | ✓ | ✓ | |
| Statistics | ✓ | ✓ | ✓ | ✓ | |
| Error journal (bugs) | ✓ | ✓ | ✓ | ✓ | |
| User reports (support inbox) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Agencies: view | ✓ | ✓ | ✓ | | ✓ |
| Agencies: verify, suspend | ✓ | ✓ | | | ✓ |
| Agencies: set plans | ✓ | ✓ | | | |
| Reports, reviews, posts moderation | ✓ | ✓ | | | ✓ |
| Promotions | ✓ | ✓ | | | |
| Payments: view / record / refund | ✓ | ✓ | | | |
| Disputes and protected-payment decisions | ✓ | ✓ | | | |
| Users: view | ✓ | ✓ | ✓ | | ✓ |
| Users: reset someone's two-factor | ✓ | ✓ | | | |
| Audit log | ✓ | ✓ | ✓ | | |
| Payments CSV export | ✓ | | | | |
| Remove demo data | ✓ | | | | |
| **Team: invite, roles, switch off, ownership** | ✓ | | | | |

The matrix is `lib/auth/permissions.ts` and is unit tested (`tests/unit/staff.test.ts`). Every admin page, server action and the CSV export check the permission on the server (`requireStaff(permission)` in `lib/auth/guards.ts`); the menu only hides what the role can't open.

### Adding someone

1. **Admin → Team → Invite someone**: email, role, and an optional end date (use one for contractors).
2. Send the link privately (copy or WhatsApp). It works once, for 7 days; a new invitation to the same email cancels the old link.
3. They choose a password (12+ characters). In production they must turn on two-factor sign-in before they can see anything.

### Changing or removing access

- **Change role** or **set an end date** in the member's row. Changing the role signs them out everywhere so the new permissions apply at once.
- **Switch off** ends every session immediately and blocks sign-in. **Switch on** restores it. Accounts are never deleted, so the audit trail stays intact.
- When the end date passes, sign-in stops and existing sessions stop working.

### If the owner loses their phone

Use a backup code (Security page). If those are gone too, run the break-glass steps below; an admin can't reset the owner's two-factor sign-in.

## Outside the app: where ownership really lives

Whoever controls these accounts controls the platform, whatever the app says. Keep all of them in the owner's name.

| Place | What it is | Owner keeps | Team gets |
|---|---|---|---|
| GitHub `zaferdajani/sm-mena` | Code; pushes to `main` deploy | Admin role, repository secrets, branch protection settings | **Write** (or **Triage** for support). Never Admin or Owner. |
| GitHub Actions secrets | `VERCEL_TOKEN`, `DATABASE_URL`, `SUPABASE_*`, `SEED_ADMIN_*`, AI keys, `GOOGLE_PLACES_API_KEY` | All of them | None (they deploy by merging, not with tokens) |
| Vercel project `sm-mena` | Hosting, generated secrets (`MFA_ENCRYPTION_KEY`, `PAYMENTS_WEBHOOK_SECRET`, `CRON_SECRET`) | Account owner, billing, environment variables | Not required (logs are available from Actions → Vercel → logs) |
| Supabase project `sm-mena` | Database and uploaded files | Organization owner, billing, keys | Not required |
| https://sawwiq.org | The live app | Owner account in Admin → Team | Staff accounts with roles above |
| Higgsfield `sawwiq-jordan.higgsfield.app` | Landing site (unlisted) | The Higgsfield account | No access |
| Namecheap (sawwiq.org) | The domain and DNS | Account, 2FA, auto-renew | No access |
| Anthropic / OpenAI / Google Cloud consoles | API keys and billing | Accounts and keys | No access (keys only live in secrets) |
| Payment provider (when connected) | Payouts | Account and bank details | No access |

### GitHub setup (5 minutes, owner does it once)

1. **Settings → Collaborators and teams → Add people**: backbone and maintenance with **Write**, support with **Triage** (issues only).
2. **Settings → Branches → Add branch protection rule** for `main`:
   - Require a pull request before merging, 1 approval
   - **Require review from Code Owners** (`.github/CODEOWNERS` names the owner for every file)
   - Require status checks to pass (CI)
   - Do not allow bypassing the above settings; restrict who can push to `main` to the owner
3. **Settings → Secrets and variables → Actions**: only admins can see or change these; team members with Write cannot read them.
4. Turn on two-factor authentication for the account and ask collaborators to do the same (Settings → Authentication security).

Result: the team can branch, open pull requests and see CI, but nothing deploys until the owner approves.

### Vercel and Supabase

The team does not need Vercel or Supabase access to work: deploys happen through GitHub when the owner merges, and the Actions buttons (Vercel → status / logs, Maintenance) cover logs and routine jobs. If someone must look inside, invite them as a **member** (never owner or admin) and remove them when done.

### Break-glass (owner locked out of the app)

Only someone who controls the GitHub repository secrets can do this, which is you as the owner.

1. GitHub → the repository → Settings → Secrets and variables → Actions: add `OWNER_RECOVERY_EMAIL` (the owner's email) and, if you also forgot the password, `OWNER_RECOVERY_PASSWORD` (12+ characters).
2. Actions → Maintenance → Run workflow → **recover-owner**. It clears the owner's two-factor sign-in (and sets the new password), signs the owner out everywhere and writes `ownership.recovery` to the audit log. It never touches any other account.
3. Sign in, turn two-factor sign-in back on (Admin → Security), then delete both secrets.

If the owner account itself is gone, set new `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` secrets: the seed creates that admin, and makes it the owner only if the platform has no owner.

## Sites directory

| What | Where | Visibility |
|---|---|---|
| Live app | https://sawwiq.org (Arabic) · https://sawwiq.org/en | Public |
| Health check | https://sawwiq.org/api/health | Public (no secrets) |
| Admin console | https://sawwiq.org/en/admin | Staff only, two-factor |
| Landing site | https://sawwiq-jordan.higgsfield.app | Unlisted (401 for visitors) |
| Code | https://github.com/zaferdajani/sm-mena | Private repository |
| Deploys | Vercel, on every push to `main`; GitHub → Actions → Vercel for setup, status and logs | Owner |
| Hosting | Vercel project `sm-mena` (region `lhr1`) · Supabase project `sm-mena` (London) | Owner |
