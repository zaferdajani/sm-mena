# 22 · Universal contract, NDA and electronic signatures

Every contract and NDA on Sawwiq uses one set of general conditions, written once in Arabic and English, plus an annex for the law of the country where the agency is based. Both parties sign electronically with a typed full name and a drawn signature. Each party can download the same document as a PDF, with a signature record page at the end.

Not legal advice. Before launch in each country, a lawyer licensed there must review that country's annex (`lib/legal/jurisdictions.ts`) and the general conditions (`lib/legal/clauses.ts`). **The 2026-10 conditions (deemed acceptance, revision rounds, split decisions and appeal, mutual cancellation, chargebacks, IP per milestone, limits of protection) must be reviewed by a lawyer before any real money moves through the platform.**

Current version: `LEGAL_VERSION = "2026-10"` (contracts on terms v4). Contracts signed under `2026-09` keep rendering with the 2026-09 wording (`serviceClausesFor(version)`); NDAs use the same NDA, closing and law clauses in both versions.

## What is in every document

| Part | Where | Notes |
|---|---|---|
| Parties | contract / NDA row | The legal name and commercial registration number of each party, both optional but asked for in the form, plus phone and email. Identified parties are what civil codes across the region require for an enforceable contract. |
| Scope, milestones, checklist, amounts | contract | Unchanged from v2. Price and scope are fixed, so nothing is left uncertain. |
| Protected payments and who holds the money | contract | Depends on the state the contract was sent in (`paymentsLive`, signed; `lib/legal/payment-holder.ts`). **Test mode** (until a licensed partner is connected): the pay-in, release and refund steps are a simulation, Sawwiq holds and guarantees nothing, the parties settle payments directly, no fee. **Live**: the client pays each milestone to **Sawwiq's licensed payment partner**, which holds it until the milestone is accepted or a final dispute decision; the fee (`PLATFORM_FEE_PERCENT`, 10% by default) applies only to the part released to the agency. Sawwiq never holds money in its own accounts. |
| Review period and revision rounds | contract (v4) | Section 4 states the review period (`reviewDays`, default 7 days) and the revision rounds per milestone (`revisionRounds`, default 2). |
| Client's special requests | contract | Special requests marked ★ become checklist items on a milestone, plus any free-text conditions the client adds (`clientTerms`). |
| Agency's special conditions | contract / NDA | `agencyTerms`. They take precedence over the general conditions, but can never reduce the client's ownership of its accounts, the no-extra-charges rule, data protection, or rights that mandatory law gives. |
| General conditions | `SERVICE_CLAUSES` (2026-10) | Relationship and the platform's role, with the holder of funds per the payment state; delivery, review period, reminders and **deemed acceptance** when the period ends with no answer (hidden defects excepted); **revision rounds** (extra free round or a paid change request); fees and taxes (fee only on the released part, no late-payment interest or penalty); ownership of accounts and files; **IP per milestone**: economic rights pass when that milestone is paid to the agency in full, unless a special condition says otherwise; on a split or mutual cancellation, to the extent paid as the decision states; moral rights stay with the author; personal data (72-hour breach notice); advertising rules; changes only by client-approved change requests; **milestone disputes**: statement and evidence from both sides, release / refund / split (partial delivery) with written reasons, **one appeal within 7 days**, money moves only on a final decision, courts remain open; **cancellation**: before signing, while nothing is held, or by mutual agreement with a per-milestone split (decline → dispute); termination with a 14-day cure period and a 7-day handover; **chargebacks**: the client may not reverse payments for accepted or decided milestones; handled under the payment partner's rules; Sawwiq may recover an upheld chargeback only from the agency's future payouts on the platform, after notice and 14 days to contest, no interest or penalty, nothing else; **limits of protection**: covers delivery of the agreed checklist only, no business results, ad platforms, ad budget or off-platform money, nothing in test mode; liability cap; force majeure; precedence. |
| Confidentiality | `NDA_CLAUSES` | The full NDA in a standalone agreement. Inside a contract it is a mutual confidentiality clause lasting 1, 2, 3 or 5 years. |
| Closing | `COMMON_CLAUSES` | Capacity and authority (each signer confirms legal age and the right to sign); the electronic signature clause, citing the country's e-transactions law; notices; record keeping (at least 10 years). |
| Law, courts, language | `LAW_CLAUSE` + annex | Governed by the law of the agency's country, with the courts of the agency's city. Disputes are first settled amicably within 14 days, then Sawwiq mediates, and Sawwiq decides on held money. The client keeps any protection its own country's law makes mandatory. **The Arabic text prevails.** |

### Country annex (`lib/legal/jurisdictions.ts`)

| Country | E-signature law | Personal data | VAT / sales tax |
|---|---|---|---|
| Jordan | Electronic Transactions Law 15/2015 | PDPL 24/2023 | 16% |
| Saudi Arabia | Electronic Transactions Law, RD M/18 (1428H) | PDPL, RD M/19 (1443H), SDAIA | 15% |
| UAE | Federal Decree-Law 46/2021 | Federal Decree-Law 45/2021 | 5% |
| Kuwait | Law 20/2014 | CITRA Data Privacy Protection Regulation | none |
| Qatar | Decree-Law 16/2010 | Law 13/2016 | none |
| Bahrain | Legislative Decree 54/2018 | Law 30/2018 | 10% |
| Oman | RD 69/2008 | RD 6/2022 | 5% |
| Egypt | Law 15/2004 | Law 151/2020 | 14% |

Country-specific notes are also in the annex:
- **Saudi Arabia:** the Civil Transactions Law applies where the contract is silent, invoices must be ZATCA e-invoices, and advertising follows GAMR rules.
- **UAE:** federal and emirate law apply. For agencies licensed in a financial free zone, the parties still choose the courts of the emirate.
- **Egypt:** a platform e-signature is written evidence. For the full weight of a certified signature, the parties may also sign the PDF with an ITIDA-licensed certificate or by hand.

## Signatures

- **What a signature is.** Typed full name, a drawn signature (PNG, at most 200 KB, checked by `lib/pdf/signature-image.ts`), and an explicit declaration covering legal age, authority to sign and consent to sign electronically. Each is bound to the **sha256 fingerprint of the canonical terms**. The fingerprint also covers the legal version, jurisdiction and city, both parties' identity and both sides' special conditions.
  - The signing time and an IP hash (`sha256("sawwiq-sign:" + ip)`) are stored alongside.
  - Old v1/v2 contracts keep their fingerprints and their original wording.
- **What it is not.** This is an *electronic signature with an audit trail*, not a PKI/qualified signature. All eight laws accept it as evidence. Where a qualified signature is wanted (for example Egypt), the parties can sign the PDF with a certificate as well.
- **Frozen.** The database trigger `sawwiq_freeze_signatures` (migration 0007) refuses any change to the terms fingerprint, the agency's signature, or the client's signature once it is set, on both `contracts` and `ndas`.
- **Changes before signing.** A sent document cannot change. The client uses "Ask for a change" (the `amend_requested` event, or `clientNote` on an NDA). The agency cancels and sends a revised document.

## Code

- `lib/legal/clauses.ts`: clause texts, versioned as `LEGAL_VERSION`. To change wording, add a new version and keep the old one, so signed documents always render with the words that were signed. These are legal texts, so they live in code, not in `messages/*.json`.
- `lib/legal/jurisdictions.ts`: the country annex.
- `lib/legal/document.ts`: builds one `LegalDocument` for both the page and the PDF (`contractDocument`, `ndaDocument`).
- `lib/legal/payment-holder.ts`: who holds the money, in test and live wording, shared by screens, contract text, receipts and landing copy (`protectedPaymentsCopy` in `lib/payments/readiness.ts`).
- `lib/legal/receipt.ts`: receipts as a `LegalDocument` (no signature page, test-mode watermark), rendered by the same PDF renderer; `GET /api/receipts/{token|id}/{ledger entry}?lang=ar|en`.
- `lib/pdf/*`: the jsPDF renderer, ported from TeamManager (Arabic shaping, bidi runs, signature record page). Output is deterministic.
- `components/contracts/signature-pad.tsx`: the drawn-signature pad (TeamManager's SignatureCanvas).
- `lib/data/ndas.ts` and the `ndas` table; routes `/studio/ndas`, `/studio/ndas/new`, `/studio/ndas/[id]`, `/n/[token]`.
- `GET /api/legal/{contract|nda}/{token|id}?lang=ar|en`: the PDF.
  - Access: the client's token, the owning agency, or staff with `escrow.resolve` (staff access is audited).
  - Responses are `no-store` and `noindex`.
