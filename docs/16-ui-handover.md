# 16 · UI Handover: Functions and Vibe

The brief handed to the Higgsfield website builder for Sawwiq's public landing site, and the reference for restyling the app to match.

## The product in one line

**Sawwiq (سوّق)**: Jordan's showcase for social media and marketing agencies. Businesses see real work, ask an AI matchmaker, get quotes, sign a contract and pay safely by milestone. Agencies get a free portfolio page, leads and protected payments.

## Audiences

- **Business owners in Jordan** (restaurants, clinics, shops, online stores, real estate, schools): want results without risk, mostly on phones, read Arabic first.
- **Agencies and freelancers** (Amman, Irbid, Zarqa, Aqaba…): want to be found, to look professional and to get paid on time.

## Vibe

- Instagram-familiar (a feed of real work) but *trustworthy like a bank*: calm, confident, warm, local.
- Arabic-first and right to left, with English as a full second language. Jordanian warmth without clichés: no camels, desert or Petra postcard imagery.
- Proof over promises: real posts, verified reviews, Google ratings, milestones, protected payments.
- Mobile-first, thumb-friendly, one clear action per screen.
- Current brand: green `oklch(0.5 0.11 157)` (≈ #187549) on white; IBM Plex Sans Arabic. The restyle may evolve this.

## Everything the platform does (public side)

| Area | Functions |
|---|---|
| Home feed | Real campaign posts from agencies, an agencies strip, likes, saves, follows |
| Explore | Filter by service, city, platform, industry and budget; Arabic-aware search |
| Agency profiles | Work grid (pinned posts), reviews (Airbnb-style, verified), Google rating, packages with prices and contents, WhatsApp / call / message |
| AI matchmaker | Chat about your project in Arabic or English → ranked agencies with reasons and a realistic budget range → send the project for quotes |
| Hire pages | Per service and city ("Instagram ads in Amman"), price guide, FAQs |
| Project requests | The top matches are invited; compare quotes; accept one |
| Contracts | Agency sends a contract (milestones, dates, amounts, checklists, special requests, optional NDA); the client signs by private link |
| Protected payments | Client pays each milestone into Sawwiq; released only when the client confirms every checklist item; disputes handled by the team. Or direct payment without guarantees |
| Languages | Arabic and English; the likely language is offered, never forced |

## Agency side (Studio)

Insights, posts, inbox, opportunities (matched requests and quotes), reviews (invite past clients), packages (content: posts, reels, stories; accounts handled per platform; ads; websites and maintenance; branding; on-site shoots and events; reports), contracts, plan and billing, two-factor security.

## Services catalogue

Social media management, content, community, strategy, influencers · Meta, TikTok, Snapchat, Google and LinkedIn ads · video, photography, graphic design, motion graphics, copywriting · brand identity, strategy, packaging · SEO, email and WhatsApp marketing, websites and online stores, website maintenance, analytics · on-site event coverage, print, outdoor ads, activations.

## Landing site: sections to cover

1. Hero: "Find the right marketing agency in Jordan", with the AI matchmaker as the primary call to action and "Browse agencies" as the secondary one.
2. How it works for businesses: see real work → ask the AI or browse → get quotes → sign and pay by milestone.
3. Protected payments explained simply: the money waits until you confirm the work (with a visual of a milestone checklist).
4. What you can hire: the services catalogue as a visual index, plus on-site services.
5. Trust: verified reviews, Google ratings, contracts with NDA, a human team for disputes.
6. For agencies: free showcase, packages, leads, contracts, get paid safely, then "Create your free page".
7. Cities (Amman, Irbid, Zarqa, Aqaba, Salt, Madaba…) and a final call to action.

Calls to action link to the platform: `/ar/match`, `/ar/explore`, `/ar/join` on the live app domain.

## Result: landing site and the matching app restyle

- **Landing site:** https://sawwiq-jordan.higgsfield.app (Arabic at `/`, English at `/en`), built with the Higgsfield website builder. Concept "the deal desk": a single overhead scroll film across a limestone desk, from real work to feed to quotes to contract to lockbox, followed by an interactive milestone ledger, services index, trust grid, agencies band and cities. Calls to action link to `/ar/match`, `/ar/explore` and `/ar/join` on the app. The site is deployed but not listed on the Higgsfield feed; Higgsfield only serves unlisted sites to signed-in owners, so publishing it (or moving it elsewhere) is what makes it public.
- **Tokens now in the app (`app/globals.css`):** limestone background `#F2F2ED`, raised surface `#FBFBF8`, sunk `#E8E9E2`, hairline `#D5D8CF`, text `#10231A` / `#4C5C53`, brand `#0E6B46`, deep green `#0A4531`, mint `#DCEDE2`, warning `#9A6200`, danger `#B3261E`; card and lift shadows; easing `cubic-bezier(.2,.7,.2,1)`. Dark mode keeps the green family.
- **Type:** Readex Pro for headings (Arabic and Latin), IBM Plex Sans Arabic for body, IBM Plex Mono for amounts.
- **Logo:** the green tile with the white "سوّق" mark (`public/brand/`, app icons and manifest).
- **AI matchmaker call to action:** the chat-bubble style (sharp bottom-start corner, green glow, typing dots on hover, reduced-motion safe).
- **Update (business variety and RTL):** the landing site now has a "Who we help" section with eight business types (restaurant, dental clinic, boutique, online store, real estate office, gym, school, Aqaba hotel), each linking to the matching service on the explore page. The cover shows a café owner, a dentist, a boutique owner and a real estate agent. Arabic pages are right to left at the root, with logical CSS, mirrored arrows, isolated Latin text and numbers, and a readable panel behind the hero text. Still unlisted.
