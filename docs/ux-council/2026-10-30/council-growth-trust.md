# Council note: growth, matching quality and trust

Seat: marketplace growth, matching quality and trust strategist. 30 Oct 2026. Research only; no repo files changed.
Sources read: walkthrough.md, council-linkedin.md, shots 02-07, 16-23, docs/08, 10, 11, 12, 31, 44, 51, 57, 58, 59, `lib/core/rules/matching/score.ts`, `lib/matching/index.ts`, `lib/core/rules/matching/owners.ts`, `lib/data/owner-matching.ts`, `lib/core/rules/founding.ts`, `lib/core/rules/launch-phase.ts`, `lib/data/provider-signup.ts`, `lib/data/publication.ts`.

## The short answer

- The owner is right. Today it takes **19 clicks, 12 screens and 15 required fields** to reach a public page. The matcher only needs about **6 facts** to rank an agency well.
- Most of the extra weight is not there for matching. It is there because three separate systems each ask their own questions: sign-up, the portfolio wizard, and the publication page.
- The biggest single problem: **"Save my portfolio" does not publish.** The user finishes, feels done, and the page is still a 404 for everyone else. Matching skips private pages, so that agency is invisible.
- There **is** a real legal reason for an explicit publication choice. But it can be one honest checkbox and one button at the end of the wizard, not a separate page.
- Target: **sign-up plus first public project in about 8 clicks, 9 required inputs, 5 screens, under 10 minutes**, with match quality unchanged.

---

## 1. What matching and trust actually use

### Client matchmaker (`score.ts`, 100 points + capped boost)

| Signal | Points | Source field | Needed at sign-up? |
|---|---|---|---|
| Offers requested services | 35, and a **hard gate** (no service = excluded) | `services` (taxonomy keys only; `pendingServices` don't count) | **Yes** |
| Portfolio posts tagged with those services | 3 each, max 15 (5 posts) | published posts + their `services` tags | **One project, yes.** More later |
| Budget fit vs starting price / cheapest package | 15 fit, 7 near, **8 if unknown** | `startingPriceJod`, packages | **No.** A missing price costs at most 7 points, and only when the client gives a budget. A wrong high price is worse than none |
| City | 10 same, 4 other, 6 client doesn't mind | `city` | Yes (already preselected) |
| Reputation | 15 max | reviews, Google rating | No (cannot exist yet) |
| Platforms | 5 | `platforms` | No. Infer from the project's tags later |
| Industry | 5 | `industries` | No. Infer from the client's business type later |
| Verified (commercial registration) | 3 | `isVerified` (staff) | No |
| Paid boost | +6/+10 only if relevance ≥ 45, flag on, "Featured" | plan | No (payments off) |

Worked example: an agency with 1 tagged project, no price, same city, all services matched scores 35 + 3 + 8 + 10 = **56**. That is already above the 45 "relevance floor". Five tagged projects make it 68. **Projects matter more than any profile text field.**

Matching also has a silent gate: `findMatches` only reads `discoverableProfiles()` (visibility = public). **A private page scores zero because it is never a candidate.**

### Business-owner matching (`owners.ts`, docs/59)

Country 30, same city 25, service groups 30, industry 10, **has published work 10, bio 5**. Same lesson: services, city, one project.

### Founder and medal rules

- Founder benefits (`founderEligibility`): cohort seat + active + **bio + services** + **one post or one package**. Publication is not required.
- Founding Member medal (docs/57): logo, intro of 40+ characters, services, platforms, price or package, WhatsApp, one project with images.

### Trust items that must stay

18+ declaration, terms/privacy consent with version, unique email and handle, a real phone number, the "I have the right to show this work" declaration, private media until published, moderation and reports, demo exclusion, no client contacts to the AI, briefs anonymised until a quote.

---

## 2. Field-by-field decisions

Legend: **Keep** (sign-up), **Move** (to the one setup flow), **Later** (Studio, nudged), **Infer**, **Drop**.

### Sign-up (`/join`, today 3 steps, 15 fields)

| Field | Decision | Why |
|---|---|---|
| Agency name | **Keep** | Identity. Needed everywhere |
| Username / handle | **Infer**, editable | Generate from the name (Latin transliteration). Show "sawwiq.org/a/xxx – change". Removes a field and the "taken" error loop |
| Country | **Keep, preselected** | Matching gate |
| City | **Keep, preselected** | 10 points; owner match 25 |
| You are: agency / freelancer | **Keep as 2 big tap cards** on screen 1, or **Move** | Changes copy and partner suggestions. Not in the score. One tap is cheap |
| Team roles (10 chips) | **Later** (Studio → Partners) | Only used for `seeksRoles` (collaboration). Not in matching. Its own taxonomy confuses people |
| "Add another specialty" search | **Drop** from sign-up | Third taxonomy on one screen. Creates `pendingServices` that do **not** count for matching |
| Services | **Keep, ask ONCE** | The hard gate. Use the same 6 groups the client wizard uses (docs/12 §1a), then the services inside. Suggest 1-5 picks. Never ask again in the wizard |
| WhatsApp | **Keep** | Main contact channel in Jordan, medal rule, strongest anti-fake signal later (OTP) |
| Agent code | **Infer** from `?ref=`; else hide behind "Someone from Sawwiq introduced me" | Optional field nobody needs to see |
| Email | **Keep** | Login, recovery, notices |
| Password | **Keep** for now | (Option later: emailed code like `/owner`, no password. Not needed for this redesign) |
| Terms + privacy checkbox | **Keep, but cut the last clause** | Today it says "and to showing my contact details on my public page". The page is private at that moment. Ask that consent at publication, when it actually happens (see §3) |
| 18+ checkbox | **Keep, separate** | PDPL legal-capacity rule (docs/08 §age). Must stay its own explicit statement |
| (new) Reminders opt-in | **Add, unticked, optional** | Needed for the nudge loop (§6). Registration alone is not marketing consent (docs/08) |

Result: 2 screens instead of 3. Required: name, services, WhatsApp, email, password, terms, 18+ = 7 (handle, country, city prefilled).

### Setup wizard (`/portfolio-setup`, today 5 steps + finished)

| Step / field | Decision | Why |
|---|---|---|
| Logo / photo | **Later** but prompted on the preview | Not in matching. LinkedIn: photos get far more views. Medal needs it. Nudge, don't block |
| Name | **Drop** (already given) | Asked twice |
| Short introduction | **Later**, but offer a **one-tap draft** built from services + city ("We are a team in Amman doing Meta ads and content") that the user edits | Owner match +5, founder eligibility needs it. A draft removes the blank-box fear. Rule-based template; no AI needed |
| Services | **Drop** (asked at sign-up) | Asked twice today |
| Source: upload / import / connect | **Fold into the project step.** Upload is the default. "Import from PDF or Behance instead" is a small link. **Hide "Connect a social account"** until at least one platform works | Today 5 dead ends by design (docs/53). Dead ends teach people the product is broken |
| Client: 3 radios + name | **Fold into the project step** as one field "Who was it for?" with a small "Keep the client private" switch. Personal/practice work is a third chip | One screen fewer. Client name feeds trust ("For X") and later client confirmation |
| Photos | **Keep, required** | Proof of work. 3 portfolio points per tagged project |
| Project name | **Infer** default "<Client> – <first service>", editable | One less blank field |
| "Your part" | **Keep, required, one line**, with 3 tap-starters ("We designed…", "We ran the ads…", "We shot…") | Trust: it limits "we did the whole campaign" over-claims on shared work. Cheap to answer with starters |
| Services this work shows | **Keep, pre-ticked** from sign-up services | This is the 3-points-per-post signal. Must be right |
| Rights declaration | **Keep**, merged into the publish consent (§3) | Legal and trust |
| Preview | **Keep** as the last screen, with the Publish button on it | People need to see what goes public |

Result: setup becomes **2 screens** (Project, then Preview + Publish), not 6.

### Studio, later (nudged, never blocking)

Starting price or a package; platforms (pre-suggest from project tags); industries (pre-suggest from client type); about, strengths, English version; team roles and partner needs; more projects (aim for 3-5 tagged); Google rating link; countries served; commercial registration for the verified badge.

---

## 3. Publication: keep the choice, fold it into the flow

### Is there a real reason to keep an explicit choice? Yes, four.

1. **Personal data.** Many providers are freelancers. Their name, face and WhatsApp number are personal data under PDPL No. 24/2023. Showing them to the public needs clear, informed consent with a version. docs/51 makes `private` a real permission, versioned and audited (`profile-publication-v1`).
2. **Client work and rights.** A project shows a client's brand. The provider must declare they may show it.
3. **What "public" means changes.** In registration, public = anyone with the link. When discovery opens, the same choice puts the page into listings, search engines and matching. That future effect must be said up front (docs/51: "phase change never promotes a private account").
4. **Signing up for an account is not consent to be published.** Bundling the two (as today's join checkbox half-does) is weaker consent, not stronger.

So the choice must stay **explicit, informed, unticked and recorded**. It does **not** need its own page, three radio cards, or a second checkbox.

### Honest fold-in (the preview screen)

- Title: "This is how your page will look."
- One unticked checkbox, plain words:
  "I have the right to show this work. I agree that anyone can see my page, my work and my WhatsApp number. When Sawwiq opens to business owners, my page can appear in search and be suggested to them. I can change this any time."
- Primary button: **"Publish my page"** (disabled until ticked). This saves the project and sets `public` in one transaction, with consent version and audit row, exactly as `/studio/publication` does today.
- Secondary text link: **"Not yet – keep it private"** (saves the project, stays private). A small "Share by link only" option can live behind it or in Studio.
- After publishing: "Your page is live: sawwiq.org/a/xxx" with **Share on WhatsApp** and **Copy link** (LinkedIn lesson L3: agencies' own audiences become traffic).
- The Studio publication page stays as the place to change the choice later.
- Ask legal to confirm the merged wording. The two statements (rights and visibility) are about the same act, so one box is defensible. The 18+ and terms boxes stay separate at sign-up.

### Fix the Studio checklist

"Choose your profile visibility" is ticked even when the user never chose (private default counts as done, per docs/51). Keep docs/51's principle that private is a valid choice, but count it only after an **explicit** "keep private" tap. Until then the next step reads "Publish your page so business owners can find you".

### A gap to close before owner emails go out (high priority)

`lib/data/owner-matching.ts → providerFacts()` selects active, non-demo providers **without checking publication visibility**. When `OWNER_MATCH_EMAILS` is on or discovery opens, a **private** provider's name and handle can be emailed to a business owner as a suggestion, and the owner then clicks into a 404. That breaks the provider's private choice and looks broken to the owner. Fix: filter with `discoverableProfiles()` (public only), or add an explicit "introduce me to business owners" choice to the publish consent. Add a unit test. This also gives private providers an honest reason to publish.

---

## 4. Verification and anti-fake checks

Principle: **block nothing at sign-up that a real freelancer cannot do in 10 seconds. Check more as the stakes rise.**

| Stage | Check | Status |
|---|---|---|
| Sign-up | Unique email and handle, valid phone format, terms consent with version, 18+ | Keep (built) |
| Sign-up | Rate limit sign-ups per IP and per phone; honeypot field | Add if missing (S) |
| Sign-up | Email verification | **Add, non-blocking**: a one-tap link. Today agencies' emails are never verified (walkthrough: no code, `email:false`) |
| First publish | Rights declaration, versioned publish consent, private media until then | Keep (merged) |
| First publish | **Duplicate-image check**: perceptual hash of each upload against other agencies' images. Match → page goes to a staff review queue, stays live, no public accusation | Add (M). Main defence against copied portfolios |
| First publish | Behance/PDF import keeps its source link as provenance | Keep |
| Before discovery opens | **Verified email required** to be a matching candidate; WhatsApp OTP or a staff WhatsApp check for founding members | Add (M). Phone OTP needs a provider; staff check works for 100 pages |
| Ongoing | Reports, moderation, suspension; staff sample audit of new public pages | Keep |
| Badge | Commercial registration → "Business identity verified" (+3 points) | Keep **optional**. Never at sign-up: freelancers often have none |
| Later | "Confirmed by client" mark via a one-question link to the tagged client (council-linkedin L8) | Later (M); client contact never to AI or logs |
| Money | KYC by the payment partner at payouts only | Keep (docs/08, docs/44) |

Do **not** add: ID upload at sign-up, commercial registration at sign-up, a manual approval before a page can go public during registration. Each would cut activation for little trust gain while discovery is closed.

---

## 5. Founding 100 as the motivator

What exists: every real provider gets a founding seat at sign-up (`assignFoundingSeats`); the first 100 before `FOUNDING_CLOSES_AT` are the cohort. Benefits (0% first project, 7% first year, 6 months Pro, 24 h head start) activate only with **bio + services + one post or package** (`founderEligibility`). The invited 50 can earn the numbered medal (docs/57).

How to use it in the new flow, honestly:

- **Show the seat on the success screen**, not buried in Studio: "You hold founding seat №037." Then one line: "Your founder benefits start when your page has a short intro and one project." Link straight to the missing item.
- **Align the benefit checklist with match-ready** (§6). Today founders can be "eligible" while private and invisible to matching. Owner decision: add "page published (public or link) before discovery opens" to activation, **or** at minimum nudge founders to publish. Do not change the economics without the owner.
- **Make "founder" concrete without promises.** Allowed: the dated badge, the head start "on requests you are already a good fit for", 6 months of Pro tools when Pro exists. Not allowed: "guaranteed clients", seat counters on the public landing (docs/51, docs/55: no invented scarcity), or implying founder = better.
- **Spend the scarce thing the code comment names: "the team's onboarding time".** Offer founding members a **done-with-you setup**: "Send us your PDF or Behance link, we draft your page, you check and publish." Staff edits are audited; the provider still ticks the rights/publish box themselves. For 100 agencies this is the highest-impact, lowest-tech lever.
- Medal checklist (logo, 40+ char intro, platforms, price…) is a fine **"Strong page"** target. Keep it as the second level, not the first gate.

---

## 6. "Match-ready" and the nudge loop

### Definition (make it one pure, tested function, shared by Studio, nudges and metrics)

**Match-ready** (level 1, the activation target):
1. Active, real (not demo).
2. Publication = **public** (so `discoverableProfiles()` includes it).
3. At least **one approved taxonomy service** (not only pending ones).
4. City set (country default JO).
5. WhatsApp set.
6. At least **one published project with an image, tagged with one of its services**.

**Strong page** (level 2): + intro ≥ 40 chars, + starting price or one package, + platforms, + logo, + 3 tagged projects. (Close to the medal checklist, so one meter serves both.)

The Studio meter shows the level and **one next step** with its real effect: "Add a starting price: clients with a budget see you as a fit." It never changes ranking by itself (council-linkedin L1).

### Nudges (consent first)

There is **no setup reminder job today**; existing reminders cover collaboration and contracts only. Registration alone is not consent to promotional messages (docs/08). Plan:

- **Consent:** an optional, unticked box at sign-up: "Remind me by email or WhatsApp to finish my page (at most 3 messages)." Stored with a consent version. Reminders about the user's own unfinished account are close to service messages, but asking keeps it clean and matches the LinkedIn $13M lesson.
- **In-app always** (no consent issue): Studio banner and notification with the one next step.
- **Schedule** (only if opted in, stops the moment the user is match-ready or opts out):
  - +24 h: "Your page is one step from live: add one project" (deep link to the exact step, signed-in).
  - +72 h: show their draft page preview image + "Publish" link.
  - +7 days: founder angle if in cohort: "Your founding seat is held. Benefits start once your page has one project."
  - Then stop. No more than 3. Quiet hours (reuse `lib/collab/next-actions.ts` quiet-hours logic).
- **Channel:** email first (adapter exists). WhatsApp only via an approved template provider, or as **personal staff outreach** to the founding cohort. Never bulk WhatsApp from a personal number.
- **After match-ready:** one "Strong page" nudge per week at most, and a freshness nudge after 60 days with no new work.
- **Logs:** never log the email or phone; log the reminder kind and agency id only.

---

## 7. Metrics

Event names below are suggestions; record agency id and step only, never contact data.

### North stars (from council-linkedin)
- Later, once discovery opens: **share of requests with 3+ relevant quotes in 48 h**, and **share of match-ready agencies that got at least one real request this month**.

### Redesign success (start now)

| Metric | Definition | Target (validate after 2 weeks of baseline) |
|---|---|---|
| **Activation (primary)** | % of new providers who are **published and match-ready within 24 h** of sign-up | ≥ 50% |
| 7-day activation | Same within 7 days (catches nudge effect) | ≥ 65% |
| Time to publish | Median minutes from sign-up start to "Publish my page" | < 10 min |
| Effort | Clicks and required inputs on the shortest path (re-run the walkthrough script) | ≤ 10 clicks, ≤ 9 required |
| Step drop-off | % lost at each screen: join 1, join 2, project, preview | No single step > 20% |
| Error rate | % of submits with a validation error, per field | < 5% per field |
| Private-by-choice | % who explicitly keep private | Track; not a failure (docs/51), but investigate if > 30% |
| Strong page by day 7 | % match-ready that reach level 2 | ≥ 30% |
| Projects per page by day 30 | Median tagged projects | ≥ 3 |
| Import use | % of first projects from PDF/Behance; and staff-assisted setups | Track |
| Nudge effect | Activation of opted-in vs not; opt-out and complaint rate | Opt-out < 10%, complaints 0 |

### Guardrails (must not get worse)
- Match quality: offline eval (`npm run ai:eval`) pass rate unchanged; share of top-5 matches with ≥ 1 tagged project.
- Fake/copied content: duplicate-image flags per 100 new pages; staff removals; reports per 100 pages.
- Wrong services: % of pages whose services have no tagged project after 30 days.
- Consent integrity: 100% of public pages have a publication consent version and audit row; 100% of accounts have 18+ and terms timestamps.
- Owner side: owner-match acceptance rate; zero private providers ever suggested to owners.

---

## 8. Ranked changes

Impact = effect on activation and match-ready supply. Risk = risk to trust, law or the non-negotiables.

| # | Change | Impact | Effort | Risk | Notes |
|---|---|---|---|---|---|
| 1 | **"Publish my page" on the preview**: one unticked rights + visibility checkbox, saves project and sets public in one step, versioned and audited; "keep private" as a secondary link | Very high | S | Low (needs legal wording check) | Removes 4 clicks, 1 page, and the "I'm done but invisible" trap |
| 2 | **Gate owner matching on publication** (`providerFacts` → `discoverableProfiles()`), with a test | High (trust) | S | Removes a privacy risk | Must land before `OWNER_MATCH_EMAILS` or discovery |
| 3 | **Ask services once**, using the client wizard's groups; drop team roles and specialty search from sign-up | High | S | Low | Services are the 35-point gate; pending custom services don't match |
| 4 | **Collapse the wizard to 2 screens**: one Project screen (photos, "who was it for" + private switch, one-line part with starters, pre-ticked service tags; import as a link) + Preview/Publish. Hide social connect | Very high | M | Low | 6 screens → 2 |
| 5 | **Shared `matchReadiness()` rule + Studio meter** (Match-ready / Strong), one next step with its real effect; fix the false "done" tick | High | S-M | Low | One definition for Studio, nudges, founder panel and metrics |
| 6 | **Funnel events + activation dashboard** (no PII) | High (we can't improve what we can't see) | S | Low | Baseline before and after |
| 7 | **Consented reminder loop** (opt-in box, max 3 emails over 7 days, stops at match-ready) | High | M | Medium if done without consent; low as designed | No setup reminders exist today |
| 8 | **Founding seat on the success screen + done-with-you setup for the cohort** | High for the first 100 | S (copy) + staff time | Low | Never promise clients; provider still ticks consent |
| 9 | **Infer handle, project name and a draft intro**; prefill agent code from link | Medium | S | Low | Fewer blank boxes and error loops |
| 10 | **Move contact-display consent** from the join checkbox to the publish checkbox | Medium (honesty) | S | Lowers legal risk | Consent at the moment it happens |
| 11 | **Duplicate-image detection** to a staff review queue | Medium (trust) | M | Low | Main anti-copy check; no public accusation |
| 12 | **Email verification link (non-blocking) now; required to be a matching candidate before discovery** | Medium | M | Low | Agencies' emails are unverified today |
| 13 | **Localise validation**: inline Arabic messages per field instead of browser bubbles and generic banners | Medium | S-M | Low | Part of "took time to understand" |
| 14 | Owner decision: **add "published" to founder activation** | Medium | S | Medium (changes program terms) | Owner must approve; keep economics unchanged |
| 15 | Later: client-confirmed work mark; WhatsApp OTP before discovery | Medium | M-L | Medium (contact data) | After the core flow lands |

### Do not do
- Auto-publish at sign-up or pre-tick the publish box (breaks consent and docs/51).
- Require commercial registration, ID or staff approval before a page can go public in the registration phase.
- Show public seat counters or "only N left" on the landing (docs/51, docs/55).
- Let the meter, founder status or any plan change relevance (docs/10, docs/44).
- Send setup reminders by WhatsApp without opt-in, or more than 3.
- Count a pending custom service as matchable to make the meter look full.

## 9. Open questions for the owner
1. Approve the merged publish wording (with legal) and "Publish" as the primary action during registration?
2. Should founder benefits require a published page?
3. Will the team commit staff time to done-with-you setup for the founding 100?
4. Email only for reminders now, or contract a WhatsApp template provider?
