# Council seat: onboarding and activation

Seat: onboarding and activation designer for two-sided marketplaces (Airbnb hosts, Fiverr sellers, Behance and Dribbble profiles).
Lens: time to first value, the order of steps, what can wait until the agency is live, defaults, auto-save, the publish model, honest progress, coming back, and empty states.
Evidence: `walkthrough.md`, screenshots `shots/01`–`23` (Arabic, 390 px) plus `29`, `33`, `51`–`53`, and the source files named in each row. No repo files were changed.

---

## 1. The diagnosis in one paragraph

The owner's "not direct" feeling has one main cause. **The flow never ends in the thing the agency came for.** An agency joins to get a page it can share. Today it fills 3 join steps and 5 wizard steps, presses "احفظ معرض أعمالي" (Save my portfolio), and gets a page nobody else can open (shot `20`, a 404). Going live is a separate page with a 3-way legal choice (shot `19`). The finish screen makes "Add another project" the primary button, and "Choose who can see my page" is only a secondary link (shot `17`). The Studio then ticks every step as done (shot `18`), so the system itself says "you're finished" while the page is still invisible. Everything else (services asked twice, 6 Behance entry points, a dead-end social step, native validation bubbles) adds friction. But the broken ending is what makes the whole flow feel pointless.

**The fix: finishing means going live.** You get a shareable link inside 3 minutes. Everything that does not help the first project goes to a "make your page stronger" list after launch.

### What "first value" means here

For an agency in registration phase, first value is **"my page with my work, at a link I can send on WhatsApp."** It is not "an account" and not "a saved draft". Every step before that moment has to earn its place. Every step after it is optional polish that we ask for once the agency already cares.

---

## 2. Screen-by-screen verdicts

Legend: **Keep** · **Cut** · **Merge** (into another screen) · **Defer** (after go-live, in Studio) · **Rename** · **Redesign**.

### 2.1 Landing `/ar`: `01-ar-landing.png`, `app/[locale]/(landing)/page.tsx`

| Element | Verdict | Why |
|---|---|---|
| Primary CTA "Reserve your place in the first cohort" (5 copies) | **Rename** to "أنشئ صفحتك مجاناً" / "Create your free page" | "Reserve a place" promises a waitlist, not a page. The CTA should describe the outcome. Keep at most 2 copies (hero and footer). |
| "See an example profile" | **Keep** | It shows the end result before any effort. That is the best motivator. |
| "Register your business" (client path) | **Keep** | It is the other side of the market. Keep it visually secondary. |
| `/start` chooser (`24-ar-start.png`) | **Keep as is (bypassed)** | Landing CTAs going straight to `/join` is correct. Do not add a chooser step. |
| English "Sawwiq is available in English…" bar on every Arabic page | **Redesign** | It is English text, truncated, and it pushes every onboarding screen down. Show it in Arabic, show it once, and hide it on `/join` and `/portfolio-setup`. |

### 2.2 Join step 1 "Your page": `02`, `03`, `app/[locale]/(auth)/join/join-form.tsx`

| Field / element | Verdict | Why |
|---|---|---|
| Agency name* | **Keep** | It is the one thing we cannot guess. |
| Username / handle* | **Defer (auto-generate)** | Choosing a URL slug is a developer idea. Generate it from the name. For Arabic names, which give no Latin slug, use the email's local part or a short transliteration. Show it as one line: "رابطك: sawwiq.org/a/xyz · غيّر". Check availability live. Saves 1 required field and the most "technical" moment of the flow. |
| Country (Jordan preselected) | **Merge** into one location line | Show "عمّان، الأردن · غيّر" (Amman, Jordan · change) as a chip. Most users tap nothing. |
| City* (Amman preselected) | **Merge** (same chip) | Needed for matching, and already defaulted, so it should not take up a full select. |
| 3-step side rail | **Cut** | The new join is one screen. A rail for one screen adds noise. |
| "What you type stays on this device…" | **Keep, shorten** | Re-entry reassurance is good. Keep the sessionStorage draft logic, which already excludes the password and consent. |
| "Early registration phase" notice box | **Cut here** | Repeated on join, Studio home and every Studio page. Say it once, on the success screen, in one line. |
| Behance hint box | **Cut here** | A promise with no action yet. Behance belongs on the project screen, where it can actually be used (§2.9). |
| Native bubble "Please fill out this field" (English in an Arabic page, `03`) | **Redesign** | Use `noValidate` and the shared Zod schema. Show an inline Arabic message under the field and scroll to it. This is a CLAUDE.md issue too: no copy should come from outside the message files. |

### 2.3 Join step 2 "Team and services": `04`, `components/studio/team-fields.tsx`, `components/service-picker.tsx`

The screen is 2,180 px tall and uses three taxonomies (team roles, specialty search, services).

| Field | Verdict | Why |
|---|---|---|
| "You are" agency / freelancer | **Merge** into join as a 2-option toggle (default agency) | Zero taps for most people. It lets the copy say "Agency name" or "Your name". |
| "Who is on your team?" (10 role chips) | **Defer** | Useful for team-gap matching later. It adds nothing to the first project, so it moves to "make your page stronger". |
| "Add another specialty" search + note | **Defer** | Same reason. It also confuses with the services search right below it. |
| "What do you offer?" services | **Merge** into the project screen (§2.9) | Ask once, as "What did you do on this project?". Copy the answer into the agency's services. That fixes the "asked twice" problem by asking once, in context, where the answer is concrete. |
| Whole step | **Cut** | Nothing left. |

### 2.4 Join step 3 "Contact and sign-in": `05`, `06`

| Field | Verdict | Why |
|---|---|---|
| WhatsApp* (+962 default) | **Keep** | It is the agency's main contact channel on the public page (shot `23`). |
| Agent code (optional, full-width field) | **Redesign** | Take it from `?ref=` or the cookie automatically, as the page already does. Otherwise hide it behind a small "لدي رمز مندوب" (I have an agent code) link. A visible optional field makes people stop and wonder if they need one. |
| Email* | **Keep** | It is the login. Do not add an email-code step now. When email is configured, defer verification to a Studio nudge after go-live. |
| Password* (min 8) | **Keep, improve** | Add a show/hide toggle and a live "8+ characters" hint. No bubbles. |
| Terms + "showing my contact details on my public page" box* | **Keep (non-negotiable)** | Keep it versioned. Note: today it contradicts the private default ("public page", but the page is private). With finish = live, the wording becomes true. |
| 18+ box* | **Keep (non-negotiable)** | Keep it next to the terms box. Both stay required and server-checked (`actions.ts` `consentRequired` / `adultRequired`). |
| "Create page" button | **Rename** "أنشئ صفحتي وأضف أول عمل" (Create my page and add my first work) | It says what comes next. |

**New join = 1 screen:** kind toggle (preset), name, location chip (preset), WhatsApp, email, password, 2 boxes. That is 6 required inputs. Sign-up data is not lost, because the sessionStorage draft stays.

### 2.5 Wizard step 1 "Profile": `07`, `08`, `components/setup/wizard.tsx` `ProfileStep`

| Field | Verdict | Why |
|---|---|---|
| Logo / photo | **Defer**, first item on the success screen | High value for the page's look, but it blocks nobody. Ask for it right after the page is live, when the agency sees the plain green initial avatar and wants to fix it. |
| Name (prefilled) | **Cut** | It was typed 30 seconds earlier. Edit it in Studio. |
| Short intro / bio | **Defer** | Optional today anyway. It works better as a nudge after go-live ("pages with an intro get more contact clicks"). |
| Services (prefilled from join) | **Cut** | The duplicate question. Services now come from the project screen. |
| "Do this later" skip | **Cut** | The step is gone. |

### 2.6 Wizard step 2 "Source": `09`, `10`, `11`, `SourceStep`

| Element | Verdict | Why |
|---|---|---|
| Whole step | **Cut** as a step | Picking a "source" is a question about our system, not the user's work. Upload is the default. |
| "Upload my files" card | **Merge**: it becomes the photo area of the project screen | One big "أضف صور العمل" (Add work photos) target. |
| "Import an existing portfolio" (PDF / Behance) | **Merge** as one text link inside the photo area: "عندك أعمالك على Behance أو PDF؟ استوردها" (Have your work on Behance or in a PDF? Import it) | It is still one tap away for people who have it. The panel opens inline and fills the same project form. Replace the native file input, which shows "No file chosen" in English, with a styled button. |
| "Connect a social account" card | **Cut until it works** | 5 of 5 platforms say "not registered yet" (shot `11`, docs/53). A dead end in the first 2 minutes signals "unfinished product". Show it only when `providers.some(configured)`. |
| Arabic copy bug in `Setup.source.manualAlternative` | **Fix** | "يمكنك ترفع صورك" is missing "أن": it should read "يمكنك أن ترفع صورك". |

### 2.7 Wizard step 3 "Client": `12`, `ClientStep`

| Element | Verdict | Why |
|---|---|---|
| 3 big radio cards (client / personal / private) | **Redesign** as one text field plus 2 small chips | Field "لمن كان هذا العمل؟" (Who was this for?), with chips under it: "عمل شخصي" (Personal work) · "عميل سرّي" (Confidential client). Typing a name = client mode. Tapping a chip = that mode, and the field is cleared. The same three outcomes, without a whole screen. |
| "Example only: Example cafe → …" line | **Cut** | The placeholder can carry the example ("مثلاً: مقهى النخلة"). |
| Generic error "Something in this step isn't right" | **Redesign** | Show the error inline under the field: "اكتب اسم العميل أو اختر «عمل شخصي»" (Type the client's name or choose "Personal work"). |
| Merge into the project screen | **Merge** | The client is one attribute of the project, not a step of its own. |

### 2.8 Wizard step 4 "Project": `13`, `14`, `15`, `ProjectStep`

This becomes the heart of onboarding: **one screen, "اعرض أفضل عمل لديك"** (Show your best work).

| Field | Verdict | Why |
|---|---|---|
| Photos (1–10, first = cover) | **Keep, move to top, make bigger** | The photos are the portfolio. Upload starts as soon as the files are picked, as it does now. Show progress on each thumbnail. Keep the cover star and remove. Make reorder drag-only, or hide the arrows behind a long-press. Four icon buttons per thumbnail (shot `15`) is too much on a phone. |
| Project name* | **Keep** | Placeholder "مثلاً: إطلاق قائمة مقهى النخلة" (e.g. Al Nakhla café menu launch). |
| Client (from §2.7) | **Merge here** | It sits under the project name. |
| "Services this work shows" | **Redesign** as "ماذا عملت في هذا المشروع؟" (What did you do on this project?) | Show 8 popular service chips plus "more". At least 1 is required. **These also become the agency's services** (union, editable later). This is the single place services are asked. |
| "Your part, in a sentence or two"* | **Keep, prefill** | Build a draft sentence from the chosen chips, e.g. "تصوير المنتجات وتصميم المنشورات" (Product photography and post design), that the user can edit. Zero typing is possible, but the honesty signal stays. |
| "More services" (~30 checkboxes) | **Keep collapsed** | Fine as it is. |
| "See a real example" accordion | **Keep, move to top as a small link** | It is useful before the user starts, not after they have filled the form. |
| Error banner at top, button at bottom (`14`) | **Redesign** | Show the error inline next to each field, scroll to the first one, and keep the button visible. |
| "Preview" button | **Cut** | The success screen *is* the preview, of the real live page. |

### 2.9 Wizard step 5 "Preview": `16`, `PreviewStep`

| Element | Verdict | Why |
|---|---|---|
| Card preview | **Cut as a step** | It is a fake of what the next screen shows for real. Keep the component for the Studio "add project" flow, if wanted. |
| Edit profile / client / project buttons | **Cut** | There is nothing to jump back to on a 2-screen flow. |
| Visibility note "Your page is private… [choose who can see]" | **Replace** with the go-live consent (§3) | This is where the decision belongs: at the moment of finishing, not on another page. |
| Rights box* "I have the right to show this work…" | **Keep, merge** with the publication acknowledgement | One box, next to the button. See §3 for the exact model. |
| "احفظ معرض أعمالي" (Save my portfolio) | **Rename and change behaviour**: "انشر صفحتي" (Publish my page) | Finishing = live. Secondary text link: "احفظها خاصة الآن" (Keep it private for now). |

### 2.10 Wizard finished: `17`, `Finished`

| Element | Verdict | Why |
|---|---|---|
| "حُفظ مشروعك الأول" (Your first project is saved) | **Redesign** as the "your page is live" moment | Title "صفحتك منشورة" (Your page is published). Under it, the link as text with a big **"شارك على واتساب"** (Share on WhatsApp) button and "انسخ الرابط" (Copy link). This is the aha moment. Make it feel like one. |
| "Choose who can see my page" (secondary) | **Cut** | It is already decided. Private users see "انشر صفحتي" (Publish my page) as the primary button instead. |
| "View the project", "View my portfolio" | **Merge** into one "شاهد صفحتي" (View my page) | |
| "Add another project" (primary today) | **Demote** to secondary | Good next step, but sharing comes first. |
| "Add another client" | **Cut** | Clients come with projects. |
| *New:* "Make your page stronger" list (3 items max) | **Add** | 1. Add your logo (1 tap, inline upload). 2. Add 2 more projects (pages with 3+ get…). 3. Write a one-line intro. Each one is a link to a focused screen, not to the 45-field profile form. |

### 2.11 Studio home: `18`, `components/registration/studio-registration.tsx`, `app/[locale]/(main)/studio/page.tsx`

| Element | Verdict | Why |
|---|---|---|
| "Start with these steps" (3 items, all ticked in `18`) | **Redesign: make it honest** | `visibility.done = !publication.legacy` is always true for new accounts, because the private row is created at sign-up (`lib/data/publication.ts`). Fix: done only when the owner *saved* a choice (an audit row `profile.publication_changed` exists, or `consentVersion` is set by the owner). Better still, replace it with one model (below). |
| Three separate progress models (wizard 5 steps, Studio 3 steps, setup guide "2 of 2", shot `33`) | **Merge** into one "قوة صفحتك" (Your page strength) list | Same items everywhere: live ✓/✗, logo, intro, 3 projects, a package, team roles, social links. Never show "done" for a default. |
| Early-registration notice (also on every Studio page via `RegistrationNotice`) | **Cut to one line** in the page header | It takes the first screen of every Studio page. |
| "No business owners have registered yet" | **Defer / reword** | True, but discouraging at minute 3. Show it once the page is live, framed as "you'll be among the first they see". |
| Behance card (big) | **Cut** here | It appears in 6 places. Keep it in 2: the project screen import link and the Studio "Add work" page. |
| "Who can see your profile?" card | **Redesign** as a status pill at the top of Studio: "● منشورة" / "● خاصة · انشر" (● Published / ● Private · Publish) | One tap from private to publish, with the same consent box in a small sheet. |
| Pioneer benefit panel | **Defer** until the page is live | It is a reward. It should not compete with setup. |
| Studio tab strip (9+ tabs, scrolls, cut off; Insights is first) | **Redesign** for new users | Show 4 tabs until the page is live: صفحتي (My page) · أضف عملاً (Add work) · الظهور (Visibility) · الإعدادات (Settings). Insights (all zeros), Contracts, NDAs, Packages and Clients appear after go-live or on first use. An empty Insights screen as the first tab is a bad empty state. |
| Setup guide tab `/studio/setup` (`33`) | **Cut** as a tab | Its content (projects not scattered images, before-publishing checklist) folds into the project screen's "See a real example" and the strength list. |

### 2.12 Publication settings: `19`, `21`, `app/[locale]/(main)/studio/publication/page.tsx`

| Element | Verdict | Why |
|---|---|---|
| 3 radios with legal-length text | **Redesign**: 2 plain options plus 1 advanced | "منشورة: أي شخص يفتح رابطك، وتظهر في البحث عند الإطلاق" (Published: anyone can open your link, and you appear in search at launch) · "خاصة: لا يراها غيرك" (Private: only you can see it). "Link only (unlisted)" goes under "خيارات أخرى" (More options). All three states stay in the data model (docs/51). |
| Acknowledgement box* | **Keep** (versioned, audited) | It is the legal basis. Just phrase it in one short sentence. |
| Native bubble on an unticked box | **Redesign** | Inline Arabic error. |
| "Old copies can't be recalled" small print | **Keep**, but only show it when switching *from* public to private | That is the only time it is relevant. |
| Reachability | **Fix** | Today it is the 4th Studio tab and a secondary link. After the redesign it is rarely needed, because the decision is made in the flow, and the status pill covers changes. |

### 2.13 Other entry points: `28` profile (~45 inputs), `29` new post, `31`/`32` imports

| Screen | Verdict | Why |
|---|---|---|
| `/studio/profile` (45 inputs, raw `tr_*` labels) | **Redesign later** (other seats) | For onboarding, never send a new user here. Each strength-list item links to a focused mini-form (logo only, intro only, team only). |
| `/studio/new` "New post" (30 service checkboxes, 11 platforms, industry, result, English version…) | **Redesign**: reuse the onboarding project screen for every "Add work" | One way to add work, everywhere. Advanced fields (platforms, industry, result, English version) go under "تفاصيل إضافية" (More details). |
| Behance bookmarklet section (`32`) | **Keep, desktop only** | Hide it under 768 px, where dragging a bookmarklet is impossible. |

---

## 3. The publish model (the most important decision)

**Recommendation: finishing the first project = the page is live, by explicit choice, in one tap.**

How to do it without breaking docs/51 or the consent rules:

1. Keep the 3 visibility states and the `profile_publications` row created private at sign-up. A user who leaves halfway is never exposed.
2. On the project screen, the final control is:
   - One required box: "من حقي عرض هذا العمل والوصف صحيح، وأوافق على نشر صفحتي لمن يفتح رابطها، وظهورها في البحث عند إطلاق سوّق" (I have the right to show this work and the description is accurate. I agree to publish my page to anyone who opens its link, and to it appearing in search when Sawwiq launches.) The English mirror goes in `en.json`.
   - Primary button "انشر صفحتي" (Publish my page). It calls the existing `setPublication(…, "public")`, which writes the consent version and the audit log, and publishes the project in the same server action.
   - Text link "احفظها خاصة الآن" (Keep it private for now). It saves with the rights box only (as today) and shows the private success state with "انشر صفحتي" (Publish my page) as its primary button.
3. Bump `PUBLICATION_CONSENT_VERSION`, because the wording is now combined, and update docs/08 and docs/51 to say "the explicit publish choice can be made at the end of first-project setup".

Why "public" and not "link only" as the publish target: in registration phase the two behave the same today (the link opens, there is no directory yet). The only difference is whether the agency appears when discovery opens, which is exactly what the agency joined for. Making that the default *of the explicit action*, with plain wording, is honest. Making them come back later to opt in would silently cost them visibility at launch.

**Risk:** owner and legal must accept a combined rights-plus-publication box. If they prefer two boxes, keep two boxes on the same screen. That is still 1 screen and +1 click, not a separate page.

---

## 4. Re-entry, auto-save and empty states

- **Auto-save:** keep what exists. The join draft goes to sessionStorage (no password, no consent). The project draft is saved on the server (`saveProjectDraftAction`), and photos upload as soon as they are picked. Add a save on field blur for the project name, client and your-part text, with a quiet "محفوظ" (Saved) tick. Never say saved before the server confirms (the code already follows this rule).
- **Returning user (signed in, no project yet):** after login, go **straight to the project screen** with the draft restored. Don't show a Studio invitation card (docs/53) that needs a second tap. "أكمل لاحقاً" (Finish later) goes to Studio, which shows a single card: "صفحتك على بعد خطوة واحدة من النشر" (Your page is one step from going live) → back to the draft.
- **Returning user (project saved, page private):** the Studio status pill reads "خاصة · انشر" (Private · Publish) at the top of every Studio page.
- **Reminders:** if email or WhatsApp providers are configured, send one reminder 24 h later to accounts with no project. If they are not configured, there is no reminder, and the app still works (providers stay optional). Never log the phone or email when doing so.
- **Empty states:**
  - Owner viewing their own page with 0 projects: one large "أضف أول عمل" (Add your first work) tile in the grid, not an empty tab.
  - Insights with zeros: hidden until the page is live. After that: "ستظهر الأرقام عندما يبدأ الناس بزيارة صفحتك. شارك رابطك" (Numbers will show once people start visiting your page. Share your link) plus a share button.
  - Clients, Packages: one sentence and one button each, shown only on first visit.
- **Instrumentation** (events only, no personal data): `join_view`, `account_created`, `first_photo_uploaded`, `page_published`, `link_shared`. The key metrics are the median time from `join_view` to `page_published`, and the % of accounts published within 24 h.

---

## 5. Proposed flow and target counts

```
Landing ──► 1. Join (one screen) ──► 2. Your best work (one screen) ──► 3. Your page is live
                                                                         └─► Studio: "make your page stronger"
```

**1. Join** `/join`. Agency / freelancer toggle (preset) · Name* · Location chip "عمّان، الأردن · غيّر" (preset) · WhatsApp* · Email* · Password* · Terms + contact box* · 18+ box* · [أنشئ صفحتي]. The handle is auto-generated and shown as "رابطك: …· غيّر". The agent code is taken from the link or sits behind a small link.

**2. Your best work** `/portfolio-setup`. [Add work photos] (big) · "Import from Behance / PDF" link · Project name* · Who was it for* (field + "Personal" / "Confidential" chips) · What did you do* (service chips → also saved as agency services) · Your part (prefilled from the chips, editable) · Rights + publish box* · [انشر صفحتي] · "احفظها خاصة الآن" (Keep it private for now).

**3. Live** (same URL). "صفحتك منشورة" (Your page is published) · the link · [شارك على واتساب] (Share on WhatsApp) · Copy link · View my page · "Make it stronger": add logo / 2 more projects / intro.

| Metric | Today (walkthrough) | Target |
|---|---|---|
| Screens to a public page with 1 project | 12 | **4** (landing, join, work, live) |
| Clicks | 19 | **9** (CTA, terms, 18+, create, add photos, pick files, 1 service chip, publish box, publish) |
| Fields shown | ~32 | **~14** |
| Required inputs | 15 | **11** (name, WhatsApp, email, password, terms, 18+, ≥1 photo, project name, client-or-chip, ≥1 service, rights/publish box) |
| Text entries typed | 8 | **6** (name, WhatsApp, email, password, project name, client) |
| URL navigations | 5 | **3** |
| Time to a shareable link (target, real phone) | not measured end-to-end; many minutes | **under 3 minutes** |
| Services asked | 2 times | **1** |
| Behance entry points | 6 | **2** |
| Dead-end options shown | 5 (social) | **0** |

**Deferred to "make your page stronger"** (all optional, each a small focused screen): logo, bio/intro, about and strengths, team roles, extra specialties, countries served, starting price, packages, social links, Google rating, English translation, more clients and logos, more projects, email verification (when an email provider is on).

---

## 6. Ranked changes

| # | Change | Impact | Effort | Risk |
|---|---|---|---|---|
| 1 | **Finish = live**: one publish action at the end of the first project (combined, versioned, audited consent; "keep private" as a secondary link). Success screen centred on the link and WhatsApp share. | Very high: fixes the broken ending and creates the aha moment | M | Medium: owner and legal sign-off on the consent wording; consent version bump; docs/08 and docs/51 updates |
| 2 | **Collapse the wizard to one "best work" screen**: cut the Profile, Source and Preview steps; merge Client into Project; photos first. | Very high: 5 steps become 1 | M | Low to medium: e2e tests for the setup flow need rewriting; server draft actions can be reused |
| 3 | **Ask services once, on the project** ("What did you do?"), and write them to the agency's services. Remove join step 2. | High: kills the duplicate question and the 2,180 px screen | S–M | Low: matching still gets services; check `lib/matching` handles a union with no profile-level picks |
| 4 | **One-screen join**: auto handle, location chip, agent code hidden, kind toggle; terms and 18+ stay. | High | S–M | Medium: Arabic-name → handle fallback, and a live uniqueness check |
| 5 | **Honest progress**: one "page strength" model; visibility is never "done" by default; fix the `!publication.legacy` tick. | High trust | S | Low |
| 6 | **Inline, localized validation everywhere** (`noValidate` + shared Zod; errors next to the field, scrolled into view). | Medium–high, especially in Arabic | S–M | Low |
| 7 | **Hide dead ends**: social connect only when a provider is configured; Behance in 2 places, not 6; no bookmarklet on phones. | Medium | S | Low |
| 8 | **Progressive Studio for new users**: 4 tabs until live; status pill "Private · Publish"; registration notice down to one line; Insights and Pioneer panels after go-live. | Medium | M | Low |
| 9 | **Direct re-entry**: after login with no project, go straight to the draft; one reminder if a provider is configured. | Medium on completion rate | S | Low |
| 10 | **Small copy fixes**: rename the landing CTA to "Create your free page"; Arabic grammar in `Setup.source.manualAlternative`; English language bar hidden in onboarding and shown in Arabic; styled file input instead of the English native one. | Low–medium | S | Low |
| 11 | **One "add work" screen everywhere**: `/studio/new` reuses the onboarding project screen, with advanced fields collapsed. | Medium (later sessions) | M–L | Medium: posts vs projects data shapes |

All of the above keeps Arabic first and RTL, both locales, 390 px first, logical CSS, optional providers, terms and 18+ with version, private-until-chosen, briefs anonymised and no pay-for-relevance.
