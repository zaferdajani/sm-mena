# 52 — Automatic site check, fix and log

`.github/workflows/site-check.yml` runs `lib/db/site-check.ts` every 30 minutes (at :07 and :37) and on demand (Actions → Site check → Run workflow).

1. **Check**: it opens `/api/health` (must report `ok: true`), `/ar`, `/en`, `/ar/explore`, `/ar/start`, `/ar/login`, `/ar/soon` and `/sitemap.xml` one at a time. A page that does not answer 200 within 20 s, or takes more than 10 s, is a failure.
2. **Record**: each failure goes to Admin → Bugs (source `monitor`, kind `site_check`) with the same fingerprint rule as `recordError`, so repeats count up one entry. A closed entry reopens if the failure returns.
3. **Fix**: open or investigating errors not seen for 3 days are closed as fixed with the note "Closed automatically: not seen for 3 days (site check)." They reopen by themselves if they happen again. Each batch is in the audit log as `bug.auto_resolve`.
4. **Log**: every run is stored in `site_checks` for 90 days and shown in Admin → Bugs → Automatic checks. A failing run exits 1, so GitHub emails the repository owner.

Only paths, status codes and timings are stored; no personal data (docs/08).

## Traffic breakdown

Maintenance → `traffic-breakdown` (read-only) shows how many of the last 30 days' events and page views come from the same browser. Sawwiq keeps no IP addresses; "same visitor" means the same anonymous browser ID. Browsers that opened the admin console are the team.
