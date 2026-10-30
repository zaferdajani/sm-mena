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
