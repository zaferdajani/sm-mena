# 49 · Collaboration V2, release 2: work orders, threads, file review, capacity

Release 2 turns an accepted inquiry (docs/48) into a delivery workspace. The signed supplier→buyer contract (docs/14: `contracts.agency_id` = supplier, `client_agency_id` = buyer) stays the only agreement and the only place money moves; the work order **references** it and routes every review decision through the buyer's own contract view.

## The work order

Studio → Collaborate → Work → "Work orders". A buyer starts one from an accepted inquiry (the "Start a work order" link on the inquiry and on the Work page; the form is prefilled from the accepted quote) and offers it. The data layer also accepts a supplier the buyer already has a contract with. It carries:

- **versions** of the scope: deliverables (contract catalogue), scope text, revision allowance, due date, review days, a compensation *reference* (which contract and milestone; never an amount of its own) and the permission scope (what the supplier may use or show). Until acceptance the offer is the buyer's to write: the buyer may edit it (a new version replaces the proposal and the tentative capacity hold follows the new due date); the supplier can only accept or decline, and can only accept a version the buyer proposed. From acceptance on the version is **frozen by a database trigger** and fingerprinted (`terms_hash`); superseded versions are frozen history too. An amendment is a new version proposed by either side and accepted by the other; the previous version is superseded, never edited. An accepted amendment with another due date moves the confirmed hold under the provider lock, or is refused with `capacity`.
- a **link to the contract** and optionally one milestone of it (buyer sets it; only a contract between these two, not cancelled).
- a **private parent project** (the buyer's own client contract), which the supplier never receives (`SUPPLIER_ORDER_FIELDS`).
- a **mode**: `private` (subcontracting: the buyer reviews) or `disclosed` (co-delivery: the end client reviews through the existing milestone share; the workspace only records the round).

Statuses: draft → offered → accepted → in_progress → submitted → changes_requested/approved → closed; declined, withdrawn (before acceptance) and cancelled (after) are terminal. Transitions are status-conditioned updates, so a retry is a no-op.

## Three audiences

| Channel | Who reads | Where |
|---|---|---|
| Agency-private notes | the buyer only | work-order messages with `scope = private`; the supplier's workspace query never selects them |
| Work-order thread | buyer and supplier | `scope = shared`; each comment on a file is in this audience too |
| Client thread | the end client | the existing contract updates on the buyer's *own* client contract (docs/20); nothing in the work order writes there |

The scope of a message is fixed when it is written; there is no edit or re-scope path. The label beside each composer names the audience.

## Files and review

Images go through the existing pipeline (`processImage`: same limits and formats as posts), are stored under `collab/<workOrder>/<random uuid>` in the **private** storage prefix (a private Supabase bucket in production; the local `/media` route refuses these keys; `mediaUrl` throws for them) and are served only by `/api/collab/assets/<id>` to the buyer or supplier of that work order (`private, no-store`, noindex). A new version of a file supersedes the previous one but keeps it and its comments; comments can carry a point on the image (percent of width and height).

The supplier submits a round (bounded by the accepted revision allowance plus one). The buyer's decision is claimed first (a status-conditioned update, so a concurrent decision loses), then the contract is acted on, then the round records the effect. In private mode:

- **Approve**: if a milestone is linked and is `submitted` on the contract, the buyer's decision confirms every checklist item and calls the existing `approveMilestone` with the buyer's contract view (`getContractForClientAgency`). For a protected contract that is the guarded settlement that pays the supplier's milestone out; for a direct contract it records approval. Any other milestone state is reported as an effect (`milestone_not_submitted`, `milestone_locked`) and the work order still records the decision. The buyer's parent client contract is never touched.
- **Request changes**: uses the contract's revision round through `requestChanges`, with the same effect reporting.

Each round keeps its decision, note and contract effect.

## Payment projection

The workspace shows the money state read from the linked contract and milestone only: agreement, funding (protected), delivery, approval, payout, receipt. A protected payout is shown as *initiated*, never as received (Sawwiq never confirms receipt on its own). Direct payments are the parties' recorded confirmations, labelled as such. Test-mode contracts keep the "no real money" wording. Nothing here writes to the ledger.

## Capacity

A draft is invisible to the supplier until it is offered. Offering a work order with a due date places a **tentative hold** (7 days) on the supplier's declared capacity for that day. Accepting confirms it inside the acceptance transaction under a per-provider advisory lock (`pg_advisory_xact_lock`): declared capacity of the covering availability windows minus confirmed holds must leave room, or the acceptance fails with `capacity`. Where the provider declared no capacity nothing is enforced and the UI says so. Holds are released on decline, withdraw, cancel and approval; an expired tentative hold counts for nothing (the daily cron marks it, and acceptance treats an overdue one as absent and re-checks capacity). External calendars are never read.

## Switch, privacy, data

Feature switch `collaboration_delivery` (docs/34). Data: migration `0024_collaboration_r2` (additive): `work_orders`, `work_order_versions` (+ freeze trigger), `work_order_messages`, `work_order_assets`, `work_order_comments`, `work_order_submissions`, `capacity_reservations`. Reads are scoped in `lib/data/work-orders.ts` (`orderFor` by buyer or supplier id); the supplier projection drops the parent contract; audit rows `collab.work_order.approved|changes_requested`. Personal data notes: docs/08. Tests: `tests/unit/work-orders.test.ts`, `tests/e2e/work-orders.spec.ts`.
