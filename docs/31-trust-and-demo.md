# 31. Trust: demo isolation, prices, payment wording, labels

These changes follow the strategic audit (September 2026). Each rule has one place in the code.

## Demo data never counts as real

The seeded pilot agencies have `agencies.is_demo = true`.

**Real only, always.** None of these ever include demo agencies:
- hire pages: cards, counts per city and country, the price guide and package facts (`lib/data/hire.ts`);
- the hire index counts, the sitemap and `llms.txt` (`serviceCounts({ realOnly: true })`);
- the matchmaker's budget numbers (`marketPrices`, `groupPriceStats`);
- structured data: demo profiles emit no JSON-LD, and hire `ItemList` and offers list real agencies only;
- search indexing: demo profiles and posts are `noindex`, and a hire page with no real agency is `noindex` (`INDEX_MIN_*` in `lib/seo.ts`);
- the admin "new agencies" statistic.

**Real by default.** These show demo agencies only in the demo view:
- the feed and explore (posts and agencies), and "load more";
- the agency strip and promotions;
- hire cards;
- AI and rule-based recommendations (`findMatches`, through `realUnless(includeDemo)` in `lib/data/agency-filters.ts`);
- quote requests.

**The demo view** is a labelled mode, not a filter:
- **Turning it on and off.** Visitors turn it on with "Explore the demo" on any honest empty state ("No real agencies here yet"). That sets the `sw_demo` cookie (one day) via `setDemoModeAction`.
- **Banner.** While the view is on, every page shows a banner saying demo agencies are samples, with a "Leave the demo" button (`components/demo/demo-banner.tsx`). Hire cards carry a "Demo" badge.
- **Requests.** A quote request sent from the demo view is stored with `source = "demo"`. It reaches demo agencies only, and the form says so.
- **Notices.** A demo agency's profile and posts always carry a "Sample agency" notice, whether or not the view is on.

**e2e tests** run in the demo view (the cookie is set in `playwright.config.ts`), because the seeded agencies are demo ones. `tests/e2e/demo-isolation.spec.ts` checks what a real visitor sees.

## One price calculation

`lib/price-stats.ts` is the only summary of prices. It gives a standard median and interpolated quartiles, and keeps the sample size `n`.

- **Too few prices.** Below `MIN_PRICE_SAMPLE` (3) prices, no range is shown. The page says there are too few prices yet.
- **Label.** Hire pages label the range: "Starting prices from N eligible agencies, updated [month]. Agency service fees only; advertising spend excluded."
- **Matchmaker.** Its budget suggestion (`suggestBudget`) is the middle half (p25–p75) of the same numbers.

## Payment protection: no promise until it's real

`protectedPaymentsLive()` in `lib/payments/readiness.ts` is the only switch. It is true only when a real payment provider is configured **and** `PROTECTED_PAYMENTS_LIVE=true`.

- **While it's off**, the landing page, About, terms (Pricing section), hire FAQ and `llms.txt` say protected payments are coming, run in test mode with no real money, and carry no fee.
- **Once it's on**, they say milestone payments go to Sawwiq's licensed payment partner, never into Sawwiq's own accounts.
- **Contract wording.** Contracts and pay screens use the same statement (`lib/legal/payment-holder.ts`).

Turn the switch on only after the payment partner is signed and the legal review is done.

## Three verification labels

| Label | Meaning | Where |
|---|---|---|
| Business identity verified | Sawwiq checked the commercial registration (`is_verified`) | badge next to the agency name (hover for the text) |
| Contact confirmed | reviewer invited by the agency with a single-use link (`invite`) or contacted it through Sawwiq (`inquiry`) | review list |
| Completed-project review | review from a client whose contract on Sawwiq was completed (`contract`) | review list |

About → "What our three labels mean" explains them.

## Buyer contact stays private

An agency sees a buyer's name and phone only after the buyer shortlists or accepts that agency's quote (`studio/opportunities/[id]`). Before that it sees "The client's contact details appear once they shortlist or accept your quote."

## Smaller fixes

- The join form's link preview and the privacy address use `sawwiq.org`. Set up forwarding for `privacy@sawwiq.org` at the DNS host.
- The footer's language link opens the same page in the other language.
