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

- **Model:** `AI_MODEL` (default `claude-opus-5`), effort `AI_EFFORT` (default `medium`), via `@anthropic-ai/sdk`. A server-side fallback model is enabled so overloads don't fail the chat.
- **Loop:** manual tool loop, at most 6 steps per user turn. The system prompt is static (no dates or ids) so it is cached.
- **Tools** (strict JSON schemas, executed against our database):
  - `search_agencies(services, city, platforms, industry, budget)` → scored agencies with reasons
  - `price_guide(service)` → market price range from real packages
  - `recommend_agencies(agency_ids, budget, summary)` → the structured result the UI renders; ids not returned by a search are dropped
- **Fallback:** without `ANTHROPIC_API_KEY`, on API errors or refusals, `lib/ai/fallback.ts` extracts the need with Arabic/English keyword rules and returns the same response shape.
- **Endpoint:** `POST /api/match`, zod-validated, 20 requests per 10 minutes per visitor.

## 4. Safety and privacy

- Agency names and bios are marked as untrusted data in the prompt; the agent can only recommend ids its own searches returned.
- No phone numbers or emails are sent to the model. Contact details are collected by the request form with PDPL consent (version `2026-09`).
- Clients access requests with a single-use token or their visitor cookie; agencies only see requests they were invited to or that match their services, and the client's name and phone are hidden until the agency sends a quote.
- Every recommendation is recorded as a `recommended` event so agencies see how often they were suggested (Studio → Insights), which is the basis for pricing recommendation priority later.

## 5. What to improve next

- Stream the agent's reply for faster first tokens.
- Save chat transcripts (with consent) to evaluate recommendation quality; build an eval set before changing prompts or weights.
- Learn weights from outcomes (quote accepted, review score) once there are a few hundred requests.
- Email/WhatsApp notifications to invited agencies (the notify adapter is ready).
