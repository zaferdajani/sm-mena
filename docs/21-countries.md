# 21 — Countries: Jordan, the Gulf and Egypt

Sawwiq starts in Jordan and serves eight countries: Jordan, Saudi Arabia, the UAE, Kuwait, Qatar, Bahrain, Oman and Egypt. One registry holds everything country-specific: `lib/countries.ts` (names, flag, currency, phone code, time zone, a rough map box, and the cities agencies can be based in). City keys are unique across countries, so a city alone tells the country.

## For visitors

- **Country picker** in the app header (phones), the sidebar (desktop), and the landing page header (flag and name; flag only on narrow phones and laptop widths).
- **Which country (server, `lib/country-choice.ts` `currentCountry()`):** the saved choice (`sw_country` cookie) → the country of the visitor's IP address (`x-vercel-ip-country`, set by Vercel; `detectedCountry()`, only our eight countries count) → Jordan. So the very first page, including the landing page, already shows the visitor's country.
- **First visit (browser, `components/country-picker.tsx`):** the device's time zone refines the server's guess when it names one of our countries (otherwise the server's guess stands — it never falls back to Jordan), then the browser asks for the location once (GPS, with permission) and switches if it points to another country. The result is saved in the `sw_country` cookie. A manual choice in any picker is saved the same way and wins over everything; the target button re-detects from the location.
- **Landing page:** titles, the footer tagline, the medical-advertising note, the payments demo (project city, currency and a budget of roughly the same size), the example review, the agencies blurb and the cities section follow the country (`landingCopy(lang, country)` in `components/landing/copy.ts`). Jordan's copy is unchanged. The page's SEO title and description stay on Jordan (crawlers have no country).
- Feed, stories strip, suggested agencies, Explore (posts and agencies), sponsored slots, the AI matchmaker and project requests all stay in the chosen country. Explore's city filter lists that country's cities; budgets and prices show in its currency.
- A link with a city (for example from the landing page, `?city=riyadh`) opens that city's country.

## For agencies

- Join and profile forms: pick the country, then a city in it. The agency's country comes from its city.
- Prices, packages and contracts are in the agency's country currency (contracts record it: `contracts.currency`). Amounts are stored in thousandths of that currency.

## Hire pages (search)

| URL | Page |
|---|---|
| `/ar/hire/seo` | The service across all eight countries, with a link per country (no prices: several currencies) |
| `/ar/hire/seo/sa` | The service in Saudi Arabia: agencies, prices in SAR, packages |
| `/ar/hire/seo/riyadh` | The service in Riyadh |

Country pages are indexed once a real agency offers the service there; city pages once two do (docs/18-seo.md). The sitemap lists them by the same rule.

## Adding a country

Add it to `COUNTRIES` in `lib/countries.ts` (code, names, flag, currency, dial code, time zone, box, cities), add its city and country names to `messages/*.json` (`Cities`, `Countries`), and legal review of the contract terms for that country (docs/22, when written). Nothing else needs to change.

## Not yet

- Payments: protected payments still run through the test provider in JOD terms; a real gateway per country (and currency) is needed before launch outside Jordan.
- Phone numbers: WhatsApp links assume numbers are entered with the country code outside Jordan.
