# Product specification

## 1. Keep one platform, not another marketplace inside it

Use the existing brand, public profiles, feed, country choice and Studio. Improve Studio information grouping before adding destinations. Keep existing partner URLs and links functional; proposed subviews must not break old bookmarks.

Studio's collaboration area has four clear views: Discover, My network, Work, and Availability. Discover changes appropriately for agencies and freelancers. Work separates Buying, Delivering, and Disclosed co-delivery. Existing contracts remain the signed source of truth and are linked, not recreated as a competing financial subsystem.

Every screen has one visible purpose, clear section headings, useful empty states and one primary next action. A provider with no collaborators must have a sensible path to discover or invite one. Do not populate production with invented work or partners to fill gaps.

## 2. Three relationship models

### Private subcontracting (primary)
The buying agency requests work; the supplier quotes and creates/signs the existing supplier-to-agency contract. A work-order workspace links that contract to an optional parent client project. The freelancer delivers to the buying agency. The buying agency remains responsible for its client-facing deliverable.

The supplier sees their scope, compensation, assets and feedback, not the agency's resale price, full end-client brief or unrelated assignments. The buyer's end-client collection must not become an undisclosed indefinite condition on the supplier's agreement. Contractual payment/review conditions stay visible to both signers. Private branding cannot misrepresent a contractor as an employee or override required subcontracting consent.

### Disclosed co-delivery (existing behavior)
Keep the current accepted-partner milestone-share route and client-visible attribution. One live partner share per milestone remains in the first V2 release. Separate work packages/milestones handle multiple specialists without silently changing signed contracts or payout semantics. Work submitted through this mode retains its existing client approval/review/dispute behavior.

### Referral (separate, lightweight)
Permit a consented introduction or handoff of an opportunity, clearly labelled as a referral rather than delivery responsibility. Do not introduce new referral commissions in V2. The originating client's private information is not automatically passed on.

## 3. R0 — establish a reliable baseline

Capture the actual agency, freelancer, buying-agency and end-client journeys using fixtures/test accounts. Inventory current schema, guards, optional services and feature switches. Include Studio/profile layouts, the logo intro, Explore, public profiles, partner contracts, shares, Behance import and followers in the regression map.

Record measured click/step counts and task times for discover → contact → scope → agreement and repeat hiring. Document any pre-existing defect rather than marking it as a newly delivered feature. Use repeatable scenarios and a fixed test environment for performance comparisons.

## 4. R1 — find collaborators and rehire

### Two-sided discovery
An agency finds providers who fill a role or work inquiry. A freelancer finds agencies with an explicitly published collaboration need. Reuse roles/services; do not expose an agency's internal `seeksRoles` automatically as a public hiring announcement. Add opt-in publication/expiry controls. Support agency-to-agency specialists, not only freelancer hires.

Show why a candidate fits, relevant permitted portfolio examples, city/on-site coverage, working language, collaboration preference and availability freshness. Same-country, remote and travel coverage are distinct. A preference for Arabic copy or on-site Amman work is a task requirement, not a proxy for nationality.

Use hard eligibility filters before ranking. Unavailable candidates cannot be labelled ready. Unknown availability goes into a clearly marked needs-confirmation group unless the user explicitly requires confirmed availability only. Paid/Founder status does not alter this collaboration relevance score; do not change existing client matching or Founder access rules.

### Availability
Start with manual date ranges, timezone, work mode and optional declared capacity. Store when the provider last confirmed it and when it expires. A proposed booking is not confirmed capacity. Prevent over-allocation of the capacity recorded in Sawwiq at acceptance with transactional checks. Do not promise prevention of conflicts with unconnected external calendars.

Only publish the availability detail the provider chooses. A busy slot must not reveal another agency or client. Calendar integrations are optional later; no OAuth requirement for this release.

### Private roster and safe invitations
Each agency can save opted-in public providers or accepted partners into private groups, add restricted operational notes, and rehire from prior work. Saving someone is not consent to partnership, public affiliation or an engagement. Keep negotiated rates limited to authorized staff at the owning agency; the supplier sees their own agreed offer, not agency-internal notes or resale margin.

Invite an existing collaborator with an explicit user action, minimal data, revocable/expiring invitation token, throttling and recipient accept/decline. No unsolicited bulk address-book import. Linking an existing account does not create a duplicate provider. Declined invitations respect cooldowns and recipient blocking controls.

### Structured work inquiry and comparison
Capture role, deliverable, quantity, supplied assets, dates/timezone, location/work mode, budget currency, privacy mode and response deadline. It can originate from a project or stand alone. Send only to approved recipients; show an audience/data preview first.

An inquiry is not a contract. Replies may accept interest, decline or propose a quote with changed scope/timing. Compare quotes in an agency-private view by deliverables, price/currency, dates and disclosed exclusions. Never silently convert currencies or expose competing private offers to suppliers. R1 links accepted commercial intent into the existing partner-contract flow; no invented signature or new payment mechanism.

## 5. R2 — agree and deliver

### Work orders and existing contracts
Turn an accepted inquiry into a versioned work order that references, rather than replaces, the existing contract. Show which provider is the supplier and which is the buyer before signing. Confirm accepted-partner eligibility using the existing server checks.

A work order records deliverables/formats, revision allowance, due dates, reviewer, review deadline, compensation reference, cancellation/change references and permission scope. Accepted versions are immutable. Renegotiation creates a new agreed version/change request; no mutation of sent/signed contract terms. The end-client price is not required in the supplier's workspace.

### Separate collaboration channels
Use three explicit scopes: agency-private notes, the buyer-and-supplier work-order thread, and the client thread. 'Internal' must never ambiguously include every supplier on a project. Comments and assets require resource-specific authorization in the server, not only a UI toggle.

Show an unambiguous audience label beside Send. A share dialog previews exact fields and assets the recipient can access; it uses the same server projection as the real recipient. Editing an old internal comment cannot turn it into a public comment; sharing requires a deliberate new action. Download links, notifications, exports and AI context follow identical visibility rules.

### Versioned creative review
Use existing storage/media pipeline. Add asset versions, status, checklist linkage and comments anchored to a version, image position or video timestamp where practical. New versions never erase the previous submission or its feedback. Validate file types/sizes, escape user content, and use private signed access; no new scraping or unrestricted remote URL fetcher.

Private-mode delivery goes to the buyer's review queue. Buyer approval can approve the supplier contract's milestone under that separate contract; it never approves/releases an unrelated end-client milestone. Disclosed co-delivery retains the existing end-client path. All transitions identify the authoritative contract and reviewer.

### Payment visibility, not a new payment system
Distinguish agreement, funding (if applicable), delivery, approval, payout initiation and receipt. Direct payments are recorded confirmations, never called protected. Mock contracts remain mock. Real settlement remains exclusively in the existing guarded settlement and money-out code. Invoices, payment receipts and tax invoices are not interchangeable labels.

## 6. R3 — repeat work and useful intelligence

### Scope-to-team planner
From an agency-approved, redacted brief, suggest work packages and identify roles covered in-house, by confirmed partners, by proposed candidates or still unfilled. A candidate recommendation never becomes confirmed team membership.

Use deterministic rules and existing taxonomy first. An optional model may help structure a draft and explain results, but can only recommend IDs returned by authorized tools. It cannot send invitations, sign, book, commit spend or alter payments. Never feed personal contact data, client secrets, private roster notes or another provider's rates to the model. Add request budgets, timeouts and fallback; a missing API key cannot break the workflow.

### Quote and delivery planning tools
Provide a buyer-only worksheet of quoted supplier costs and dates, with unknowns labelled. Show optional markup/margin only to staff with finance permission. Do not sum currencies without an explicit reviewed conversion basis. Estimates are not quotations or commitments. Add reusable production templates for shoots, reels, Arabic copy, ad creative and monthly content calendars.

Recurring work begins as repeatable templates and proposed work slots with explicit acceptance each cycle. No automatic charge, contract renewal or capacity reservation. One-click rehire creates a draft; it rechecks dates, rates and permissions before sending.

### Collaboration evidence and progress
Keep collaborator feedback distinct from client reviews, Google ratings and paid-completed-project verification. Only parties to the recorded engagement can submit it; one record per engagement/side with dispute/moderation handling. Permit consensual confidential proof of work without disclosing a client identity or assets. Do not manufacture a paid-project badge for a direct-payment confirmation or test contract. Model existing legacy reviews without relabelling them retroactively.

Provide a next-action dashboard (awaiting response, review due, next deliverable, payment status) and opt-in notification preferences. Use existing notification adapters and scheduling; deduplicate reminders, honor quiet hours and prevent sensitive previews. Calendar/download links must be private and revocable where they expose work details.

## 7. Visual quality and growth

Keep the current bottle-green/limestone identity and supported dark theme. Use consistent page headers, section/card spacing, wrapping names, readable Arabic diacritics and bounded media. At 390px, a provider can discover, respond, submit and review without a desktop workaround. Test 320/390/768/1440/1920 widths, Arabic/English, reduced motion, touch and keyboard, plus 200% zoom. Do not fix overflow by hiding the entire page.

Public approved profiles and permitted work can remain indexable. Private roster, work, asset and contract routes must be authenticated and noindex, excluded from sitemaps; noindex is not security. No indexable empty city/skill pages or false rating schema. Preserve existing landing/SEO routes and Behance credits/ownership controls.

## 8. Measured launch objectives — hypotheses, not promises

Pilot with consenting agencies/freelancers doing real, bounded work; do not contact users automatically. Proposed initial evaluation: 5 agencies and 10 freelancers, reporting actual participation and denominators. Compare task completion and median time/steps to R0; seek at least 25% fewer steps on the scripted repeat-hire flow, without relaxing permissions. These are acceptance goals for the pilot, not forecasted business results.

Track: eligible inquiry created → sent → reply → agreed contract → accepted work → delivered → approved → payment confirmation → repeat engagement. Separate users from events; exclude demos, retries, cancelled drafts and staff tests. Report 30-day repeat rate only for cohorts with a full follow-up window. Report payment delays by mode with denominator; do not treat initiated payout as receipt. Track support incidents, disputes, privacy failures and mobile task failures as guardrails.

## HOLD — do not implement/enable implicitly

New real-money rails or split-payout launch; changes to commission/Founder economics; subscription checkout/limits; public supplier-rate exposure; forced exclusivity; automatic matching commitments or renewals; mass outreach; public private-note lists; legal enforceability/tax/worker-classification guarantees; new paid vendors; native apps; large ERP rebuild; unrestricted calendar/inbox imports. Prepare extension boundaries only. Real-money/new legal arrangements require explicit owner approval, appropriate review and verified provider capabilities.
