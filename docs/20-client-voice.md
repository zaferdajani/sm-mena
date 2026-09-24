# 20 — Client voice: what a real client needs, and how Sawwiq answers it

Source: a 3-minute voice note (24 Sep 2026) from a business owner looking for a new marketing partner after letting his team go. Names are his brands; the problems are common.

## What he runs

| Entity | Brands | Market |
|---|---|---|
| Sider Partners | Blanchard (leadership training agency), Accrues (assessment → training → coaching platform), Nashmi (assessments) | B2B (Blanchard, Accrues), B2C (Nashmi) |
| Computer House | Relaunch as an online video-games store, marketing as "Neo" until legal work is done | B2C e-commerce |

## What he asked for

1. **Professional, market-savvy content** for both entities.
2. **A growth marketer / media buyer**: picks the channels, decides where the money goes, optimizes for the highest return (ROI) on each brand.
3. **Brand guidelines** as a minimum.
4. **One person or team for everything, A to Z**, working **autonomously**: "I shouldn't have to stand over them and tell them what to do."

## What went wrong with the previous team

| Pain (his words, paraphrased) | Root cause |
|---|---|
| "Didn't like their performance or anything they did" | No agreed, measurable targets, so no shared definition of success |
| "Every time: we need more money, we need this and that" | Scope and price not locked; extra charges asked ad hoc |
| Had to manage them himself | No reporting rhythm; the client had to chase for news |
| Starting over with someone new, same risk | Hard to judge an agency's results before hiring; accounts and files may stay with the old team |

## How Sawwiq answers each one (built)

| Need or pain | What the platform does now | Where |
|---|---|---|
| One team, A to Z | **Full-service filter** in Explore (agencies covering content + paid media + branding) and a **"one team for everything"** option on project requests that ranks such agencies first in matching (+8 relevance, labelled "Full team, A to Z") | `lib/full-service.ts`, Explore filters, request form, `lib/matching/score.ts` |
| Several brands, B2B and B2C | Requests carry a **brands** field ("Accrues (B2B), Nashmi (B2C), Neo (online store)"), shown to agencies with the brief | request form, opportunities |
| Many channels | **Several platforms** in Explore filters and on requests | Explore, request form |
| Budget | **Budget as a range** (min–max JOD a month) in Explore; requests already had it | Explore |
| Weak results | Contracts carry **measurable targets (KPIs)** both sides sign, e.g. "B2B leads per month: 60", "Cost per lead ≤ 8 JOD"; reviews have a **"results vs targets"** score so the next client sees who delivers | contract builder step 7, contract document, reviews |
| "More money every time" | **No surprise charges**: a signed clause, and the only way to add money after signing is a **change request** (title, reason, amount, checklist) that the client accepts with their typed name or declines. Accepted changes become a new milestone; declined ones change nothing. Ad spend is **separate**: the client pays the platforms directly, never through the agency | `lib/data/contracts.ts` (`requestChange`, `decideChange`), contract pages |
| Having to chase them | The agency commits to a **reporting rhythm** (weekly / every two weeks / monthly) and posts **progress updates** on the contract; the client's page shows "last update …" and flags **"update overdue"** when the rhythm slips | `postUpdate`, `reportingState`, commitments panel |
| Losing accounts when changing agency | Signed clause: **every account, page, file and design belongs to the client** and is handed over within seven days when the contract ends or is cancelled | contract document (terms v2) |
| Paying for nothing | Existing **protected payments**: money released per milestone only when the client ticks every checklist item; disputes go to Sawwiq | docs/14 |

Contracts signed before this change keep their original terms and fingerprint (terms version 1); new contracts are version 2.

## Still open (next steps worth building)

- **Trial month**: suggest a short first milestone as a paid trial with an easy exit, shown in the builder when a client ticks "one team for everything".
- **Numbers inside updates**: let agencies enter each KPI's current value with the update and chart it against the target.
- **Proposal structure**: ask agencies for a channel plan, budget split and KPIs in the proposal itself, so clients compare plans, not just prices.
- **Multi-brand workspace**: one client account holding several brands with separate contracts and a combined view.
- **Reminders**: WhatsApp or email to the agency when an update is due, and to the client when a change request waits.
