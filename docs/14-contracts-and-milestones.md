# 14 · Packages, Contracts, Milestones and Protected Payments

## What agencies offer

Packages and contracts use one catalogue of deliverables (`lib/deliverables.ts`), picked by tapping a group and an item, then setting how many and on which platform:

| Group | Items |
|---|---|
| Content | Feed posts, carousels, reels / short videos, stories, graphic designs, captions and copy, motion graphics, blog articles |
| Accounts handled | Account management, replies to comments and messages, account setup, monthly content calendar (per platform: Instagram, Facebook, TikTok, Snapchat, LinkedIn, YouTube, Google, X, WhatsApp Business, Threads, Pinterest) |
| Ads | Ad campaigns (per platform), ad designs, influencer posts |
| Websites | Website pages, landing page, online store, website maintenance, SEO work, hosting and domain |
| Branding | Logo, full identity, brand guidelines, packaging |
| On-site / offline | Photo session, video shoot day, event coverage, print materials, outdoor ads, brand activations |
| Reports & meetings | Performance report, strategy meeting |

The service taxonomy gained website maintenance, online store setup, motion graphics, packaging design and an "Offline and on-site services" category (event coverage, print, outdoor ads, activations).

## Contracts (Studio → Contracts)

One page, nine short steps: client → project → what's included → dates → milestones and payments (quick split into 1/2/3 payments or monthly; checklists filled in from what's included) → special requests (each attached to a milestone's checklist) → payment mode → NDA → sign and send. Start from scratch, from a package ("Create a contract from this package") or from a won quote ("Create contract").

The client needs no account: they get a private link (WhatsApp button included), read the full agreement, and sign with their typed name.

**Signing.** Both signatures cover a SHA-256 fingerprint of the exact terms (parties, items, dates, milestones, amounts, checklists, special requests, payment mode, NDA). If anything stored changes, the client can't sign ("changed after the agency signed"). Signatures record the typed name, time and a hashed IP. Jordan's Electronic Transactions Law recognises electronic signatures; the template is a convenience, not legal advice (have a Jordanian lawyer review it before launch).

**NDA.** Optional mutual non-disclosure clause (2 years after the end; portfolio use of published work allowed unless the client objects), plus free-text extra terms.

## Milestones

Each milestone has a name, due date (inside the contract period), amount and checklist. The agency ticks items "done" and sends for approval with a note or links; the client ticks each item "confirmed" and approves, or asks for changes (which clears the confirmations). Approval is impossible until every item — including special requests (★) — is confirmed by the client.

## Two payment modes

| | Protected by Sawwiq | Direct |
|---|---|---|
| Money | Client pays each milestone into Sawwiq before work on it starts (in order) | Client pays the agency however they agree |
| Release | Automatically to the agency when the client approves the milestone | — (both sides can mark "paid" / "received" for the record) |
| Guarantee | Agency knows the money is there; client knows it's released only on confirmation | None; Sawwiq keeps the contract, checklists and history |
| Problems | Either side reports a problem → admin releases or refunds each held milestone | Contract history only |
| Fee | `PLATFORM_FEE_PERCENT` on released amounts (0 during launch), fixed per contract when sent | None |

Money movements are an append-only ledger (`escrow_ledger`: deposit, release, fee, refund). Held = deposits − releases − fees − refunds. Deposits arrive through the payment provider's verified webhook (`ms_<milestone>` references), once per event, amount checked. Cancelling is allowed only while nothing is held; otherwise a dispute.

Admin → Payments → Protected client payments shows money held, paid in, paid out, refunded and fees, every open dispute with its history and checklists, and release / refund / close buttons (audited).

## Before real money

Holding client funds for later release is regulated. Run protected payments through a licensed Jordanian payment provider that supports marketplace / split payouts or escrow (and confirm with the Central Bank of Jordan's requirements), rather than holding funds in a company account. Until then the built-in test checkout (`PAYMENTS_PROVIDER=mock`) lets you run the whole flow without money.
