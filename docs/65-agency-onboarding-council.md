# 65. Agency onboarding: council verdict and simplification plan (30 Oct 2026)

The owner tried joining as an agency and filling a portfolio: "not friendly, not direct, complicated. The concept is solid, the interface needs changing." A walkthrough agent recorded the real journey (74 screenshots, Arabic 390 px first), then five specialists reviewed every screen and field, and a sixth studied LinkedIn. Full notes: `docs/ux-council/2026-10-30/` (screenshots stay out of the repo).

Seats: onboarding and activation · Arabic-first mobile UI · portfolio content · UX writing and navigation · marketplace growth and trust · LinkedIn business model.

## What is wrong today (measured)

| | Today |
|---|---|
| Screens from landing to a public page with 1 project | **12** |
| Clicks | **19** |
| Fields shown / required | **~32 / 15** |
| Services asked | **twice** (join step 2 and wizard step 1) |
| Behance/PDF import entry points | **6** |
| Dead-end options | **5** "connect a social account" cards, none work |
| Studio tabs on day one | **9** (up to 21 after launch); the strip is cut off at every width |
| Words for "a piece of work" in Arabic | **8** (مشروع، منشور، نموذج عمل، محفظة…) |

The worst single moment: the wizard's last button "احفظ معرض أعمالي" saves **privately**. A visitor to the page gets a 404. Going live needs a separate Publication page, three radio cards and another tick, and nothing says so. Then the Studio checklist shows all three steps ticked anyway (`!publication.legacy` in `components/registration/studio-registration.tsx`).

Other findings every seat agreed on:
- Join step 2 is 2,180 px tall with three different skill lists (team roles, specialty search, services); none affect the match score at sign-up.
- Errors are the browser's English bubbles on Arabic pages; the wizard shows a vague "Something in this step isn't right" banner off-screen.
- Small Arabic polish: an English language bar on every Arabic page (truncated, cutting its own button), "No file chosen" in English, "(Behance)؟" breaking across lines, about 25 strings in dialect or with typos.
- The wizard project form and `/studio/new` are two different forms for the same record; `/studio/new` pre-ticks "Graphic design".

## The council's unanimous recommendation

**Four screens instead of twelve:** landing → join (one screen) → show your work (one screen) → "your page is live".

1. **Join, one screen.** Name, WhatsApp, email, password, terms box, 18+ box. Handle generated from the name (shown as "رابطك: … · غيّر"), city preset as a chip, agent code behind a small link. Team, specialties and services leave sign-up.
2. **Show your work, one screen.** Big "اختر صوراً أو ملف PDF" picker first, one "or paste a Behance link" line. Project name, "What did you do?" service chips (saved as the agency's services too, so services are asked once), client optional with "Hide the name" → business type. PDF/Behance produce several project cards to check, not one.
3. **Publish at the end of the same screen.** One unticked, versioned, audited box (rights + who can see the page), button "انشر صفحتي", secondary link "احفظها خاصة الآن". Same `setPublication` transaction, consent version bumped.
4. **"صفحتك منشورة".** The link, **Share on WhatsApp**, Copy link, See my page, then "make it stronger" one step at a time.

Targets: 4 screens, ~9 clicks, ~14 fields, under 3 minutes to a shareable link on a real phone.

Everything else (logo, intro, team roles, packages, price, countries, English version, social links) moves to "make your page stronger" in Studio, one small screen each, never blocking.

## Studio after the change

Four tabs on day one: **الرئيسية / أعمالي / صفحتي / الحساب** (Home / My work / My page / Account) plus a "+ أضف عملاً" button. Other sections appear when they have content (messages, opportunities, contracts, collaborate). Messages and Chats merge. Packages vs subscription naming clash fixed («الباقات» vs «الاشتراك»). Home shows the real status ("صفحتك الآن: خاصة") and one next step, from one tested `matchReady()` / "page strength" function.

Match-ready = public + 1 service + city + WhatsApp + 1 published project with an image tagged with one of those services. That scores 56, above the 45 relevance floor; price missing costs at most 7 points.

## LinkedIn: what to take and what not to

Take: start from what the agency already has (their PDF/Behance is the "résumé import"); a page-strength meter with one next step; a "See our work on Sawwiq" link for Instagram bios and WhatsApp (open profiles to search were LinkedIn's second growth engine); Pro sells private aggregate insight later, after docs/10 triggers; most money comes from buyers, not members.
Avoid: ProFinder made freelancers pay ~$60/month to answer requests and was wound down in 2024: never charge agencies to reply. LinkedIn paid $13M over automatic invite reminders: only invites an agency sends itself. Measure liquidity (requests with ≥3 relevant quotes in 48 h), not sign-ups.

## Competitors (council-competitors.md, added 30 Oct)

Behance and Dribbble make finishing = live with a tiny publish gate (cover, title, one creative field; Behance will not even review a project with fewer than 3 images). Directories (Clutch, Sortlist, Entasher, Fiverr Agencies, Upwork) review before listing and ask for business facts; every closed marketplace (Khamsat, Mostaql, Ureed, Dribbble since 2025) bans off-platform contact because it takes a cut. Nobody serves Arabic agencies well: Behance has no Arabic interface; Clutch lists 21 creative agencies in Amman, 3 with reviews. Verdict: the 4-screen flow is competitive on screens (Behance is about 5); Sawwiq's ~14 fields are heavier only because WhatsApp, consent, 18+ and a password cannot be dropped. Taken into the build: Behance's publish gate (cover + auto-filled title + 1–3 services; "your part" optional; "3 projects look real" as a nudge), the "clients contact you directly on WhatsApp, no commission" line on the live screen, and the handle editable before first publish. Planned next: an availability toggle and "ask a past client for a review" on the live screen; one service card (service, price from, delivery days) as the first "make it stronger" step; a PWA share target so "Share → Sawwiq" from Photos opens the add-work screen. Never: staff approval before visibility, paid verification, paid rank, per-lead fees, contact bans.

## Built on 30 Oct 2026 (stages 1–5)

- **Join is one screen** (`app/[locale]/(auth)/join/join-form.tsx`): agency/freelancer toggle, name, page link suggested from the name (`suggestHandle`, falls back to the email), country and city, WhatsApp, email, password, agent code behind one line, terms and 18+ boxes. Team roles, specialties and services left sign-up. Errors appear under the field in the page's language (`noValidate` + the joinSchema rules in the browser); a server error (taken username, used email) lands under its field too.
- **Setup is one screen** (`components/setup/wizard.tsx`, docs/53): photos / PDF pictures / Behance link, name, "What did you do?" chips (saved as the page's services too), optional part, optional client, and the publish box with the three audiences and the rights tick. `finishSetupAction` does it all in order; the success screen has the link, Share on WhatsApp, Copy link and, for a private page, the publish choice in place.
- **Studio** (`components/studio/studio-nav.tsx`, both shells): four tabs (Home, My work, My page, Account) plus "+ Add work"; sections with news get a tab while the news lasts; everything else under "More". The Studio home shows the page's real status and one next step from `pageStrength()` (`lib/core/rules/page-strength.ts`, unit-tested); nothing is ticked by default. Behance is offered in two places (the setup screen and the import link), not six. The English language bar no longer shows on sign-up, setup or Studio pages. `/studio/new` no longer pre-ticks a service. 29 Arabic strings moved from dialect to Modern Standard Arabic.
- **Stage 2 (31 Oct):** the live screen and the Studio home carry an **"Open to new projects"** switch (`agencies.accepting_projects`, on by default, audited; off keeps the page listed and reachable but out of the matchmaker, the closest-agencies list and owner matching: `openToProjects()` in `lib/data/availability.ts`). The public page shows the state as a badge. After 60 days without a confirmation the Studio asks "still open?" (`availabilityStale`). The live screen also offers **"Ask a client for a review"** (the existing private, single-use review link with its WhatsApp message) whenever reviews are on and the page is reachable.
- Not built yet (stage 6 and the competitor additions): opt-in setup reminders, funnel events, service card, share target, bulk multi-project cards on the first run (the import tool still does bulk).

## Already fixed in this round

- **Privacy:** owner-match suggestions (`providerFacts` in `lib/data/owner-matching.ts`) ignored publication visibility, so a private page could be suggested to a business owner once owner emails switch on. Now filtered with `discoverableProfiles()`; unit test added.

## Build order (each stage ships to staging first, then main)

| Stage | Change | Effort | Needs owner? |
|---|---|---|---|
| 1 | Honest Studio status; inline Arabic errors (`noValidate` + shared Zod); hide social-connect while nothing connects; Behance in 2 places not 6; Arabic fixes (language bar hidden in onboarding, styled file picker, `<bdi>`, ~25 strings); `/studio/new` stops pre-ticking a service | S | No |
| 2 | Join on one screen (auto handle, preset city, services moved out) | S–M | No |
| 3 | Wizard → one "show your work" screen with multi-project cards from photos/PDF/Behance; services asked once | M | No |
| 4 | Publish from the work screen + "your page is live" with WhatsApp share | M | **Yes: combined consent wording (legal check), consent version bump, docs/08 + docs/51** |
| 5 | Four-tab Studio with show-when rules; one word per concept | M | No |
| 6 | Page-strength meter, opt-in setup reminders (max 3 emails in 7 days), funnel events without personal data | M | Yes: email only or WhatsApp too |

## Questions for the owner

1. Approve one combined box (rights + "anyone can see my page; it can appear in search when Sawwiq opens") with "Publish my page" as the main button? Legal should check the wording.
2. Should founding-100 benefits require a published page?
3. Will staff offer "send us your PDF, we draft, you publish" to the founding 100?
4. Setup reminders by email only, or WhatsApp too?
