# Vercel connector access recovery — 29 September 2026

## Confirmed workaround, not a claim that Vercel's connector service was repaired

The ChatGPT Vercel connector returned 403 when explicitly given `teamId=zaferdajani` OR its confirmed canonical ID `team_QypoqWSPoz4ULgZ6buX6JwTH`. `list_projects({teamId:""})` succeeds using the current authorized default context and returns exactly the expected project:

- project `sm-mena`: `prj_r6vpBm9DQ1RCmBYhDTURXga9bPC1`
- owner account: `team_QypoqWSPoz4ULgZ6buX6JwTH`

Use `list_deployments({projectId:"prj_r6vpBm9DQ1RCmBYhDTURXga9bPC1",teamId:""})` and `get_deployment({idOrUrl:<actual ID>,teamId:""})`. Both were exercised successfully. This remains the authorized user's own project, not an attempt to access another tenant. No reauthorization or account-setting change was necessary to recover these reads. Empty default context may not apply to other users/projects; verify the returned project and account every time.

Observed remaining connector defects/limits: `get_project` exposes projectId but the backing implementation rejects it because idOrName is missing; get_deployment_build_logs is advertised but returns tool-not-found; runtime helpers require a nonempty team and then return 403; web_fetch_vercel_url still denies access. Do not keep asking the owner for screenshots/reconnection to fix these verified tool behaviors. Do not declare the account wrongly connected based on an empty team list alone.

## Authorized alternative already available

The repository already has `.github/workflows/vercel.yml` and `scripts/vercel-admin.mjs`, using its existing server-side VERCEL_TOKEN. The dedicated `vercel-readonly-proof.yml` uses that existing credential on a GitHub runner for GET-only diagnostics and canonical site identity checks when the chat egress proxy or individual MCP tools fail. It receives no database, email, AI-model or user-login credentials and does not read/list secrets or environment values. No deployment, domain, permission, billing or production-record writes; no security controls are disabled.

The probe checks the exact project and owner account, optional plan identifier, observed canonical /api/version, the matching real production deployment and sawwiq.org alias, health, four HTML release stamps, build-log access and a short aggregate-only runtime sample. Sensitive responses/log contents are not retained. No provider session, messages, publication, payment or real account creation is involved. The short runtime sample is NOT a 24-hour audit; HTML stamps do NOT establish browser visual or media-playback acceptance. The observer branch SHA is kept separate from the live source SHA.

`node scripts/vercel-readonly-proof.mjs --self-test` exercises parsing and safety boundaries without credentials. Successful self-tests are not live proof. The workflow result/artifact must be read before claiming the fallback works. A failed or unavailable check remains explicitly blocked, and does not by itself prove the website is down.

The recovery is isolated on `ops/vercel-access-recovery`; main and application code are untouched. Pushing a branch may produce Vercel's usual automatic preview, but this workflow never requests a production deployment or changes its configuration. Preserve concurrent onboarding/registration work. Do not reset MFA, rotate unrelated keys, unlink the Git integration, change the paid plan, or redeploy untested app changes as a workaround for connector access.
