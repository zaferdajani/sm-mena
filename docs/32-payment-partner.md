# 32. Payment partner, test money and closing accounts

## 1. The plan for a licensed payment partner

**Rule:** Sawwiq never holds client money itself. Holding other people's money for them is a licensed activity. In Jordan the Central Bank of Jordan licenses it; the Gulf and Egypt have their own regulators.

A licensed partner does four things:
- takes each milestone payment into its safeguarded account;
- keeps it there until the milestone is accepted;
- pays the agency its share, keeping Sawwiq's fee back;
- refunds the client when a decision says so.

### Recommended path

1. **Start in Jordan with one partner that supports marketplace payouts.** Shortlist:

   | Partner | What it offers | Status |
   |---|---|---|
   | [PayTabs](https://ai.paytabs.com/en/jordan-payment-gateway/) | Operates in Jordan. Has [split payouts](https://docs.paytabs.com/manuals/PT-API-Endpoints/Deposit-and-Payouts/Split-Payouts/Split-Payouts-Landing/) for marketplaces. | Strongest first candidate |
   | [HyperPay](https://www.hyperpay.com/) | Operates in Jordan and the Gulf. | Second candidate |
   | A Jordanian bank's escrow service, paid out by CliQ | The bank holds the money. | Fallback if neither gateway offers delayed payouts to agencies. More manual, but clearly legal. |

   [Tap Payments](https://developers.tap.company/docs/marketplace-split-payments) has good marketplace tools for the Gulf. Reports say it no longer onboards new merchants from Jordan or Egypt, and pays out only to Gulf-registered businesses. So Tap is the candidate for a later Saudi/UAE phase, not the first partner.

2. **Ask each shortlisted partner these questions in writing:**
   - Can you hold a buyer's payment and pay it to a seller (the agency) only when we instruct, up to 60 days later? Is there a longer maximum?
   - Can one payment be split three ways: part to the agency, the fee to Sawwiq, part refunded to the buyer?
   - Can one milestone payout also go to a second payee: an agency's partner (freelancer) who delivered part of it (docs/40)?
   - Who onboards and checks the agencies' identity (KYC)? Do you host the onboarding form?
   - How do you notify us of payouts, refunds and chargebacks (signed webhooks)? Do you accept our idempotency key?
   - Which currencies and countries can pay in, and which can receive payouts (JOD first; SAR and AED later)?
   - What does it cost: pay-in percentage, payout fee, refund fee, chargeback fee?
   - Which licence do you hold, and whose name appears on the client's card statement?
3. **Legal review before any real money.** A Jordanian lawyer reviews:
   - the 2026-10 terms (`lib/legal/clauses.ts`, `lib/legal/payment-holder.ts`);
   - the partner's contract;
   - the privacy notice.
4. **Connect in the partner's test environment.** Put the keys in GitHub secrets, never in chat. Claude then:
   - writes `lib/payments/<partner>.ts` implementing `PaymentProvider` (`createCheckout`, `payout`, `refund`, `parseWebhook`);
   - registers it with `registerProvider`;
   - runs the whole milestone flow against the partner's test mode.
5. **Pilot.**
   - Set `PAYMENTS_PROVIDER=<partner>` and `PROTECTED_PAYMENTS_LIVE=true` (Actions → Vercel → setup).
   - Start with a small per-milestone limit and a few invited agencies. Watch Admin → Payments daily.

Until step 5, everything runs on the built-in test checkout, and every screen says so.

### What's already built

- **Provider interface** (`lib/payments/provider.ts`): checkout, `payout`, `refund` and signed webhooks. Events: `payment.*`, `payout.*`, `refund.*`, `chargeback.opened`.
- **Decisions first, money second.** `settleMilestone` records each release, fee and refund in the ledger; the step is guarded and runs once. With a real partner these entries start as `pending`.
  - `lib/data/money-out.ts` then asks the partner that took the deposit to move the money, passing the ledger key as the idempotency key.
  - Each entry becomes `succeeded` when the partner confirms, either at once or by webhook.
- **Retries.** The daily job retries failed payouts and refunds with the same key, so the partner can't pay twice.
  - After 5 tries, the entry appears under Admin → Payments → Protected → "Payouts and refunds needing attention".
  - Anything still pending after 3 days appears there too.
- **Late deposits.** A payment that arrives after its contract or milestone was cancelled is recorded and refunded in full straight away. A repeated notification changes nothing.
- **Chargebacks.** Recorded in the audit log (`escrow.chargeback_opened`). Terms v4 decide what happens next: the client stays liable, and the agency gets notice and 14 days to contest.
- **Automatic release.** After the signed review period, a milestone is released automatically (deemed acceptance), logged as `escrow.auto_release`. `CLAUDE.md` states the rule.

## 2. Test money is kept, labelled and never counted

- Every ledger entry has a `test` column, computed by the database: true when the built-in test checkout recorded it. It can't be edited.
- The ledger is append-only: entries are never deleted, and money fields never change.
- Admin → Payments → Protected lists how many test entries exist and exports them all as CSV ("Download test transactions"), including those of deactivated and demo agencies. Each export is audited.
- The escrow totals on that page count real money only.

## 3. Closing an account (any agency, any time)

- **Where:** Studio → Security → "Close your account". It asks for the handle and the password.
- **What happens:**
  - The page, posts and packages disappear.
  - The owner is signed out everywhere and can't sign in again.
  - Contracts and every ledger entry stay.
  - The audit log records `agency.deactivated.self`, with a summary of the test money involved.
- **When it's refused:** while a real contract is running or real money is held for the agency. Test contracts never block it.
- **Reactivation:** an admin can reactivate a closed account (Admin → Agencies → "Reactivate"). Demo agencies can't be reactivated.

## 4. Removing all demo data

Admin → Agencies → "Remove all demo data":
- **Deletes** demo agencies that never took part in a contract, as before (posts, users and images).
- **Deactivates** demo agencies that took part in any contract, and logs `agency.deactivated.demo_cleanup`. Their contracts and test transactions stay on record, labelled as test.
- **Stays done.** The seed never brings demo data back. Running the removal again changes nothing.
