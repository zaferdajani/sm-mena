# Vercel access recovery: measured evidence, 29 September 2026

## Decision
Operational read access recovered through a verified workaround. Vercel's entire ChatGPT connector service is NOT declared repaired. No user reconnection, token sharing, production deployment, permissions change, billing change or application modification was needed for these results.

## Successful routes
1. Vercel MCP default context: `list_projects({teamId:""})`, `list_deployments({projectId:"prj_r6vpBm9DQ1RCmBYhDTURXga9bPC1",teamId:""})`, `get_deployment({idOrUrl:<real deployment id>,teamId:""})` all succeeded and returned the correct Sawwiq account/project. Explicit team slug and canonical team id returned 403 in the same connection. Do not ask the owner to reconnect again merely because list_teams is empty.
2. Existing GitHub-held VERCEL_TOKEN via GET-only `.github/workflows/vercel-readonly-proof.yml`. The credential stayed on the authorized runner. The script is in `scripts/vercel-readonly-proof.mjs`; source and security notes in `docs/vercel-connector-access.md`. The default Vercel REST context succeeded and its project id, name and account id matched the expected values.

## Run and retained artifact
- Observer branch: `ops/vercel-access-recovery`
- Observer commit: `403d646cd6e7634c2cccaa5348150eb3890499ee`
- Run: https://github.com/zaferdajani/sm-mena/actions/runs/36546370262
- Job: `109333628600`, all steps passed.
- Actual check: `2026-09-29T09:00:52.335Z` to `2026-09-29T09:01:11Z` (12:00:52 to 12:01:11 Asia/Amman).
- Artifact: `11022547186`, `vercel-readonly-proof`, contains only `vercel-readonly-proof.json`, retained for 30 days.
- Downloaded ZIP SHA256 independently matched the job output: `6e58ebb4f3fc116256e58bfb9e6c415e6105b24e42100227bd7f059c40e5f4f4`.
- Thirteen isolated probe assertions passed before the real network check. They are not application E2E tests.

## Measured production results
- Project API: HTTP 200, exact `sm-mena` project and owner account verified.
- Production deployment: `dpl_FDPzaH67SaRZNYNGq35w2ZJz8nEn`, target production, READY, with the `sawwiq.org` alias.
- Live SHA: `96c09da7f9eefcb6ddec88a3da88dc16ea713afd` (NOT the observer-branch SHA).
- `/api/version`: HTTP 200, no-store, revision `collaboration-v2-r3.2`, environment production, exact matching SHA. A second uncached request matched after the page checks.
- `/api/health`: HTTP 200 and ok=true (265ms on this run).
- `/ar?intro=0`, `/en?intro=0`, `/ar/explore?tab=agencies`, `/en/explore?tab=agencies`: all HTTP 200, each with one HTML release stamp matching the canonical revision, SHA and environment.
- Build log API: HTTP 200; 200 bounded events read. Raw contents were not retained. This establishes access, not a complete error audit.
- Team plan read: hobby. No billing or subscription change made; commercial hosting suitability remains an owner/business issue, not a connector-auth requirement.
- Main CI for the live SHA is run `36544776651`, reported success by GitHub. That is independent of this read-only proof workflow.

## Limits that remain explicit
- The 12-second runtime-log probe returned no response headers before ending (`http_status=0`, no events). Its zero counters MUST NOT be reported as 'no runtime errors'. Runtime-log verification is UNCONFIRMED.
- Individual MCP project-detail/build-log/runtime/protected-fetch functions still have input/schema/permission defects. Use the measured working routes above; do not claim every tool is fixed.
- This run read HTML; it did not use a visual browser, inspect layouts, decode the intro video, sign in to a provider, send a collaborator inquiry or accept any work. The PR #12/#13 watch's actual playback/authenticated/visual acceptance gates are not all closed by these source checks.
- The recovery branch contains diagnostics/docs only. Main remains independently managed by existing implementation sessions; their changes were not overwritten. An automatically generated Vercel preview of this branch is not the production deployment.

Future authorized observations may re-run job 109333628600 through the GitHub workflow-job tool, then read that attempt's artifact/logs. This operation only repeats bounded GET checks using the pre-existing credential. It is not an authorization to execute setup/deploy, change secrets or contact users. Do not substitute this historical result for a fresh source check after application changes.
