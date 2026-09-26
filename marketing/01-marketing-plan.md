# Sawwiq (سوّق): business and marketing plan, launch 2026

Owner: Sawwiq founder · Prepared: 25 Sep 2026 · Status: **draft for owner approval**
Sources: `docs/01`, `02`, `03`, `07`, `10`, `14`, `18`, `20`, `21`, `28`, `components/landing/`, `messages/*.json`. Where this plan differs from `docs/07`, this plan is newer. Numbers marked *(est.)* are planning estimates, not measurements.

---

## 0. The plan on one page

| | |
|---|---|
| **What we sell** | The first Arabic marketplace to find, compare and hire marketing and social media agencies. Real work, prices, verified reviews, an AI matcher, and contracts paid per milestone. |
| **Positioning line** | «أول منصة عربية لوكالات التسويق», "The first Arabic marketplace for marketing agencies". This is a positioning claim and needs legal sign-off (§11). |
| **Cold-start rule** | Supply first. Do not spend on business-side ads in a city until it has **30 verified agencies with real posts**: Amman first, then Riyadh. |
| **90 days** | W1–4 Amman agencies → W5–8 Amman businesses + Riyadh agencies → W9–13 Riyadh businesses + Jordan scale + organic Gulf/Egypt supply. |
| **Money** | Everything is free during launch (`MONETIZATION_ENABLED=false`). Paid media: Lean ≈ 2.2k JOD, Standard ≈ 5.6k JOD, Growth ≈ 12.4k JOD over 90 days (§6). |
| **North-star metric** | **Requests that receive ≥ 3 quotes within 72 h.** This proves liquidity on both sides. |
| **Hard claim limits** | Protected payments run on a **test checkout** until a licensed provider is connected. Every "protected payment" ad is held for sign-off (§11). "Verified" means registration was checked, not a guarantee of quality. |

---

## 1. Positioning and messaging

### 1.1 Core idea
Businesses in our markets hire marketing agencies through Instagram DMs, cousins' recommendations and PDFs of price lists. They cannot see the real work, they cannot compare prices, and they pay up front and hope. **Sawwiq replaces "hope" with evidence**: see the work, compare, sign clear terms, and pay step by step.

**Brand idea: «سوّق صح»**, "Market right". It is a verb that works both ways: businesses *market right*, and agencies *sell right*. The name itself means "market it".

### 1.2 Message pillars (both languages, used by every asset)

| # | Pillar | Arabic (MSA-light, all countries) | English | Proof in product |
|---|---|---|---|---|
| P1 | Find fast | اعرف الوكالات المناسبة لك بدقيقة | Find the right agencies in a minute | AI matcher at `/match`: 4 questions on need, platforms, budget and city. **Verify that it runs in about 60 s before paid use.** |
| P2 | See before you pay | شوف الشغل الحقيقي قبل ما تدفع | See real work before you pay | Portfolio feed, "Clients" tab, packages with prices |
| P3 | Pay per milestone | ادفع على مراحل، والمال ينتظر موافقتك | Pay per milestone. The money waits for your approval | Contracts with milestones and checklists. **Escrow is in test mode; hold until the provider is live.** |
| P4 | First Arabic platform | أول منصة عربية لوكالات التسويق | The first Arabic marketplace for marketing agencies | Arabic-first product, 8 countries. Positioning claim; sign-off needed. |
| P5 (agencies) | Free showcase + real requests | صفحة مجانية لشغلك، وطلبات عملاء حقيقية | A free showcase, and real client requests | Free during launch; requests and quotes are live |

Supporting proof points: verified reviews with "results vs targets", Google ratings shown as they are, WhatsApp contact, NDA and contract templates per country, and the client owns every account and file (handover within 7 days).

### 1.3 Messaging by audience

**Businesses (clinics, dentists, pharmacies, restaurants and cafés, shops, real estate, gyms and salons, schools, hotels)**
- Pain: «مين أختار؟ كم السعر المعقول؟ رح ينصبوا عليّ؟» ("Who do I pick? What's a fair price? Will they scam me?")
- Promise: «شوف شغلهم، قارن أسعارهم، وادفع على مراحل.» ("See their work, compare their prices, and pay in stages.")
- CTA: «اسأل المطابق الذكي» / "Ask the matchmaker" → `/match`; «تصفّح الوكالات» / "Browse agencies" → `/explore`

**Agencies and freelancers (2–40 people)**
- Pain: «العملاء بيجوا بالواسطة، وبيقارنوك بأرخص واحد.» ("Clients come through connections, and they compare you with the cheapest.")
- Promise: «صفحة مجانية تعرض شغلك الحقيقي، وطلبات من عملاء جادّين، وعقود تحميك من التأخير في الدفع.» ("A free page showing your real work, requests from serious clients, and contracts that protect you from late payment.")
- CTA: «أنشئ صفحتك مجاناً» / "Create your free page" → agency sign-up

### 1.4 Country messaging (Arabic and English lines per market)

| Country | Launch role | Business headline (AR) | Agency headline (AR) | English |
|---|---|---|---|---|
| 🇯🇴 Jordan (home) | Supply W1, demand W5 | «لاقي وكالة التسويق الصح بعمّان، وشوف شغلها قبل ما تدفع» | «وكالتك بعمّان تستاهل واجهة تليق فيها، ومجانية» | "Find the right marketing agency in Amman. See the work first." |
| 🇸🇦 Saudi Arabia | Supply W6, demand W9 | «دوّر على وكالة التسويق اللي تناسبك في الرياض، وشف شغلها قبل لا تدفع» | «وكالتك في الرياض؟ اعرض شغلك مجاناً واستقبل طلبات عملاء» | "Riyadh businesses: compare agencies by real work." |
| 🇦🇪 UAE | Organic supply only (90 d) | «قارن وكالات التسويق في دبي وأبوظبي بشغلها الحقيقي» | «اعرض شغل وكالتك لعملاء الخليج كله» | "Compare agencies in Dubai and Abu Dhabi by their real work." |
| 🇰🇼 🇶🇦 🇧🇭 🇴🇲 | Organic supply; one Gulf ad set in Growth only | «وكالات تسويق في الكويت/قطر/البحرين/عُمان، شغل حقيقي وأسعار واضحة» | same as UAE | "Real work, clear prices." |
| 🇪🇬 Egypt | Supply only. Egyptian agencies want Gulf clients. | (no demand ads yet) | «وصّل شغل وكالتك لعملاء الخليج والأردن، ببلاش» | "Show your agency to clients across the Gulf, free." |

Payments outside Jordan are not ready (`docs/21`). Country ads outside Jordan **must not mention protected payments** until a gateway is live there.

---

## 2. Personas (illustrative, not real people)

### Businesses
| Persona | Who | Wants | Fears | Hook |
|---|---|---|---|---|
| **Dr. Rana, dentist, Amman** | 35, owns a two-chair clinic, posts on Instagram herself at night | More bookings; a steady monthly content plan; rules-compliant health ads | Paying 600 JOD and getting stock photos; breaking Ministry of Health ad rules | «شوف شغل وكالات مع عيادات أسنان قبل ما تقرري» ("See agencies' work with dental clinics before you decide") |
| **Abu Zaid, café owner, Amman** | 38, one café, second branch soon | Reels that bring people in; fair price | Lock-in contracts, agency "owns" his page | «الحسابات والملفات ملكك دايماً» ("The accounts and files are always yours") |
| **Faisal, café and perfume shop owner, Riyadh** | 44, 3 branches, Snapchat-heavy customers | Snap and TikTok specialists; Saudi dialect creators | Agencies that disappear after the deposit | «ادفع على مراحل» ("Pay in stages", once the gateway is live) and «شف الشغل قبل لا تدفع» ("See the work before you pay") |
| **Maha, growth marketer, multi-brand group** (`docs/20`) | 31, manages 4 brands, B2B + B2C | One A-to-Z team, KPIs, reporting rhythm, NDA | Surprise charges, vague reports | «عقد فيه KPIs وتقارير ثابتة وبدون رسوم مفاجئة» ("A contract with KPIs, steady reports and no surprise charges") |
| **Hotel marketing manager, Aqaba / Dead Sea** | 40, seasonal campaigns, English + Arabic | Photo and video shoots, influencer trips | Quality risk, missed season | «شوف تصوير فنادق حقيقي» ("See real hotel shoots") |

### Agencies and freelancers
| Persona | Who | Wants | Objection | Hook |
|---|---|---|---|---|
| **Sameer, studio owner, Amman (6 people)** | Portfolio lives on Instagram and a PDF | Qualified leads, stop competing on price | "Another directory that sells my leads" | Free page, no lead fees at launch, real requests |
| **Leen, freelance designer, Irbid** | 26, Behance and Instagram | Clients outside her network | "Platforms take 20%" | Free during launch; showcase by client |
| **Noura, BD lead, Riyadh agency (25 people)** | Needs SME pipeline | Volume of good briefs, Saudi credibility | "Is it Jordanian only?" | 8 countries, Saudi pages, Arabic-first |
| **Ahmed, agency owner, Cairo** | Wants Gulf retainers | Cross-country visibility | Trust from Gulf clients | Cross-country visibility, verified badge |

---

## 3. Competitor landscape

| Type | Players | What they do well | Where Sawwiq wins |
|---|---|---|---|
| Arab RFQ marketplace | **Entasher** (Egypt/KSA; about 8 Jordanian agencies listed, `docs/02`) | Request-for-quote flow, SME brand | Visual portfolio feed, milestone contracts, Arabic-first matcher, Jordan and Levant focus |
| Arab freelance platforms | **Mostaql / Khamsat** (Hsoub), **Ureed**, **Kafiil** (KSA), **Nafezly** (Egypt) | Huge freelancer supply, escrow habit (10–20% commission) | Agencies and teams, not gigs. Monthly retainers, KPIs, portfolio by client |
| Classifieds | OpenSooq, Dubizzle services | Traffic | Quality signals, verified reviews, contracts |
| Directories | ME Junction | Listings | Real work and prices, not just a listing |
| Global B2B directories | **Clutch** (USD 499/yr verification, about 25 Jordanian agencies), **Sortlist** (€300/month + lead CPC), DesignRush, GoodFirms, The Manifest | SEO authority, B2B trust | Arabic, SME price points, mobile-first, WhatsApp-native, free for agencies at launch |
| Global freelance | Upwork, Fiverr | Scale, escrow | Local context, Arabic briefs, local contracts and laws |
| **Real competitor** | Instagram DMs, WhatsApp referrals, «واسطة» (personal connections) | Zero friction, trust in people | We must feel as easy as a DM (WhatsApp contact, no sign-up to browse) and **safer** |

**Implication for creative:** never attack named competitors in ads. Contrast with the *behaviour* instead: «بدل ما تسأل بالقروبات…» ("Instead of asking around in group chats…").

---

## 4. The 90-day launch plan (week by week)

Day 1 = the Monday after owner approval. Pre-launch (W-2 to W0) must finish first: see `04-launch-checklist.md`.

### Phase A: Amman supply (W1–W4). Target: 30 verified agencies with ≥ 6 real posts each
| Week | Actions | Owner | Exit metric |
|---|---|---|---|
| W-2–W0 | Reserve @sawwiq handles everywhere. Pixel and measurement decision (§7). Seed list of **150 Amman agencies** from Clutch, DesignRush, Entasher, Instagram hashtags and LinkedIn (`docs/07`). Legal sign-off on claims. Founding-agency pack (§8). | Founder + me | List ready, accounts live |
| W1 | **Founding 40** outreach: WhatsApp and LinkedIn DMs from the founder, 20/day, personal. Offer: founding badge, homepage feature, and free Pro when paid plans exist (see decisions). LinkedIn agency ads (lean: organic only). Post "why Sawwiq" founder video on LinkedIn. | Founder | 60 conversations, 15 sign-ups |
| W2 | Onboarding sprint: 30-min Zoom or in-person "we build your page with you" sessions (we upload their best 6–12 posts, group them by client). Agency carousel ads on IG/FB targeting admins of agency pages in Amman (Standard). | Me + intern | 25 pages live |
| W3 | Agency proof content: "Agency of the week" posts, behind-the-scenes Reels. University design and marketing departments (§8) → freelancer wave. | Me | 30 pages, 200 posts |
| W4 | **Gate review:** ≥ 30 verified agencies × ≥ 6 posts × ≥ 5 services covered × ≥ 3 health-sector portfolios? Yes → open demand. No → extend supply 1 week. Agencies add the «اطلب عرض عبر سوّق» ("Request a quote via Sawwiq") link in their bios. | Founder | Gate passed |

### Phase B: Amman demand + Riyadh supply (W5–W8)
| Week | Actions | Exit metric |
|---|---|---|
| W5 | **Business launch in Jordan.** Hero film + 15 s cut-downs on IG/FB/TikTok/Snap. Google Search on high-intent terms («شركة تسويق عمان», "social media agency Amman"). Jordan Chamber and JEDCO webinar «كيف تختار وكالة تسويق» ("How to choose a marketing agency"). PR: launch story in Arabic press (§9). | 150 match sessions, 40 requests |
| W6 | Vertical waves: clinics and dentists (health-rules-safe creative), restaurants and cafés. **Riyadh supply outreach starts:** 150-agency list; LinkedIn and Snap ads to agency owners in KSA. | 60 requests; 10 Riyadh agencies |
| W7 | Retargeting (site visitors via first-party audiences, §7). Referral program on for businesses («عرّف صاحب مصلحة» / "Refer a business owner"). Pricing-guide SEO article + carousel «كم تكلّف إدارة السوشيال ميديا في الأردن؟» ("What does social media management cost in Jordan?"). | 3+ quotes/request median |
| W8 | First **case study** (real, consented) from a signed contract. Agency Day Amman invitations (W10). **Riyadh gate review** (30 agencies). | 10 contracts signed (JO) |

### Phase C: Riyadh demand + scale (W9–W13)
| Week | Actions | Exit metric |
|---|---|---|
| W9 | Saudi launch: Saudi-flavoured film (Snap-first), TikTok, X. Google Search KSA. Saudi dialect captions. | 100 KSA match sessions |
| W10 | **Agency Day Amman** (15 agencies, 100 business owners; `docs/07`). Live content, press. | 40 requests from event |
| W11 | Gulf organic: UAE, Kuwait, Qatar, Bahrain and Oman agency outreach (LinkedIn). Egypt agency outreach (supply only). "State of social media pricing in Jordan" data teaser (only with enough real quotes). | +40 non-JO agencies |
| W12 | Creative refresh (winners scaled, losers cut). YouTube pre-roll of the hero in JO and KSA (Growth). | CPA ≤ targets |
| W13 | 90-day review: liquidity by city, CAC by channel, triggers from `docs/10` (150 active agencies → Pro). Plan Q2. | Board memo |

---

## 5. Channel plan

| Channel | Role | Audience | Formats | Cadence (organic) | Paid role |
|---|---|---|---|---|---|
| **Instagram** | Hero brand channel; the product *is* Instagram-style | Both; businesses 25–50 JO/KSA | Reels 9:16, carousels 4:5, stories | 5 posts + daily stories | Main demand and supply ads (Advantage+ placements) |
| **Facebook** | Reach 30–55 and SMEs in JO | Businesses | Same as IG + groups | Mirror IG | Included with Meta |
| **TikTok** | Awareness, pricing education, agency BTS | Businesses under 40, freelancers | 9:16, 15 s and 6 s | 4/week | Spark Ads on best organic |
| **Snapchat** | **KSA priority** (Saudi SME owners and consumers) | KSA businesses | 9:16 6–10 s, Story ads | 3/week (from W6) | KSA demand from W9 |
| **X** | KSA conversation, PR, founder voice | KSA and Gulf business community | Threads, 16:9 video | 3/week | Growth scenario only |
| **LinkedIn** | **Agency supply**, partners, press | Agency owners, BD, freelancers | Founder posts, carousels (PDF), 16:9 video | 3/week + founder 2/week | Agency-owner targeting (Standard+) |
| **YouTube** | Hero film home, how-to videos, Shorts | Both | 16:9 hero, Shorts | 1 long/2 weeks, Shorts 3/week | In-stream JO+KSA (Growth) |
| **WhatsApp** | Conversion and support; Founding 40 community; status marketing | Both | Status 9:16, broadcast, Business catalog | Daily status | Click-to-WhatsApp ads (Meta) for agencies |
| **Google Search** | High-intent demand | Businesses searching agencies | RSA ads | – | From W5 JO, W9 KSA |
| **Google Maps / Business Profile** | Local trust | "Sawwiq Amman" | Profile, posts, Q&A | Weekly post | – |
| **SEO** | Compounding demand (`docs/18`) | Businesses | `/hire/{service}/{city}` pages, pricing guides | 2 articles/week | – |

**Google Search starter keywords** (volumes not measured yet; validate in Keyword Planner):
- Arabic: «شركة تسويق الكتروني عمان», «شركات سوشيال ميديا في الأردن», «ادارة حسابات سوشيال ميديا», «شركة تسويق في الرياض», «افضل شركة تسويق الكتروني», «تصميم هوية بصرية عمان», «اعلانات سناب شات الرياض»
- English: "digital marketing agency Amman", "social media agency Jordan", "marketing agency Riyadh"
- Negatives: وظائف (jobs), كورس (course), تدريب (training), مجاني pdf (free pdf), jobs, salary

---

## 6. Budget scenarios (paid media, 90 days)

FX used: 1 JOD ≈ 5.29 SAR ≈ 1.41 USD. Jordan CPMs are about 65% cheaper than the Gulf (`docs/02`). Production is already covered by this session's Higgsfield assets.

| Line | **Lean** | **Standard** (recommended) | **Growth** |
|---|---|---|---|
| Jordan: supply (W1–4) | 150 JOD (Meta retargeting only) | 450 JOD (Meta + LinkedIn) | 900 JOD |
| Jordan: demand (W5–13) | 1,200 JOD (Meta 70%, Google 30%) | 2,400 JOD (Meta 50%, Google 25%, TikTok 15%, Snap 10%) | 4,000 JOD |
| KSA: supply (W6–9) | 0 (organic LinkedIn) | 3,000 SAR (LinkedIn + Snap) | 6,000 SAR |
| KSA: demand (W9–13) | 1,500 SAR test (Snap) | 9,000 SAR (Snap 40%, Meta 30%, Google 20%, TikTok 10%) | 20,000 SAR (+X, YouTube) |
| Gulf and Egypt supply | 0 | 0 (organic) | 2,500 SAR |
| Creators and micro-influencers (paid) | 0 | 400 JOD (2 Jordan micro-creators) | 2,000 JOD (JO + KSA) |
| **Total** | **≈ 1,350 JOD + 1,500 SAR (≈ 1,630 JOD)** | **≈ 3,250 JOD + 12,000 SAR (≈ 5,520 JOD)** | **≈ 6,900 JOD + 28,500 SAR (≈ 12,290 JOD)** |
| Non-media (all scenarios) | Agency Day 1,500–3,000 JOD; PR distribution 150–300 JOD; Google Workspace/Canva etc. | same | + part-time community manager 500 JOD/month |

### KPI targets by day 90

| KPI | Lean | Standard | Growth |
|---|---|---|---|
| Verified agencies, Jordan | 60 | 100 | 150 |
| Verified agencies, KSA | 10 | 30 | 60 |
| Agencies elsewhere (organic) | 10 | 25 | 50 |
| Match sessions (businesses) | 800 | 2,500 | 6,000 |
| Requests posted | 150 | 400 | 1,000 |
| Requests with ≥ 3 quotes in 72 h (north star) | 60% | 65% | 70% |
| Contracts signed | 10 | 30 | 70 |
| Cost per agency sign-up (JO) | ≤ 6 JOD | ≤ 8 JOD | ≤ 10 JOD |
| Cost per request (JO / KSA) | ≤ 8 JOD / – | ≤ 6 JOD / ≤ 45 SAR | ≤ 6 JOD / ≤ 40 SAR |
| Instagram followers | 2,500 | 6,000 | 15,000 |
| Organic search sessions/month (M3) | 1,500 | 3,000 | 5,000 |

All targets are *(est.)* and are reset after 2 weeks of real data.

---

## 7. Measurement setup

**Constraint:** `docs/10` says "No third-party ad scripts, ever," and PDPL consent rules apply. The site already records first-party events (`components/page-tracker.tsx`, `lib/data/stats.ts`), but no ad pixels exist. **This is decision #2 for the owner.**

**Recommended: "server-side, consented, no browser pixels".**
1. **UTMs on every link** (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content` = asset ID from `assets/manifest.md`). The page tracker already stores UTM source; extend it to all five fields.
2. **Key events** logged first-party (names to use in code and ad platforms):
   `match_started`, `match_completed`, `request_submitted`, `quote_received`, `contract_signed`, `whatsapp_click`, `agency_signup_started`, `agency_page_published`, `agency_first_post`, `agency_quote_sent`.
3. **Conversions APIs, server to server:** Meta CAPI, TikTok Events API, Snap Conversions API, Google Ads offline conversion import. Send event name + time + UTM click ID (`fbclid`/`ttclid`/`ScCid`/`gclid`) only. **Send no email or phone** unless the owner approves hashed identifiers behind explicit consent (update `docs/08`). The platforms can still optimise on click IDs.
4. **Google Search Console + Bing Webmaster** verification (still pending per `docs/18`).
5. **Weekly dashboard** (Admin → Statistics + a sheet): spend, CPM, CTR, CPA by event, the liquidity metric by city. The Supermetrics connector in this workspace can pull Meta/Google/TikTok/Snap spend once the ad accounts exist.
6. **Attribution window:** 7-day click, 1-day view. Weekly review, with creative decisions every Monday.

Alternative (not recommended): browser pixels behind a consent banner. This is faster to set up but breaks the stated policy and needs a PDPL consent flow and a new privacy-notice version.

---

## 8. Partnerships

| Partner | Offer to them | Ask | When |
|---|---|---|---|
| **Amman Chamber of Commerce / Chamber of Industry** | Free workshop «كيف تختار وكالة تسويق وتحمي فلوسك» ("How to choose a marketing agency and protect your money") for members | Newsletter + WhatsApp broadcast to members | W5–W7 |
| **JEDCO** (grants up to 15k JOD for marketing, `docs/02`) | Help grantees find vetted agencies; quote comparison as evidence for grant files | Listing as a resource | W5 |
| **Syndicates**: Jordan Dental Association, Jordan Medical Association, Pharmacists Syndicate, Engineers (real estate) | Health-ad compliance guide + agencies with health portfolios | Member mailing, event slot | W6–W8 |
| **Universities**: UJ, PSUT, GJU, Yarmouk, Al-Hussein Technical Univ.; KSA: PNU, KSU | Freelancer showcase program, student portfolio track (later) | Career-office posts | W3, W11 |
| **Agency associations / communities**: Jordan digital-marketing communities; Saudi Marketing Society; Dubai Lynx community (later) | Founding-agency status, Agency Day co-host | Member intro | W1, W6 |
| **Hubs**: Oasis500, iPark, Zain Innovation Campus, Orange Digital Village; Riyadh: Misk, Monsha'at SME programs | Perks for their startups (agency shortlist in 48 h, human-assisted) | Portfolio intros | W5–W9 |
| **Banks' SME arms**: Capital Bank, Bank al Etihad, Arab Bank | Content for their SME clients | Newsletter slot | W8+ |

## 9. PR

- **Launch story (W5):** "A Jordanian startup launches the first Arabic marketplace for hiring marketing agencies". Pitch Arabic outlets (Al Ghad, Roya, Al Mamlaka, Ammon, Khaberni) and English (Jordan Times, Wamda, MAGNiTT news, Arabian Business for KSA W9). Needs a founder quote, 3 real founding agencies, and photos.
- **Data PR (W11+):** "What does social media management cost in Jordan?" from anonymised quote data. Publish only with n ≥ 100 real quotes; label the methodology.
- **Founder voice:** LinkedIn 2 posts a week and a podcast circuit (Jordanian and Saudi business podcasts).
- **Crisis line** (payments question): «الدفع المحمي يعمل حالياً في وضع تجريبي، وسيتم تفعيله مع مزوّد دفع مرخّص قبل الإطلاق التجاري.» ("Protected payment currently runs in test mode and will be switched on with a licensed payment provider before commercial launch.")

## 10. Referral and launch offers

| Offer | Audience | Mechanic | Guardrail |
|---|---|---|---|
| **Founding agency** (first 40 per city) | Agencies | Founding badge, homepage feature, direct WhatsApp group with founder, **free Pro when paid plans start** (length = owner decision #4) | Never promise "lifetime" without sign-off (legacy copy said lifetime; see `docs/01`) |
| **Agency invites agency** | Agencies | Each verified agency invited = +1 month Pro later | Only counts when the invited agency is verified and posts 6 works |
| **Refer a business owner** | Agencies and businesses | Agency shares its «اطلب عرض عبر سوّق» ("Request a quote via Sawwiq") link; the client's request is routed to them first | The client still sees alternatives (relevance rule) |
| **Launch week for businesses** | Businesses | «أول طلب لك: نساعدك تكتب البريف» ("Your first request: we'll help you write the brief"; human help via WhatsApp) | No discounts on agencies' prices by us |
| **Agency Day ticket** | Both | Free, registration via Sawwiq | Consent for photos |

No fake reviews, no invented testimonials. Anything illustrative is labelled «مثال» / "Example" as the product already does.

## 11. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Payment claims ahead of reality** (escrow is test mode) | High | Legal and trust | "Protected payment" ads held; claim-safe wording: «عقد على مراحل، وكل مرحلة تعتمدها أنت» ("A contract in stages, and you approve each one"). Launch escrow ads only after the licensed PSP and CBJ check. |
| "First Arabic platform" challenged | Medium | Ad rejection or complaint | Legal check; fallback «منصة عربية لوكالات التسويق» ("An Arabic platform for marketing agencies"); keep evidence of the search. |
| Cold start: businesses arrive to thin supply | High | Churn, bad reviews | 30-agency gate per city; demo agencies clearly marked and never in ads. |
| Agencies fear "lead reselling" | Medium | Slow supply | Free at launch; founder calls; clear fee rules; 10% guarantee fee shown honestly (currently 0 during launch per `.env.example`; decision #3) |
| Health-sector ad rules (MoH, syndicates) | Medium | Ad rejection | No before/after or medical claims; the health vertical creative shows only the business side |
| Ad-account bans (new accounts, finance-ish claims) | Medium | Delays | Warm accounts 2 weeks with low spend; Business Manager verification; no "guarantee" wording in ads |
| Dialect missteps | Medium | Cringe, lost trust | Native reviewer per country before publishing (brand kit §2) |
| AI imagery perceived as fake | Medium | Trust | AI is used for **brand scenes only**. Product shots are real screen recordings. No AI "agency work" presented as a real agency's portfolio. Label "illustrative" in demo contexts. |
| Privacy (PDPL, KSA PDPL) | Low–Med | Fines | Server-side events without PII; consent versioning; retention notes in `docs/08` |
| Founder bandwidth | High | Missed outreach | Outreach scripts + one intern for onboarding; weekly 30-min review |
