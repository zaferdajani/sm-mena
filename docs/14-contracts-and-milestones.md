# 14 · Contracts, Milestones and Protected Payments

This is what is built today. The legal texts (general conditions, country annex, signatures) are described in docs/22-legal-documents.md.

> **Before real money moves:** a lawyer licensed in each country must review the contract conditions (`lib/legal/clauses.ts`, version `2026-10`) and the country annex, and the payment arrangement must run through a licensed payment partner (see "Who holds the money"). Until both are done, protected payments stay in test mode.

## What agencies offer

Packages and contracts use one catalogue of deliverables (`lib/deliverables.ts`). The agency taps a group and an item, then sets how many and on which platform:

| Group | Items |
|---|---|
| Content | Feed posts, carousels, reels / short videos, stories, graphic designs, captions and copy, motion graphics, blog articles |
| Accounts handled | Account management, replies to comments and messages, account setup, monthly content calendar (per platform) |
| Ads | Ad campaigns (per platform), ad designs, influencer posts |
| Websites | Website pages, landing page, online store, website maintenance, SEO work, hosting and domain |
| Branding | Logo, full identity, brand guidelines, packaging |
| On-site / offline | Photo session, video shoot day, event coverage, print materials, outdoor ads, brand activations |
| Reports & meetings | Performance report, strategy meeting |

## Creating a contract (Studio → Contracts → New)

The builder is one page of short steps:

1. Client.
2. Project.
3. What's included.
4. Dates.
5. Milestones and payments. The agency can split quickly into 1, 2 or 3 payments, or monthly. Checklists are filled in from what's included. This step also sets the **revision rounds per milestone** (0 to 10, default 2).
6. Special requests. Each one is attached to a milestone's checklist.
7. Results and reporting.
8. Payment and the agency's special conditions.
9. NDA.
10. Sign and send.

A contract can start from scratch, from a package, from a won quote, or from a partner (see "Partner contracts" below).

The client needs no account. The agency sends a private link (a WhatsApp button is included). The client reads the full agreement there and signs with a typed name and a drawn signature.

**Signed terms.** Both signatures cover a SHA-256 fingerprint of the exact terms. Terms **v4** (`TERMS_VERSION = 4`) add four things to v3:
- the review period (`reviewDays`);
- the revision rounds (`revisionRounds`);
- whether protected payments were **live or in test mode** when the contract was sent (`paymentsLive`);
- the buying agency, for partner contracts (`clientAgencyId`).

Every contract keeps the version and wording it was signed with. Contracts on v1 to v3 render and behave as before: no review deadline and no round limit.

## Who holds the money (the go-live switch)

One switch in `lib/payments/readiness.ts` decides:

```ts
protectedPaymentsLive() // PAYMENTS_PROVIDER is a real provider (not "mock") AND PROTECTED_PAYMENTS_LIVE === "true"
protectedPaymentsCopy(locale) // one sentence for screens, landing and About copy
```

| | Test mode (today) | Live |
|---|---|---|
| Holder | Nobody: no real money moves through Sawwiq | **Sawwiq's licensed payment partner** holds each milestone payment |
| Checkout | The built-in test checkout (`/c/<token>/fund/<milestone>`) | The partner's hosted checkout (`paymentProvider().createCheckout`) |
| Contract terms | The pay-in, release and refund steps are a simulation. The parties settle payments directly. No fee. | The payment partner is named as the holder. The fee applies to released amounts. |
| Screens | Every contract, pay and checkout screen shows an amber banner: "Protected payments are in test mode" | "Protected through Sawwiq's licensed payment partner" |

No screen, document or email says that Sawwiq itself holds money.

Each contract records the state it was sent in (`contracts.payments_live`), and that state is part of the signed terms:
- A test contract always uses the test checkout and refuses deposits from a real provider.
- A live contract refuses test deposits (`recordDeposit` returns `wrong_mode`).

The wording lives in `lib/legal/payment-holder.ts`, so the screens, the contract text and its PDF, and the receipts all say the same thing.

## Milestones

Each milestone has a name, a due date, an amount and a checklist. The checklist holds the deliverables plus the client's ★ special requests.

1. **Pay in** (protected): before work starts, the client pays the next milestone. Milestones are paid in order.
2. **Deliver**: the agency ticks every item "done" and sends the milestone with a note or links. This starts the **review period**. It is `reviewDays` long, 7 days by default; `MILESTONE_REVIEW_DAYS` (3 to 30) changes it for new contracts.
3. **Review**: the client has three choices:
   - tick each item "confirmed" and approve (the money is released);
   - **ask for changes**, which uses a revision round;
   - **report a problem** on that milestone, which opens a dispute.
4. **Reminders**: two days before the deadline and again one day before, the client and the agency are told. Notifications appear in-app, on the client's device and in the agency's studio, and by email where an address exists.
5. **Deemed acceptance**: if the deadline passes with no answer, the milestone counts as accepted. In protected mode it is paid out. Both sides are told. The event goes into the contract history and into the audit log (`escrow.auto_release`, with no actor, because it is a system decision under the signed terms).

Both sides see the deadline and the days left on each milestone.

### Revision rounds

Each "request changes" uses one of the milestone's rounds. The count compares `milestones.change_rounds` with `contracts.revision_rounds + milestones.extra_rounds`. Both sides see "Revision rounds: n of m left".

When no rounds are left, the client can **ask the agency for an extra round**. The agency then either:
- **gives one free** (`grantExtraRound`); or
- proposes a **paid change request**. This is the existing change-request mechanism: the client accepts it with its typed name, and it becomes a new milestone.

The client can always approve or open a dispute instead.

## Money: ledger, idempotency, fees

Money movements are recorded in an append-only ledger (`escrow_ledger`), with four entry types: deposit, release, fee and refund. Held = deposits − releases − fees − refunds.

- **Append-only**: a database trigger (migration 0011) refuses to delete ledger rows or change their money fields.
- **Once per milestone**: every row carries an idempotency key, unique in the database: `dep:<milestone>`, `rel:<milestone>`, `fee:<milestone>`, `ref:<milestone>`.
- **Guarded transitions**: every status change is an `UPDATE … WHERE status IN (…)`, in the same transaction as its ledger rows (`lib/data/escrow.ts → settleMilestone`, and `recordDeposit`). So a replayed webhook, a double click on "Approve", two admins at once or a retried job all apply only once.
- **Payment notifications**: `POST /api/payments/webhook/<provider>` takes these steps:
  1. verifies the provider's signature (HMAC-SHA256 for the test provider, with `PAYMENTS_WEBHOOK_SECRET`);
  2. validates the payload shape (zod);
  3. stores each provider event id once (`payment_events` is unique on it);
  4. checks the milestone, amount, currency and live/test mode before recording a deposit.
- **Fee**: `PLATFORM_FEE_PERCENT`, 10% by default, fixed per contract when it is sent. The fee comes **only from the part released to the agency**; nothing refunded carries a fee. No fee is charged in test mode, although the ledger still records the simulated split so the whole flow can be tried.

## Disputes (per milestone)

Either side can open a dispute on a milestone whose money is held, with a written statement (`milestone_disputes`). A milestone can have only one open dispute at a time. The contract pauses (status "disputed") until every dispute on it is settled.

- **Evidence**: both sides add statements and links on the contract page, and each side sees the other's. Links must be http or https, up to 5 per entry. Evidence is append-only (`dispute_evidence`).
- **Decision**: made in Admin → Payments → Protected client payments. For each milestone the admin chooses one of three outcomes:
  - **release all** to the agency;
  - **refund all** to the client;
  - **split**: an amount to the agency plus an amount refunded, which must add up to what is held.

  The admin writes reasons, and both parties read them. Each decision is audited (`escrow.dispute_decision`).
- **One appeal**: either side may appeal once, within **7 days**, with a note. The admin then decides again, and that decision is **final**.
- **When money moves**: only once a decision is final. That happens in one of three ways:
  - the appeal window closes (the daily job finalises it);
  - both sides press "Accept the decision";
  - the appeal is decided.

  The first decision stays on the record (`first_decision`).
- **No money held**: a contract-level problem is flagged for the team, who can close it with a note.

For each dispute, admins see the timeline, the statement, both sides' evidence, the checklist with who ticked each item, the history and the decision form. The older "release / refund now" buttons remain for held milestones that have no dispute of their own. Those decisions are final immediately, and audited.

## Cancellation

- **Before the client signs**: either side can cancel. The client declines, or the agency cancels.
- **After signing, while nothing is held**: the agency can cancel the rest of the contract.
- **While money is held: mutual cancellation.** One side proposes, for each held milestone, how much goes to the agency; the rest is refunded. By default the proposal is a full refund. The other side then either:
  - accepts: each milestone is settled once and the rest of the contract is cancelled; or
  - declines: either side can then open a dispute.

  The side that proposed can withdraw the proposal.

## Receipts

Every deposit, payout and refund has a receipt (`lib/contracts/receipts.ts`, `lib/legal/receipt.ts`). Receipts are listed on both sides' contract pages, each with a PDF in Arabic and English.

- **Route**: `GET /api/receipts/<token or contract id>/<ledger entry>?lang=ar|en`. Access works like the contract PDF; staff access is audited.
- **Contents**: the contract number, milestone, date, gross amount, Sawwiq's fee and the net amount to the agency. A deposit receipt shows the fee that will apply on payout. Amounts are in the contract's currency, which is the agency's country currency (`currencyOf`).
- **Test mode**: receipts carry a "TEST MODE — NO REAL MONEY" watermark.

A receipt is not a tax invoice.

## Partner contracts (agency ↔ agency or freelancer)

The one doing the work is always the contract's agency.

- **Buying from a partner**: in Studio → Partners, open an accepted partner and choose "Ask this partner for a contract" (title, details, budget). The partner is notified and sees the request under Studio → Contracts → "Contract requests from partners". "Create the contract" opens the builder with the asking agency filled in as the client (name, WhatsApp, email).
- **Supplying a partner**: "Create a contract for this partner" (or `/studio/contracts/new?partner=<agencyId>`) opens the builder with the same details filled in.

Only accepted partners can be contracted this way; the server checks this (`arePartners`). The contract stores `client_agency_id`. The buying agency sees the contract under "Contracts you're buying". From its own studio, signed in and with no private link needed, it can:
- sign;
- pay;
- approve or ask for changes;
- open a dispute;
- cancel.

Both agencies get notifications.

## Completed-project reviews

A contract completes when every milestone is settled and at least one was paid out. The client is then invited to review through the usual single-use review link (`review_requests.contract_id`, one per contract). The link is shown on the client's contract page and sent as a notification.

- The review is stored with `source = "contract"` and the contract id **only** when both are true: the contract ran with live protected payments, and money was actually paid out to the agency (`isPaidCompletedContract`). A contract completed in test mode produces an ordinary invite review.
- `reviewProvenance(review)` in `lib/reviews/provenance.ts` returns the source for the review label:
  - `completed_project`: "Completed project (via Sawwiq)";
  - `contact_confirmed`: reviewed after contacting the agency through Sawwiq;
  - `invited`: reviewed through the agency's invite link.

## Notifications

Each contract event notifies the other side (`lib/data/contract-notify.ts`):
- in the agency's studio;
- in the buying agency's studio;
- on the client's device, once it has signed (visitor cookie). The link `/c/<contract id>` opens the contract only on that device.

An email also goes out where the party gave an address (`lib/notify.ts`; it is a mock without `RESEND_API_KEY`).

The notification kinds are:
- signed, paid in, delivered;
- changes requested, approved, auto-approved, review reminder;
- extra round asked, extra round given;
- dispute opened, evidence added, decided, appealed, final;
- cancellation proposed, accepted, declined;
- contract request, contract received, completed, review invite.

Notifications never carry a phone number or an email.

## Daily job

`runMilestoneJobs()` runs once a day inside the daily cron `/api/cron/retention` (one cron keeps within the Vercel Hobby limit; `GET /api/cron/milestones` runs it on demand). Both are protected by `CRON_SECRET`. It does three things:
- sends reminders;
- applies deemed acceptance;
- finalises dispute decisions whose appeal window has closed.

It looks at everything that is due, so a missed day is caught up. Every step is a guarded state change, so running it twice changes nothing.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `PAYMENTS_PROVIDER` | `mock` | Payment adapter (`lib/payments/provider.ts`). Only `mock` (the test checkout) exists today |
| `PROTECTED_PAYMENTS_LIVE` | unset | Protected payments are live only when this is `true` **and** a real provider is configured |
| `PAYMENTS_WEBHOOK_SECRET` | a dev secret outside production | HMAC secret for provider notifications |
| `PLATFORM_FEE_PERCENT` | 10 | Fee on released amounts (0 to 30), fixed per contract |
| `MILESTONE_REVIEW_DAYS` | 7 | Review period for new contracts (3 to 30) |
| `CRON_SECRET` | none | Protects the cron routes |

## Code map

- `lib/contracts/rules.ts`: the pure rules (deadlines, reminders, rounds, fee and split math, appeals, the default cancellation split). Unit-tested.
- `lib/data/contracts.ts`: contracts, signing, funding, deliveries, approvals, rounds and completion.
- `lib/data/escrow.ts`: `settleMilestone`, the only way money leaves protection.
- `lib/data/contract-disputes.ts`, `contract-cancel.ts`, `contract-jobs.ts`, `contract-requests.ts`, `contract-notify.ts`: disputes, cancellation, the daily job, partner requests and notifications.
- `lib/payments/readiness.ts` and `lib/legal/payment-holder.ts`: the go-live switch and its wording.
- Pages:
  - `/studio/contracts`: own contracts, contracts being bought, partner requests;
  - `/studio/contracts/[id]`: the agency's or the buying agency's view;
  - `/studio/contracts/[id]/fund/[milestone]`;
  - `/c/[token]`: the client's view;
  - `/c/[token]/fund/[milestone]`;
  - Admin → Payments → Protected client payments.
- Tests:
  - `tests/unit/milestones.test.ts`: the state machine, idempotency, disputes, cancellation, partners and reviews;
  - `tests/unit/contracts.test.ts`;
  - `tests/e2e/milestones-full.spec.ts`;
  - `tests/e2e/contracts.spec.ts`.

## Before real money (checklist for the owner)

1. Sign with a licensed payment partner in each country. It must support marketplace or split payouts, or escrow. Confirm the central bank's requirements. Sawwiq never holds client funds in a company account.
2. Implement the partner's adapter in `lib/payments/provider.ts`: checkout, signed webhooks with event ids, payouts and refunds. The ledger rows then record the partner's references. Check chargeback handling against the partner's rules.
3. Have a licensed lawyer review `lib/legal/clauses.ts` (version 2026-10) and each country annex. The review must cover:
   - deemed acceptance;
   - revision rounds;
   - split decisions and the one appeal;
   - mutual cancellation;
   - chargebacks and recovery from future payouts;
   - IP transfer per milestone;
   - the limits of protection.
4. Then set `PAYMENTS_PROVIDER` and `PROTECTED_PAYMENTS_LIVE=true`. Contracts sent before the switch stay test contracts.
