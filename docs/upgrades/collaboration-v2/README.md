# Sawwiq Collaboration V2 — implementation handoff

## Status and authority

Prepared 2026-09-27 for `zaferdajani/sm-mena`, from inspected main commit `2a4178b7b216f1fa8868a1f6dfc550a882851ab3`. Branch: `plan/collaboration-v2-upgrade`. Before publication main advanced to `34554e35db6b26a0ba2d8fd48198a5ba9c84b38e` (onboarding PR #16); that newer commit is the branch parent, so its changes are preserved. The detailed collaboration inspection remains the earlier snapshot; refresh main before implementation.

**This branch contains a researched implementation plan, acceptance specifications, a machine-readable backlog, a planning validator and a deployment handoff. It does not implement the proposed product features. Merging these documents alone does not upgrade or deploy the product.** All backlog items start `planned`; production verification starts `not_run`. No application code, database, pricing, environment variable, production setting or signed contract is changed by this package.

Owner request: use the researched collaboration patterns to improve Sawwiq, preserve the current platform, and prepare work that Claude can implement, merge/push and deploy. The implementing session should proceed through the scoped releases below, not stop after writing another proposal. It must report real external blockers rather than invent credentials, approval, test results or deployment evidence.

## Product direction

Make Sawwiq the place where an agency can win a brief, find the missing capability, agree the work, deliver it with clear permissions, and rehire the same independent collaborator. Freelancers must gain a useful opportunity-discovery and delivery experience, not merely wait for invitations.

Our differentiation hypothesis is the combination of Arabic-first creative workflows, two-sided discovery, availability with freshness, private subcontracting plus disclosed co-delivery, relevant portfolio evidence, and permission-aware delivery. These are proposed advantages to validate, not proof of uniqueness or superiority over every competitor.

## Read in this order

1. Repository `AGENTS.md`, `CLAUDE.md`, then this document.
2. `RESEARCH.md`: dated primary sources and limits.
3. `PRODUCT.md`: user journeys, releases, measurable success and commercial boundaries.
4. `ARCHITECTURE.md`: existing-code map, data/authorization boundaries and migration rules.
5. `ACCEPTANCE.md` and `backlog.json`: implementation tasks and release gates.
6. `DEPLOYMENT.md`: integration, rollout, rollback and production evidence.
7. `CLAUDE_HANDOFF.txt`: the owner's single-paragraph execution instruction.

Run `node scripts/validate-collaboration-upgrade-plan.mjs --self-test` to validate this planning package. **That command does not test the application.**

## Bounded releases

| Release | Complete user outcome | Deployment policy |
|---|---|---|
| R0: baseline and safety | Reproduce existing journeys, map schema/permissions, freeze invariants and collect real screenshots/metrics | Prerequisite, not a customer-facing feature release |
| R1: find and rehire | Agency and freelancer discovery, consent-based availability, private saved roster, structured work inquiry | Deploy only the integrated, fully tested slice; unfinished R2/R3 UI stays inaccessible |
| R2: agree and deliver | Work orders linked to existing contracts, privacy-safe agency review, file versions/comments, truthful payment state | Preserve all legacy contract behavior; no new real-money activation |
| R3: repeat and improve | Scope-to-team assistant, read-only cost planning, recurring work templates, collaborator evidence and outcome metrics | AI optional; subscriptions/real-money changes remain out of scope |

Complete the software in R0-R3 in dependency order. Do not indefinitely expand scope to match every feature of every competitor. The HOLD list in PRODUCT.md is explicitly excluded. Each deployed slice must work end to end and have its own evidence; do not call R1 delivery completion of V2.

## Existing work to preserve

Keep the showcase/feed, agency and freelancer profiles, client matchmaker, country/language selection, Founder rules, Behance import, followers, existing partner contracts, disclosed milestone shares, release stamps and bounded logo intro. Never restore the teaser to the homepage. Do not overwrite newer commits or replace the existing visual system with a new template.

## Responsibilities

Claude's implementing session is the coordinator. Use distinct implementation, authorization/payment review and visual-QA passes; use real subagents when available and identify their actual results. Otherwise perform explicitly separated reviews without claiming independent agents ran. Reuse the repository's layout specialist where available. A document or agent definition is not a running worker.

## Completion report

For each release report: implemented task IDs, exact source commit, migration rehearsal, checks with run links/results, screenshot/recording evidence, main merge, deployment identifier, production `/api/version` and rendered stamp agreement, and outstanding blockers. Preserve `release-evidence.template.json` as a template; write actual results to a new dated evidence file. Keep private screenshots and logs in access-controlled artifacts, not a public repository.
