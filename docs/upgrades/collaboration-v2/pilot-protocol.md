# Collaboration V2 pilot protocol (consent-based, post-release)

Status: prepared with R3; **not run**. Participation, outcomes and any comparison to R0 are business validation that happens after the software release with real, consenting providers. Nothing in this document is a result.

## Who and how

- Invite by hand (no automated outreach): about 5 agencies and 10 freelancers already on Sawwiq who do bounded real work together. Each confirms in writing that they are taking part and that their pseudonymous funnel counts may be reported.
- Pilots use the production product with their own accounts. No demo data, no staff-created engagements, no invented partners.
- Duration: 8 weeks of observation plus a 30-day follow-up window for the repeat measure.

## What is measured (and its denominator)

| Measure | Source | Denominator / window |
|---|---|---|
| Funnel: inquiry created → sent → reply → quote accepted → contract requested → work accepted → delivered → approved → payout initiated / direct confirmed → repeat | Admin → Statistics → Collaboration funnel (`lib/data/collab-metrics.ts`); demo and staff-owned agencies excluded automatically | events of pilot agencies within the observation window, by creation date |
| Steps and median time on the scripted repeat-hire flow | timed walkthrough of the R3 rehire path (Work → Rehire → send) by each pilot buyer, compared with the R0 baseline steps in `R0-baseline.md` (11 steps discover→contact→scope) | one timed run per buyer, before and after; target at least 25% fewer steps, without relaxing any permission |
| 30-day repeat rate | pairs whose first accepted work order is at least 30 days old | reported only for cohorts with a full window |
| Payment delay by mode | approval → payout initiated (protected, median with n); direct confirmations counted, delay not measured | milestones linked to pilot work orders |
| Guardrails | support incidents, disputes (contract and collaborator-feedback), privacy failures, mobile task failures | counted from Admin → Bugs/Reports and the pilots' weekly check-in |

## What is not claimed

- Payout initiated is not receipt. Direct confirmations are recorded statements, not protection.
- A candidate in the planner is not a team member; a template or rehire draft is not an engagement until the supplier answers.
- Limits carried from the releases: authenticated production smoke was done on a local production build (no authorized production account); intro video playback could not be observed through the build container's proxy.

## Reporting

One page per pilot week with counts and denominators, the guardrail table, and the open issues list. The final report states participation actually achieved, the measured step reduction with its runs, and the repeat rate with its cohort size, or "not measured" where that is the truth.
