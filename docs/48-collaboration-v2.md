# 48 · Collaboration V2, release 1: find, book and rehire other providers

The plan and its acceptance contract live in `docs/upgrades/collaboration-v2/`. This page describes what release 1 (R1) actually does. The signed partner contract (docs/14: supplier = `contracts.agency_id`, buyer = `client_agency_id`) and the disclosed milestone share (docs/40) stay the only places where terms and money live; everything here leads into them and never around them.

## One area, five views: Studio → Collaborate (`/studio/collab`)

| View | For whom | What it does |
|---|---|---|
| **Discover** | agencies (and freelancers, to team up) | Finds freelancers and specialist agencies for a role, in the asker's country or serving it. Hard filters first (active, not self, not blocked, not opted out, role covered, work mode, city for on-site, not busy), then a score with the reasons shown on the card. Two groups: **availability confirmed** and **needs confirmation**; unknown or stale availability is never labelled ready. Freelancers see the published needs that match their roles here. |
| **My needs** | agencies | Publish, on purpose, what the team is looking for (roles, scope, dates, budget, mode, audience public or partners, expiry). Nothing is derived from `seeks_roles`. Providers raise a hand; the agency sends them an inquiry from the reply. |
| **My network** | everyone | The **private roster** (groups, tags, notes, negotiated-rate reference; the provider is never told), accepted partners not yet saved, **invitation links**, the collaboration **preference** (modes, work modes, open to work), blocks. Requests and contact details stay on the legacy Partners page. |
| **Work** | everyone | **Delivering**: inquiries sent to me (quote, counter with a new version, or decline). **Buying**: my inquiries with a private quote comparison. **Disclosed co-delivery**: a link to the existing partner milestones in Contracts. |
| **Availability** | everyone | Date ranges typed in the provider's zone, stored as UTC: available / limited / busy, optional capacity, visibility (only me / partners / any provider), a private note. A confirmation is fresh for 14 days; "Still right" re-confirms. Sawwiq never reads an external calendar. |

Feature switch `collaboration` (docs/34): `soon` shows Coming soon on every view and refuses every action; `off` hides the tab and 404s the pages. Old links (`/studio/partners`, `/studio/contracts`) keep working.

## The R1 golden path

1. Agency publishes a need, or searches Discover by role and dates.
2. The candidate card shows why it fits and its availability state; the agency saves it to the roster, requests partnership, or sends a **work inquiry**.
3. The inquiry (up to 8 recipients from roster and partners) carries title, role, deliverables from the contract catalogue, scope, supplied assets, dates and zone, work mode and city, an optional budget, the way of working (private subcontracting / disclosed co-delivery / referral) and a reply deadline. An optional link to the buyer's own client contract is private. The **audience preview** lists exactly the fields the recipient gets (`SUPPLIER_FIELDS`), the same list the server projects (`supplierProjection`).
4. Each supplier sees the buyer, the projection and its own quotes only. It quotes (price, dates, what's included, what's not), counters with a new version, or declines. The buyer compares its quotes side by side; different currencies are shown, never converted or summed.
5. The buyer accepts one quote. In one transaction the inquiry converts, the winner is frozen and the others are marked "not chosen". Then the existing handoff: accepted partners get a **contract request** (docs/14: the supplier writes the contract, the buyer signs in its studio); others get a **partnership request** first, and the buyer asks for the contract once it is accepted. Nothing is signed or paid here.
6. Rehire: from the roster ("Rehire" once an engagement happened), a fresh inquiry, never a booking.

## Invitation links

Studio → Collaborate → My network → "Create link". Only a hash of the token is stored, with an optional label and roles (no phone, no email). The link expires in 14 days and can be revoked. Whoever opens `/invite/<token>` sees the sender's public name; signed in, they accept or decline; not signed in, "Create my page and accept" carries the token through sign-up. Accepting reuses or creates one accepted partner request and adds the invitee to the sender's roster: never a duplicate provider, and a repeated acceptance returns the same answer. A recent decline between the two keeps the pair quiet for 30 days; a block stops everything.

## Privacy and authorisation

- Reads are scoped in the data layer, not only on pages: `listRoster(owner)`, `inquiryForBuyer(buyer, id)`, `inquiryForSupplier(supplier, id)`, `listOpenNeedsFor(provider)`. A wrong id or a wrong side returns nothing.
- Availability windows follow their visibility; a busy window never names a counterparty; a hidden window reads as "unknown", not as a leak.
- Demo agencies are never suggested to real ones and cannot be inquired by them.
- Rate limits per sender: needs 10/h, replies 20/h, inquiries 20/h, invitation links 10/h. Audit: `collab.inquiry.sent`, `collab.inquiry.converted`.
- Personal data notes: docs/08 §Collaboration V2.

## Data

Migration `0022_collaboration_v2` (additive only): `collab_profiles`, `availability_windows`, `collab_needs`, `collab_need_replies`, `collab_roster`, `collab_invites`, `collab_blocks`, `work_inquiries`, `work_inquiry_recipients`, `work_quotes`. Jobs in the daily cron (`/api/cron/retention`): `expireNeeds`, `expireInquiries`.

Code: rules in `lib/collab/` (`time.ts`, `availability.ts`, `discovery.ts`, `schemas.ts`, `types.ts`); data in `lib/data/collab-*.ts`; actions in `app/[locale]/(main)/studio/collab/actions.ts`; UI in `components/collab/`. Tests: `tests/unit/collab-rules.test.ts`, `tests/unit/collab-data.test.ts`, `tests/e2e/collab-v2.spec.ts`.

## Not in R1 (HOLD or later releases)

Work orders, threads, asset versions and the reviewer flow arrived in R2 (docs/49); the planner, cost worksheet, templates and collaborator feedback in R3 (docs/50). No new money rail, fee, Founder change, paid vendor, automatic renewal, bulk outreach or public rate exposure.
