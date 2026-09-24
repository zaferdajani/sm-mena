# 12 · AI Matchmaker, Requests and Quotes

The client-side "end game": a business owner describes a project in a chat, the platform recommends the best-suited agencies with a realistic budget, and agencies compete with quotes. The model is Freelancer.com / Upwork's "post a project, get bids", narrowed to marketing agencies and made conversational.

## 1. Flow

1. **Chat** (`/match`, or the ✨ button on the home feed). The client writes in Arabic or English.
2. **Recommendation.** The agent returns 1–5 agencies with a match score, reasons (service, portfolio, price, city, reviews, Google rating), a budget range in JOD and a project summary.
3. **Act.** Contact an agency directly (WhatsApp, profile), or **send the project** (`/request/new`, prefilled from the chat).
4. **Request.** The project is stored; the top 5 matches are invited and get a `recommended` event. Other agencies offering the same services see it in Studio → Opportunities. Requests stay open 14 days and take at most 10 quotes.
5. **Quotes.** Agencies send a price, pricing type (monthly / one-off), delivery time and message. The client sees them on a private link (`/r/<token>`) or under "My projects", shortlists, accepts one (the rest are declined and the request closes) or closes the request.
6. **Review.** After working together the client can leave a verified review (see `lib/data/reviews.ts`).

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
  - `search_agencies(services, city, platforms, industry, budget)` → scored agencies with reasons
  - `price_guide(service)` → market price range from real packages
  - `recommend_agencies(handles, budget, summary)` → the structured result the UI renders; handles not returned by a search are dropped
- **Endpoint:** `POST /api/match`, zod-validated, 20 requests per 10 minutes per visitor. `GET /api/health` shows the active provider order and models.

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
