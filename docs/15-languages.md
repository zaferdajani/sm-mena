# 15 · Languages: Detection, Offer and Translation Pipeline

Ported from OneClickConvert and adapted to an Arabic-first site.

## Rule: offer, never force

The site never switches language on its own. `/` opens Arabic, or the language the visitor chose before; `/ar/…` and `/en/…` are always honoured as written.

1. **URL** decides what's on screen.
2. **Saved choice** (`sw_lang` cookie, set by the header toggle or by accepting the offer): `/` redirects to it (`proxy.ts`). Bots have no cookie, so they always get Arabic at `/`.
3. **Offer** (`components/language-offer.tsx`): one line at the top, written in the offered language ("سوّق متاح بالعربية — اعرضه بالعربية"), asked at most once (`sw_lang_offer` cookie).

## Location concept (`lib/i18n/country.ts`, `lib/i18n/suggest.ts`)

The country comes from the device's own time zone (`Asia/Amman` → JO), never from the IP address: nothing is stored or sent to a lookup service. Suggestion order:

1. Device set to Arabic → Arabic.
2. Clock in an Arabic-speaking country → Arabic (an English-configured phone in Amman is offered Arabic).
3. Device set to another language we serve → that language.
4. Known country outside the Arab world, unknown device language → English.
5. Nothing known → no offer.

The same table turns time zones into countries in Admin → Statistics.

## Right-to-left

`i18n/languages.ts` is the registry: code, native name, `rtl`, `enabled`. `directionOf()` reads it, so a new RTL language (Urdu, Persian) gets `dir="rtl"` without code changes. Layout uses logical properties (`ps-`, `me-`, `start`) and `rtl:` variants for mirrored icons; user text uses `dir="auto"`; phone numbers, emails and handles are isolated with `dir="ltr"`.

`components/dom-guard.tsx` keeps React from crashing when a visitor uses the browser's "Translate this page" (Chrome wraps text in `<font>` elements React doesn't know about).

## Translation pipeline (`npm run i18n:translate`)

OneClickConvert writes every language by hand; this adds a drafting step:

```bash
npm run i18n:translate -- --to fr --dry-run      # what would be translated
npm run i18n:translate -- --to fr                # Claude or OpenAI, whichever key is set
npm run i18n:translate -- --to ur --provider pseudo   # offline pseudo-translation to test RTL layouts
```

- Source is English, with the Arabic original alongside for meaning and tone. Model: `I18N_MODEL`, else the matchmaker's model.
- Only missing or changed strings are sent: `messages/.translation-state.json` stores a hash of the English each string was made from.
- Every result is validated (`lib/i18n/pipeline.ts`): ICU argument names and plural/select structure must match, braces must balance, brand and platform names (Sawwiq, WhatsApp, Instagram, …, JOD) must survive, and long sentences must actually change. Failures are retried once in small batches, then kept in English and listed.
- Switching a language on: review `messages/<code>.json` with a fluent speaker, set `enabled: true` in `i18n/languages.ts`, add the code to `locales` in `i18n/routing.ts` and to the `(ar|en)` handle matcher in `proxy.ts`, and add its three `LangOffer` strings.

## Agency content in two languages

Agencies write their page in a main language (`agencies.content_lang`, `ar` or `en`) and may add the same text in the other one. The second language is optional and field by field.

- Storage: a `translation` jsonb on `agencies` (name, bio, about, strengths), `posts` (caption, result), `portfolio_clients` (name, description) and `packages` (title, description, deliverables). The existing columns stay the main text. Migration `0010_agency_translations`.
- Forms: Studio profile, post, client and package forms have an "Add it in English / بالعربية" section; its fields are named `tr_*` and validated by the schemas in `lib/content-lang.ts`. Switching the profile's main language swaps the main and `tr_` texts so each stays labelled with its real language.
- Display: `localized`, `localizedAgency`, `localizedPost` and `agencyName` show the reader's locale when that field is filled, else the main text. Search text includes both languages.
- Legal and transactional names (contracts, NDAs, chat, reviews) keep the main text.
- Tests: `tests/unit/content-lang.test.ts`, `tests/e2e/bilingual.spec.ts`.

## Checks

- `tests/unit/messages.test.ts`: every locale has the same keys.
- `tests/unit/i18n.test.ts`: Arabic and English use the same placeholders in every string (ICU-aware), registry and routing agree, the offer rules, and the pipeline's validation, retry and fallback. It also pseudo-translates the whole interface and requires zero failures.
- `tests/e2e/language.spec.ts`: an English phone in Amman is offered Arabic; a visitor in London is offered English once; a saved choice opens at `/`; hreflang alternates and `x-default` are present.
