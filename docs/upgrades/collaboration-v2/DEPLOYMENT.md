# Implementation, merge and deployment runbook

## 1. Prepare the working branch safely

Read the repository instructions, then fetch origin and the existing `plan/collaboration-v2-upgrade` branch. Protect any dirty working tree; do not reset or overwrite another session's work. Check it out or create a tracking local branch. Merge current `origin/main` into it, resolve deliberately, and retain newer profile/layout, intro, followers and Behance work. Do not force-push any shared branch.

This branch is a planning checkpoint. Implement the backlog before claiming a product upgrade. If a capability already exists in newer main, inspect and test it, record the evidence and reuse it rather than rebuilding or marking it delivered from assumption.

Run `node scripts/validate-collaboration-upgrade-plan.mjs --self-test`. Install from the repository lockfile with `npm ci` and read the installed Next.js guides required by AGENTS.md before using unfamiliar framework APIs. Do not run arbitrary dependency upgrades.

## 2. Implement complete slices

Complete R0, then R1, R2 and R3 dependencies. Use small conventional commits. New strings go into both catalogs; preserve other supported locale fallbacks and saved locale/country choices. Keep feature gates server-enforced and unfinished UI out of user navigation.

Use separate implementation, security/payment and visual QA reviews. In an environment supporting subagents, give actual tasks to the existing layout specialist and distinct reviewers. Otherwise explicitly identify sequential review passes. Do not claim that writing an agent definition launched a worker.

New money services, commissions, paid vendors and materially new legal terms are HOLD items: stop only the affected gate and report the needed approval/integration. Continue independent safe software work. Do not quietly remove a core task when it is difficult. On a context/time/tool limit, push a truthful checkpoint with remaining IDs and the exact next command; do not call it finished.

## 3. Validate the integrated code, not only isolated components

Use disposable database fixtures for migrations and all write tests. Never seed/reset production. Rehearse the real Postgres migration as well as the zero-credential PGlite path. If Postgres validation or safe rollout preparation is unavailable, treat database-changing deployment as blocked.

Repository validation commands at the inspected baseline:

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

Inspect current CI definitions and run the full required set on the exact integration candidate. Before release retain screenshots, browser traces and real-media recordings, including Studio/profile and collaborator-specific views. Screen captures use fixtures and must be reviewed; passing screenshot capture is not visual approval. No plaintext production secrets in logs or artifacts.

The existing workflow may only run for main pushes/PRs. A branch with no CI run is NOT green. When authorized credentials support it, obtain full candidate CI on the branch using an audited manual workflow path; otherwise a minimal reviewable workflow_dispatch addition may be made as part of R0 (no new secrets or weakened checks). Follow branch rules if they require a PR; do not create an unnecessary PR if repository policy still prefers direct fast-forward integration. Capture local equivalent evidence and disclose hosted-check limitations; do not bypass an enforced CI gate.

## 4. Merge/push without losing concurrent work

Immediately before integrating, fetch `origin/main` again. If it changed, merge it and rerun impacted tests plus the full required release suite for that new candidate. Check clean diff scope, migrations, translations and baseline regressions. No main integration before required checks and review evidence are green.

Push the implementation branch. If current repository policy permits direct main integration, `git push origin HEAD:main` must be a non-forced fast-forward. If main moved again, stop and integrate the newer tip; never overwrite it. Respect enforced PR/protection requirements rather than trying an alternate bypass. Record the tested head and the actual resulting main commit.

Do not announce completion merely because a docs commit or a feature branch was merged. A completed slice must include its implemented UI, data/permission rules, automated tests and release evidence.

## 5. Deploy through existing tooling

Use the repository's established Vercel deployment path for the integrated main commit. Inspect current config first: `.github/workflows/vercel.yml` offers manual status/deploy actions; do not run `setup` to overwrite environment/configuration as part of a normal deployment. Avoid duplicate deployments when the existing Git integration already started one.

Keep production money/monetization flags and approved Founder economics unchanged. Use only existing authorized deployment credentials; never print or solicit secrets in chat. Record deployment identifier, targeted environment, source SHA and completion result. A successful build is not canonical-domain verification.

For database changes, confirm the deployment/migration order and prior recovery point before promoting. Additive migrations must be compatible with both old and new app versions. New feature activation follows the completed release checklist; preserve existing access to obligations/evidence when disabling creation.

## 6. Independent production verification

Update `UI_REVISION` only when the actual feature slice is implemented, for example `collaboration-v2-r1`; do not change it in this planning branch. Ensure it is bound to the built deployment's source SHA and that the endpoint does not guess the main branch tip. Request canonical `https://sawwiq.org/api/version` without cache and require environment `production`, the intended revision and a non-null correct SHA. Compare rendered release stamps on landing and app routes to that response. A later deployed commit must be an inspected descendant containing the release, not just the latest commit.

Visit `/ar`, `/en`, `/ar/explore?tab=agencies`, `/en/explore?tab=agencies`, an authorized real public profile, and the implemented Studio paths with safe controlled accounts. Verify authenticated audience boundaries only with authorized test data. Do not run fixture seeds, auto-sign real contracts or execute money actions on production.

Capture mobile/desktop Arabic/English evidence, fresh and returning sessions, actual uncropped intro playback and the live collaboration slice. Read browser console/network errors. Use timestamps in ISO UTC and Asia/Amman, exact URLs, viewports, locale, deployed SHA and screenshot/recording artifact IDs. Put private artifacts in private storage; store only redacted summaries/reference IDs publicly.

If DNS, browser access, authentication, version data or canonical deployment cannot be checked, mark production verification blocked. Do not claim the site is down or deployed based on that limitation. Compare partial results accurately; do not repeat a stale CI failure after a new passing commit without explanation.

## 7. Rollback and final report

Before deployment record the previous production deployment and compatibility. For a regression stop new feature creation through the safe gate, preserve existing accepted work/contracts, and roll back application deployment or create a forward revert. Never drop tables, force-push main, delete audit/ledger data or rewrite signed terms to recover.

Copy `release-evidence.template.json` into a dated evidence record and populate actual observations. Replace unknowns only with measured facts. Report implemented task IDs, source/main commits, check runs, migration evidence, live source match and visual results separately. V2 is complete only when all R0-R3 tasks and acceptance criteria pass, with HOLD items still explicitly excluded. Otherwise report exactly which slice is verified and what remains.
