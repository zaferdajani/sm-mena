# 52 — Automatic site check, fix and log

`.github/workflows/site-check.yml` runs `lib/db/site-check.ts` every 30 minutes (at :07 and :37) and on demand (Actions → Site check → Run workflow).

1. **Check**: it opens `/api/health` (must report `ok: true`), `/ar`, `/en`, `/ar/explore`, `/ar/start`, `/ar/login`, `/ar/soon` and `/sitemap.xml` one at a time, following redirects. Each page must answer 200 **at its expected final address** (a page that bounces to the front page fails with "landed on …") **with its expected content** (the release stamp, `lang`, the sign-in form on `/ar/login`, `<urlset` on the sitemap) within 20 s, and under 10 s to count as healthy. The release the site reports on `/api/version` is read and stored with the run; it is never assumed from the repository.
2. **Record**: each failure goes to Admin → Bugs (source `monitor`, kind `site_check`) with the same fingerprint rule as `recordError`, so repeats count up one entry. A closed entry reopens if the failure returns, and its resolved state (time, person, commit) is cleared; the old closure stays in the notes.
3. **Close**: **only the monitor's own errors** (`source = monitor`, `kind = site_check`) are eligible, and only when their page answered correctly **in this run** and had not failed for 3 days. A run that failed, timed out or did not check a page closes nothing for that page. Browser, server, authenticated-flow and user-reported errors are never closed by this job: "not seen for a while" is not "fixed". Each batch is in the audit log as `bug.auto_resolve` with the ids and the paths that passed. In Admin → Bugs the manual "not happened in N hours" action asks the person to choose between *could not reproduce* (it stopped; default) and *fixed* (a fix was deployed; name the commit).
4. **Log**: every run is stored in `site_checks` for 90 days with the reported release and shown in Admin → Bugs → Automatic checks. A failing run exits 1, so GitHub emails the repository owner.

What this is: an availability check from a GitHub runner. What it is not: a browser, an authenticated journey, intro-media decoding, or release acceptance; those are recorded separately (docs/46, docs/upgrades). It runs on its schedule; nothing else triggers it, and an observation-only audit should read its logs rather than dispatch it.

Only paths, status codes, final addresses and timings are stored; no personal data (docs/08). Code: `lib/data/site-check.ts` (rules, tested in `tests/unit/site-check.test.ts`) and `lib/db/site-check.ts` (the runner).

## Traffic breakdown

Maintenance → `traffic-breakdown` (read-only) shows how many of the last 30 days' events and page views come from the same browser. Sawwiq keeps no IP addresses; "same visitor" means the same anonymous browser ID. Browsers that opened the admin console are the team.
