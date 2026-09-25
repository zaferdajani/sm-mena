# 12 · AI Matchmaker, Requests and Quotes

The client-side "end game": a business owner describes a project in a chat, the platform recommends the best-suited agencies with a realistic budget, and agencies compete with quotes. The model is Freelancer.com / Upwork's "post a project, get bids", narrowed to marketing agencies and made conversational.

## 1. Flow

1. **Chat** (`/match`, or the ✨ button on the home feed). A guided chat asks one question at a time with tappable choices (section 1a); the client can also write or dictate in Arabic or English at any step.
2. **Recommendation.** The agent returns 1–5 agencies with a match score, reasons (service, portfolio, price, city, reviews, Google rating), a budget range in the visitor's currency and a project summary.
3. **Act.** Contact an agency directly (WhatsApp, profile), or **send the project** (`/request/new`, prefilled from the chat).
4. **Request.** The project is stored; the top 5 matches are invited and get a `recommended` event. Other agencies offering the same services see it in Studio → Opportunities. Requests stay open 14 days and take at most 10 quotes.
5. **Quotes.** Agencies send a price, pricing type (monthly / one-off), delivery time and message. The client sees them on a private link (`/r/<token>`) or under "My projects", shortlists, accepts one (the rest are declined and the request closes) or closes the request.
6. **Review.** After working together the client can leave a verified review (see `lib/data/reviews.ts`).

## 1a. Guided chat (wizard) and the country rule

The match page is a chat with choice chips (`components/match/chat.tsx`, `wizard-chips.tsx`). The step machine is pure and shared by the page and the server (`lib/match-wizard.ts`, unit tested in `tests/unit/match-wizard.test.ts`):

| Step | Choices | Select |
|---|---|---|
| 1. What are you looking for? | the six taxonomy groups (social media, paid ads, photo/video/creative, branding/design, web/SEO/growth, on-ground) | multi, then **Next** |
| 1b. Which exactly? | the services in the chosen groups, or **Any of these** (the group's flagship services; paid ads follow the chosen platforms) | multi |
| 2. What kind of business? | `INDUSTRIES` (incl. Other) | single |
| 3. Which platforms? | `PLATFORMS` + **Not sure** (skipped for branding/on-ground-only projects) | multi |
| 4. Monthly budget? | 5 ranges in the visitor's currency + **Not sure** | single |
| 5. Where? | **All of <country>**, its main cities (+ More cities), **Change country** (sets the `sw_country` cookie and refreshes) | single |
| 6. Results | recommendation cards + **Send my project to these agencies**, **Change budget**, **Change city**, **Start over** | |

- Steps already answered (by a tap or by typed text) are skipped; **Show matches now** skips the rest. Each pick is shown as the client's bubble. State lives in `sessionStorage` (`sawwiq-match-wizard`).
- **Free text at any step** goes to `POST /api/match` with the answers so far (`need`, validated by `lib/match-wizard-schema.ts`; `picked: true` when the message is a tapped choice). In rule-based mode the server merges what the text says (stated values replace earlier answers), replies "Got it: …" and the page asks the next open question. A full brief typed at the first question goes straight to matches, as the classic chat did.
- **Budget ranges** come from real prices of agencies based in the visitor's country (`groupPriceStats` in `lib/matching/prices.ts`: quartiles from `suggestBudget`, rounded, each range ≥25% wider than the last) when a group has at least 4 prices; otherwise per-currency defaults (`DEFAULT_BUDGET_EDGES`: JOD 300/600/1,200/2,500; SAR/AED/QAR 2k/5k/10k/20k; KWD 150/400/800/1,600; BHD/OMR 200/500/1,000/2,000; EGP 10k/25k/50k/100k).
- **Voice:** a mic button dictates into the text box with the browser's Web Speech API (`ar-SA`, `ar-JO`, … by country, `en-US` in English). Hidden where unsupported; no audio reaches our server.
- **With an AI provider**, only step 1 is guided; the tapped groups go to the model and it takes over the conversation. Each turn's last user message carries a page-context note (country, currency, answers so far) so the system prompt stays cacheable. If the provider fails, the rule-based matchmaker continues the guided chat.

**Country rule.** The visitor's country (`currentCountry()`: the `sw_country` cookie, else IP country, else Jordan) wins everywhere:
- The parser (`lib/ai/extract.ts`) knows every country's cities (`COUNTRIES`) but reads budgets only in the visitor's currency (e.g. ريال/SAR in Saudi Arabia). A city or country elsewhere is not followed silently: the reply asks "Amman is in Jordan, but you're browsing Saudi Arabia. Did you mean agencies in Jordan?" with **Yes, show agencies in Jordan** / **No, stay in Saudi Arabia** chips.
- `findMatches` uses the explicit `need.country`, else the request's country scope, else the city's country, and drops a city outside that country. Agencies abroad that serve the country (`serves_countries`) are included, labelled "Based in Jordan · serves Saudi Arabia", and shown without their prices (another currency).
- `marketPrices` and the budget ranges only use agencies based in the visitor's country, so every amount is in one currency. Money is written as `5,000 ر.س` in Arabic and `5,000 SAR` in English. Examples and the placeholder use the country's capital and currency.

## 2. Matching score (`lib/matching/score.ts`)

Pure functions, unit tested, used by both the AI agent and the rule-based fallback.

| Signal | Points |
|---|---|
| Offers the requested services (share of requested services covered) | 35 |
| Portfolio: posts tagged with those services, 3 each | 15 max |
| Budget fit vs. starting price (near: 7, unknown: 8) | 15 |
| City: same 10, other 4, client doesn't mind 6 | 10 |
| Reputation: verified reviews and Google rating, shrunk toward a 4.0 prior (Bayesian, weight 3) | 15 max |
| Platform match | 5 |
| Industry experience | 5 |
| Verified by the platform | 3 |
| **Paid priority** (Pro +6, Business +10) only if relevance ≥ 45 and monetization is on, labelled "Featured" | +10 max |

Agencies that don't offer any requested service are excluded. The budget range comes from real package prices and agency starting prices (`suggestBudget`: 25th–75th percentile, with the median).

## 3. The agent (`lib/ai/`)

- **Providers** (`lib/ai/providers/`), chosen by `AI_PROVIDER` in `lib/ai/agent.ts`:
  - `anthropic.ts`: Claude Messages API, `ANTHROPIC_MODEL` (default `claude-opus-5`; `claude-haiku-4-5` for lowest cost), effort `AI_EFFORT`, server-side fallback on models that support it, cached system prompt.
  - `openai.ts`: OpenAI Responses API, `OPENAI_MODEL` (default `gpt-4o-mini`), `store: false`, the same system prompt as `instructions` (automatic prefix caching with a fixed `prompt_cache_key`). Function calls are replayed without item ids, so no state is kept at OpenAI.
  - `mock.ts`: scripted offline stand-in that makes the same tool calls with JSON arguments. For development, demos and tests.
- **Order and fallback:** `auto` uses Claude, else OpenAI, whichever key exists; `anthropic`/`openai` put that one first and the other second. Any error (outage, rate or spend limit, refusal, empty answer) moves to the next provider, then to the rule-based matchmaker (`lib/ai/fallback.ts`). Logs record the provider and status, never the conversation.
- **Loop:** manual tool loop, at most 6 model calls per user turn.
- **Tools** (strict JSON schemas shared by both providers, executed against our database):
  - `search_agencies(services, city, platforms, industry, budget)` → scored agencies with reasons (in the visitor's country; the `*_jod` fields hold that country's currency)
  - `price_guide(service)` → market price range from real packages in the visitor's country
  - `recommend_agencies(handles, budget, summary)` → the structured result the UI renders; handles not returned by a search are dropped
- **Endpoint:** `POST /api/match` (`{ locale, messages, need?, picked? }`), zod-validated, 20 requests per 10 minutes per visitor. The response may carry `need` (the guided chat's answers after the turn) and `countrySwitch`. `GET /api/health` shows the active provider order and models.

### Test conversations and evaluation

`tests/fixtures/matchmaker-cases.ts` holds 30 mock conversations (Modern Standard Arabic, Jordanian dialect, English, code-switching, multi-turn, vague openers, off-topic, prompt injection). `lib/ai/eval.ts` scores each answer: recommended at all, right service, agencies that fit, client's city, budget within range, reply language, and never recommending an agency the search didn't return.

- `npm run ai:eval` runs the providers that have keys (or `mock` and `basic` without keys) on a throwaway in-memory copy of the demo data and prints pass rate by language, tokens per conversation and latency. Add `--price-in`/`--price-out` (USD per million tokens) for a cost estimate, `--case <id> --verbose` to read one answer.
- Unit tests run the OpenAI and Claude loops against scripted SDK fakes, and the mock provider over every case the keyword rules can handle, so CI needs no keys.
- Current offline baseline: rules and mock pass 28/30; the two misses (dialect "more customers from social", paraphrase "restaurant menus") are the cases a real model should win.

## 4. Safety and privacy

- Agency names and bios are marked as untrusted data in the prompt; the agent can only recommend ids its own searches returned.
- No phone numbers or emails are sent to either model provider. OpenAI requests use `store: false`; neither provider trains on API traffic by default (don't opt into OpenAI's data-sharing program for production). Contact details are collected by the request form with PDPL consent (version `2026-09`).
- Clients access requests with a single-use token or their visitor cookie; agencies only see requests they were invited to or that match their services, and the client's name and phone are hidden until the agency sends a quote.
- Every recommendation is recorded as a `recommended` event so agencies see how often they were suggested (Studio → Insights), which is the basis for pricing recommendation priority later.

## 5. What to improve next

- Stream the agent's reply for faster first tokens.
- Save chat transcripts (with consent) to evaluate recommendation quality; build an eval set before changing prompts or weights.
- Learn weights from outcomes (quote accepted, review score) once there are a few hundred requests.
- Email/WhatsApp notifications to invited agencies (the notify adapter is ready).
