# 40 · Collaboration: partners on client milestones

An agency without an in-house photographer (or videographer, designer, media buyer…) can bring in a freelancer or partner agency on **one milestone** of a client contract, for an agreed **percentage** or **fixed amount** of that milestone. The partner delivers that milestone and is paid its share **as soon as the client confirms it**. It never waits for the agency to finish the rest of the contract.

This builds on the partner network (docs/30): only **accepted partners** can be offered a share.

## Flow
1. **Agency proposes** (studio contract page → "Partners on milestones").
   - Pick a milestone that hasn't been handed over yet (`pending`, `funded` or `changes_requested`), a partner, and a share: a percentage of the milestone amount or a fixed amount. The share can't exceed the milestone.
   - One live share per milestone (unique index). The agency can withdraw it until the partner answers.
2. **Partner accepts or declines** (studio → Contracts → "Partner work").
   - On accepting, the agreement is fingerprinted (`shareTermsHash`) and **frozen by a database trigger**. Amount, partner and milestone can never change, and the share can't be deleted.
3. **Partner delivers.**
   - `/studio/partner-work/<share id>` shows the milestone's checklist, the partner's share and the payout.
   - The partner ticks the items and **hands the milestone to the client** (`submitMilestone`). The agency is notified.
   - The client's name and the rest of the contract stay private to the agency.
4. **The client confirms** every checklist item, as for any milestone. If the client doesn't answer within the signed review period, deemed acceptance applies (`escrow.auto_release`). An admin dispute decision can also release it.
5. **Money** (protected mode):
   - `settleMilestone` pays the partner's share and the agency's remainder in one guarded transaction. Each part carries Sawwiq's fee on its own (`splitRelease`, `lib/contracts/shares.ts`).
   - Ledger rows: `prel:`/`pfee:` for the partner (with `payee_agency_id`), and `rel:`/`fee:` for the agency. `money-out.ts` sends each payout to its payee.
   - A partial release (dispute split) pays the share in proportion; a full refund pays nothing.
6. **Direct mode:** the agency pays the partner itself after the client confirms the milestone. The agency marks the share "paid", and the partner confirms it was received.

## What the client sees
The milestone shows "Delivered with <partner name>". The client's price, terms and signed contract don't change: the share is an agreement between agency and partner.

## Invariants kept
- Money leaves protection only through `settleMilestone` and the append-only ledger, and only when the client confirms, the review period ends, or an admin decides. The partner doesn't need the agency's approval, and the agency can't release client money early.
- Sawwiq never holds money itself; the payment partner must support split payouts before protected payments go live (docs/32 §1).
- Test money stays test money (`provider = 'mock'`).

## Code
- Rules: `lib/contracts/shares.ts`
- Data: `lib/data/milestone-shares.ts`
- Actions: `app/[locale]/(main)/share-actions.ts`
- UI:
  - `components/contracts/milestone-partners.tsx` (agency)
  - `components/contracts/partner-work-list.tsx` and `studio/partner-work/[id]` (partner)
- Tests: `tests/unit/milestone-shares.test.ts`, `tests/unit/collaboration.test.ts`, `tests/e2e/collaboration.spec.ts`
- Migration: `0016_milestone_shares` (table and freeze trigger, plus `escrow_ledger.payee_agency_id`)
