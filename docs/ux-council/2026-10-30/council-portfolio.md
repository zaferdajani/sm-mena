# Council note: portfolio entry, from the agency's side

Seat: portfolio and content strategist for creative agencies. 30 Oct 2026. Research only; no repo files changed.
Sources: walkthrough.md, shots 08-17, 29-40, 59, 73-74, `components/setup/wizard.tsx`, `components/studio/post-form.tsx`, `portfolio-import.tsx`, `behance-import.tsx`, `client-form.tsx`, `lib/validation/portfolio-setup.ts`, `lib/data/portfolio-setup.ts`, `lib/data/posts.ts`, `lib/core/rules/matching/score.ts`, `lib/matching/index.ts`, `lib/portfolio-import/rules.ts` + `ai.ts`, `lib/behance/map.ts`, `app/[locale]/(main)/studio/actions.ts`, council-linkedin.md.

## The short answer

- The wizard asks for **one project at a time, typed by hand, client first**. Agencies hold work as **piles**: a PDF company profile, an Instagram grid, a Behance page, a Drive folder. They want to pour the pile in and fix it, not fill a form per project.
- The best tool Sawwiq has is the **PDF importer** (`portfolio-import.tsx`). It already works with no AI key (`lib/portfolio-import/rules.ts`), splits a deck into many projects, finds clients, services and the logo. It is buried in Studio. The wizard's "Upload" path, the one the owner took, is the weakest path.
- The matchmaker needs very little from a project: **published, with images, tagged with a service**. Client name, title, platforms, result and "your part" score **zero** in `score.ts`. The buyer needs a bit more (a cover, a name, who it was for, what you did), but all of that can be suggested or added later.
- So: **one "Add your work" flow**, one drop zone (photos, PDF or a Behance link), many projects per drop, client optional, one consent, publish at the end. Same component in first run and in Studio.

---

## 1. How agencies actually hold their work (Jordan, 2026)

| Where the work lives | Who | What it looks like | What Sawwiq has today |
|---|---|---|---|
| **PDF company profile / credentials deck** | Almost every agency of 3+ people. They send it on WhatsApp to every lead. | 10-40 pages: cover, about, services, client logo wall, then 1-3 pages per project, contact page. | PDF import (docs/36). Rule-based, AI optional. Hidden at `/studio/import`. In the wizard it is a bare native file input (shot 10, "No file chosen Choose File" in English). |
| **Instagram grid** (their own account and client accounts they run) | Everyone, especially social media managers and freelancers. | Single posts and carousels, Reels. Client accounts are the real portfolio. | Nothing. "Connect a social account" is a dead end on all 5 platforms (shot 11, docs/53). |
| **Phone gallery / Google Drive / WhatsApp** | Freelancers, photographers, small teams. | Loose JPGs and screenshots, one folder per client. | Upload, 1-10 images per project, one project at a time. |
| **Behance** | Designers and branding studios. A minority of Jordanian SMM agencies. | Clean projects with title, fields, many images. | Wizard (one project only), `/studio/import/behance` (many, with a desktop bookmarklet fallback), plus 4 more links to it. Offered in 6 places. |
| **Website "Work" page** | Larger agencies. | Case studies. | Nothing. Defer. |

What this means:
- The **PDF is the real résumé** of a Jordanian agency. LinkedIn grew on "start from your résumé" (council-linkedin.md, L2). Sawwiq already built the résumé import; it must be the front door, not a Studio sub-page.
- **On a phone the file picker already reaches Google Drive, Photos and Files.** "Upload" covers Drive and WhatsApp-saved images with no Google key. Say so on the button ("From your phone, Drive or Photos").
- **Instagram needs a no-API path.** Two honest ones: screenshots (works today) and the Instagram "Download your information" export (a zip of media plus captions and dates, no Meta app needed). Do not show connect buttons that cannot connect.
- **Behance is one source, not a brand.** It deserves one line in the import box ("Paste a Behance link"), not six cards.

---

## 2. What a project must carry: buyer vs matchmaker

From `lib/core/rules/matching/score.ts` and `lib/matching/index.ts`:

| Signal | Points | Comes from | Set by the portfolio flow today? |
|---|---|---|---|
| Agency offers the requested service | 35, and a **gate** (0 matches = excluded) | `agencies.services` | Wizard step 1 only. Post services are **not** added to the agency. |
| Published posts tagged with a requested service | 3 per post, **max 15 (5 posts)** | `posts.services`, `status=published` | Yes (services, min 1). |
| Budget fit | up to 15 | package / starting price | No (packages page). |
| City | up to 10 | agency | Join. |
| Platform | 5 | `agencies.platforms` (not post platforms) | **No.** Only the long profile form sets it. `/studio/new` asks platforms per post, but they never reach the agency. |
| Industry | 5 | `agencies.industries` (not post or client industry) | **No.** Same gap. Wizard saves `industry: null, platforms: []` (`lib/data/portfolio-setup.ts:294`). |
| Reviews, Google rating, verified | up to 18 | elsewhere | - |

What the matchmaker ignores entirely: client name, project title, "your part", result, cover order, English version.

What a buyer needs to trust a project (in order):
1. **A strong cover image.** It is all they see in the grid (shot 23: 1 column, first image only).
2. **What kind of business it was for** (industry) and, if allowed, **the brand name**. A known Amman brand is the strongest trust signal there is.
3. **What the agency did** (photos? ads? full account?). One line is enough.
4. A **result**, when there is one. Nice, rare, never blocking.

Minimum useful project = **1+ images + 1 service**. Everything else is suggested, optional, or a later nudge.

---

## 3. Field by field

Verdicts: Keep, Cut, Merge, Defer (ask after publishing, as a nudge), Auto-fill (suggest, user confirms), Rename.

### 3a. Wizard step 2 "Where is your work?" (shots 09-11, 46, 59)

| Field | Verdict | Why |
|---|---|---|
| Card "Upload my files" | **Merge** into one drop zone | It says "you add them in step 4 after choosing who the work was for" (shot 09). The user picks a source, then is sent away from it for two steps. Pick files here, now. |
| Card "Import an existing portfolio" (PDF + Behance URL) | **Merge** into the same drop zone | The drop zone accepts images **and** PDF. A text box under it accepts a Behance link. One place, three sources, no choice to make first. |
| Native PDF file input | **Cut** | English "No file chosen Choose File" inside Arabic (shot 10). Use the same styled picker as photos. |
| Card "Connect a social account" | **Cut** until a platform app exists | 5 platforms, 0 work (shot 11). A dead end in the first 2 minutes teaches "this site is broken". Replace with a one-line tip: "Work on Instagram? Save screenshots, or upload your Instagram data download." |
| Button "Continue with upload" | **Cut** | The drop itself is the continue. |

### 3b. Wizard step 3 "Who did you make this for?" (shots 12, 47, 73)

| Field | Verdict | Why |
|---|---|---|
| Whole step before the project | **Move** after images, inside the project card | Asking "who for?" before showing any work is backwards. People recognise work by its images, then remember the client. In the PDF and Behance paths the client is already found by rules (`clientOf`, `clientFor`). |
| Radio "Add a client or brand" + name (required when chosen) | **Keep as optional, auto-fill** | One text box "For which brand? (optional)" with type-ahead of existing clients. Prefilled from PDF/Behance. Empty = no client. Never required. |
| Radio "Personal or practice work" | **Rename + simplify** to a chip "Personal / practice project" | It is a label, not a client. One tap, not a radio group. |
| Radio "Keep the client private" | **Rename + improve**: a switch "Hide the brand name" on the client field | Today private means no client at all. Better: keep the name **privately** (agency's own records, later client confirmation, docs/28), show publicly "Confidential client · Restaurant / café". Ask **industry** instead of the name: it is what matching uses (+5) and what buyers care about. |
| Generic error "Something in this step isn't right" | **Cut** | Field-level Arabic message, or no error at all because the field is optional. |
| "Example only: Example cafe -> ..." line | **Cut** | Real examples are better shown once, next to the cover, not as a grey arrow string. |

Is "client" necessary up front? **No.**
- It does not affect matching.
- It creates a `portfolio_clients` row as a side effect (walkthrough §7). That is a second entity to manage before the first project exists.
- Confidentiality is normal in this trade (NDAs with banks, ministries, NGOs, competitors of current clients). Making the client the first question makes the agency hesitate at step 3.
- Keep the Clients page (logos, accounts, client confirmation) as a **later** upgrade: "You showed work for 3 brands. Add their logos to show a client wall."

### 3c. Wizard step 4 "Show one project" (shots 13-15, 48, 74) and `/studio/new` (shots 29, 36-38, 55)

| Field | Wizard | `/studio/new` | Verdict | Why |
|---|---|---|---|---|
| Images, 1-10, first = cover, reorder, remove | Yes | Yes | **Keep** | The core. Add PDF pages and Behance images to the same strip. Keep "Make cover" star (wizard) and add it to Studio. |
| Project name | Required, 2-120 | None (only description) | **Auto-fill, optional** | Suggest "<Brand> · <Service>" ("Rose Boutique · Brand identity"). Behance title, PDF heading (`headingOf`) already give it. Stored as the first line of the caption anyway (`portfolio-setup.ts:293`). |
| "Your part, in a sentence or two" | Required, 2-600 | None | **Keep, make optional, rename** "What did you do? (optional)" | Valuable to buyers and for collaborations, but the Behance path proves it blocks (shot 74: title filled, part empty, Preview refused). Offer tap-to-write chips from the chosen services: "Photography · Post design · Account management" fills the line. |
| Description / caption (2200) | None | Yes, free text, no guidance | **Merge** with the two above | One model for both screens: title (auto) + one line (optional). Long text goes to "More details". |
| Services this work shows | Required 1-6; **pre-ticks the agency's first service** | Required; **pre-ticks "Graphic design"** (first primary) | **Keep, auto-fill honestly** | Suggest from file names, PDF text, Behance fields (`servicesIn`, `servicesFor`). If nothing is found, tick nothing and ask. A wrong default silently mislabels work and weakens matching. Show the agency's own services as chips, the other ~30 behind "Other" (shot 74 shows the full list opened: 30 chips on a phone). |
| Service not in the agency's own list | Allowed | Allowed | **Add a prompt** | When a post is tagged SEO but the agency does not list SEO, ask once: "Add SEO to your services? Otherwise you won't appear for SEO requests." The gate in `scoreAgency` returns null without it. |
| Platforms (11 chips) | None | Yes | **Defer + roll up** | Never reaches matching (agency field). Move to "More details". When set on posts, suggest adding to `agencies.platforms`. A weak hint from image shape (9:16 = Reels/TikTok/Stories) can pre-select, user confirms. |
| Client industry (select) | None | Yes | **Keep as the client fallback, roll up** | When the brand is hidden or empty, ask "What kind of business?" (8-10 chips: restaurant/café, clinic, retail, e-commerce, education, real estate, tourism, other). Store on the post, suggest into `agencies.industries`. |
| Result (80) | None | Optional | **Defer** | Ask after publishing, once per agency: "Add a result to your best project". Never blocking. Numbers must be the agency's own claim; keep the "accurate" acknowledgement covering it. |
| English version (translation) | None | Collapsed | **Defer** | Arabic default is right. Offer it from the post page later. AI translation only if a key exists. |
| "This post features an app" (6 fields) | None | Collapsed | **Defer, show only for web/app services** | Irrelevant for 90% of agencies. |
| Account / client select | Step 3 | Select of existing clients only, link to `/studio/clients` | **Merge** into the type-ahead client field | Today a new client in Studio means leaving the form (post-form.tsx: "Add" link). Type a name, it is created. |
| "See a real example" accordion | Yes | Yes + "Use an empty description structure" + 4-step strip | **Keep one**, shrink | One small example card above the first project. Cut the 4-step strip in `/studio/new` (shot 37); the form itself should be that simple. |
| Behance box + PDF box inside `/studio/new` | - | Yes | **Cut** | They become the drop zone itself. |

### 3d. Wizard step 5 "Preview" and the finish (shots 16-17, 19-21)

| Field | Verdict | Why |
|---|---|---|
| Preview card | **Keep, but inline** | Show the cards as they will look while editing (the review list *is* the preview). No separate step. |
| Edit profile / Edit client / Edit project buttons | **Cut** | Edit in place on the card. |
| "I have the right to show this work and the description is accurate" | **Keep, once per batch** | One tick covers every project in the drop: "I have the right to show these N projects, and what I wrote is accurate." Check docs/08 that one acknowledgement per batch is enough (it is one act by one person on one screen). |
| "Save my portfolio" that does not publish | **Replace** | Put the visibility choice on the same final screen, one radio group, and the button says what happens: "Publish 4 projects" or "Save privately". The default stays per docs/51 (owner decision); the point is that the choice is **here**, not on a 4th Studio tab. Removes 4 clicks and 1 page load. |
| Finished card with 5 links | **Simplify** to 2 | "See my page" and "Add more work". Plus one nudge (section 6). |
| "Add another project" restarts at step 2 | **Cut** | With batch import there is no "another": the drop takes many. |

### 3e. PDF import review (shot 39) and Behance import (shot 40)

| Item | Verdict | Why |
|---|---|---|
| PDF reader, rules mode, AI mode, merge/split, logo and client finding | **Keep, promote to the front door** | Best piece of the product. Works with no key. |
| Three-part "What to do with what we found" guide (logo, accounts, posts) | **Merge** into the review list | Logo and client logos are suggestions on top ("Use this as your logo? Yes / No"), not a numbered task list. |
| Per-draft fields: caption, client, result, services, platforms (11 chips), industry select | **Trim** to the card in section 5 | Same card as uploads. Platforms and result go to "More details". |
| "Publish one post" per draft | **Replace** with one "Publish N projects" | Bulk in, bulk out. |
| "Unused pages" strip | **Keep** | Good: covers, contact and client walls stay out unless chosen. |
| Behance bookmarklet fallback | **Defer / desktop only** | Mobile users cannot drag to a bookmarks bar (walkthrough §14). Hide it under 768px. |
| Behance ownership note ("verified"/"unverified") | **Keep** | Protects against copying someone else's Behance (council-linkedin L11). |

---

## 4. One import entry point instead of six

Today Behance or PDF import is offered on: join aside, wizard step 2, Studio home card, `/studio/new` (two boxes), `/studio/import`, `/studio/import/behance`, setup guide (3 buttons). Each says it differently and leads to a different screen with different fields.

Proposal:
- One route, one component: **"Add your work"** (`أضف أعمالك`). Used by the first-run flow, the Studio "Add your work" tab, the empty profile state and every nudge.
- One drop zone that accepts **images (many) and PDF**, and one line under it: **"Or paste a Behance link"**. The file type decides the reader; the user never picks a "source".
- Remove from: join aside (tell them at the end instead), Studio home card (replace with the meter's next step), `/studio/new` boxes, setup guide buttons. Keep `/studio/import` URLs as redirects.
- Later sources (Instagram data zip, website) appear as more lines in the same box, never as new pages.

---

## 5. Bulk upload: many projects at once

Agencies do not have "one project". They have 20-60 pieces. A form per piece loses them by the third.

How to group a pile into projects **without AI** (all rules, all testable as pure functions):
- **PDF:** already done (`planFromText`: headings, galleries, cover/about/services/clients/contact pages).
- **Behance:** one Behance project = one Sawwiq project (already mapped in `lib/behance/map.ts`).
- **Photos:** group by (1) folder name / file-name prefix ("rose-01.jpg, rose-02.jpg"), (2) capture time from EXIF within the same day, (3) dominant colour already computed in `ProcessedImage.color`. Default when unsure: **one image = one project**, with "Merge with previous" (the PDF reader already has it) and drag to move.
- **Instagram data zip (later):** one post (single or carousel) = one project; caption becomes the suggested title and line; date kept.

With AI (only when `ANTHROPIC_API_KEY` or provider is set): vision suggests grouping, title, services and industry. Same review screen. If the call fails or times out, fall back to the rules (as `portfolio-import/ai.ts` already does). Rules for the AI:
- Agency text and images are untrusted data (already in the system prompt).
- Strip phone numbers and emails from PDF text before sending (contact pages and client contact lines). Today the full page text goes to the model.
- Never send client contact data; the client name may go, it is portfolio content.

Limits to keep: 10 images per project (`MAX_IMAGES_PER_POST`), 40 PDF pages / 40 MB. Add a soft cap per drop (for example 30 projects) and upload in the background with a progress line, so the phone screen can lock.

---

## 6. What a great first portfolio looks like

- **3 projects** is the minimum that looks like a business, not a test. One project looks like a placeholder.
- **5 projects tagged with your main services** is where the matchmaker's portfolio points stop growing (3 points each, cap 15, `WEIGHTS.portfolioMax`). Say that plainly, it is the honest reason to add more (council-linkedin L1).
- Spread across **your top 2-3 services**, so each service you list has proof.
- **At least 2 with a named brand** (or confidential + industry), so the "Clients" tab is not empty.
- **Strong covers**: one clear image, not a collage or a slide full of text. The PDF reader should prefer a picture crop over a text page as the cover.
- **Recent**: within 2 years. Ask for the year (optional, auto from Behance/Instagram dates), do not show it if missing.

The finished screen and the Studio meter should say one next step:
- "You have 1 project. Agencies with 3 get noticed more. Add 2 more." (registration phase wording, no ranking claim)
- "No project shows SEO yet. You list SEO; add one SEO project so requests for SEO can see your work."

Never let the meter itself change ranking; it only explains the real rules.

---

## 7. The gap between the wizard and `/studio/new`

They are two different forms over the same `posts` row:

| | Wizard step 4 | `/studio/new` |
|---|---|---|
| Text | Project name (required) + your part (required) | One description (optional) |
| Client | Its own step before, 4 modes, creates a client | Select of existing clients only |
| Services | Pre-ticked from profile, required | Pre-ticks "Graphic design", required |
| Platforms, industry, result, English, app | None | All shown |
| Cover choice / reorder | Yes | No (first file = cover) |
| Validation | Banner at top, off-screen on phone (shot 14) | Banner "Add at least one photo" |
| Ends with | Rights box, "Save my portfolio", not public | "Publish", visible per page visibility |
| Bulk | No | No (only the PDF/Behance importers are) |

An agency that learned the wizard meets a different form the second time. Worse, the wizard teaches "client first, then one project", and Studio teaches "photo plus caption, like Instagram". Pick one model and use one component. The Studio edit page can keep "More details" for the rare fields.

---

## 8. Ideal "Add your work" flow

Same flow for first run (after join, profile name and services already known) and for Studio.

**Screen 1 — "Show your work" (`اعرض أعمالك`)**
- Big drop zone / button: **"Choose photos or a PDF"** (`اختر صوراً أو ملف PDF`), sub-line "From your phone, Drive or WhatsApp. Pick as many as you like."
- One field: "Or paste a Behance link" (`أو الصق رابط Behance`).
- Tip line: "Your work is on Instagram? Save screenshots and pick them here."
- Nothing else. No step counter, no source cards.

**Screen 2 — "We made 6 projects. Check them." (`جهّزنا ٦ مشاريع. راجعها.`)**
Uploads continue in the background. A list of project cards, each:
- Cover + image strip (tap to reorder, star = cover, X = remove, "Move to…" / "Merge with previous").
- **Title** (prefilled, editable).
- **Services** chips (suggested; at least one; agency's own first).
- **For which brand? (optional)** type-ahead, prefilled when found. Switch **"Hide the name"** → shows **"What kind of business?"** chips.
- **What did you do? (optional)** one line, with tap-to-write chips.
- "More details" (closed): platforms, result, year, English, app.
- A switch to leave the card out.
Top of the list, only if found: "Use this as your logo?" and "Add these 4 brands to your clients?".
Errors appear on the card, in Arabic, next to the field. The publish button counts only valid cards ("Publish 5 of 6").

**Screen 3 (same screen, bottom) — publish**
- One tick: "I have the right to show these projects, and what I wrote is accurate."
- One choice: who can see my page (the three options of `/studio/publication`, short labels, default per docs/51).
- Button: **"Publish 5 projects"** / **"Save 5 projects privately"**.

**Done**
- "Your page has 5 projects." Buttons: "See my page", "Add more work". One nudge from section 6.

Click count, PDF of 12 pages, rules mode, no edits: choose (1) + pick file (1) + rights (1) + visibility (1) + publish (1) = **5 clicks to 4-6 public projects**, vs 19 clicks today for 1 public project. Photos path with 3 projects and a few fixes: about 10-12 clicks.

Arabic and mobile checks: drop zone and cards at 390px, RTL strip order (first image at start), every string in both message files, styled file picker (no native English text), no `left`/`right`.

---

## 9. Ranked changes

| # | Change | Impact | Effort | Risk | Notes |
|---|---|---|---|---|---|
| 1 | **One "Add your work" component** for first run and Studio; wizard steps 2-5 and `/studio/new` create mode both use it | Very high | L | Medium | Biggest single fix. Reuse the PDF review UI (`portfolio-import.tsx`) as the base: it already does multi-project review. Keep the server-saved draft from the wizard (resume after reload). |
| 2 | **One drop zone** (images + PDF) + "paste a Behance link"; cut the source cards, the social card, and 5 duplicate Behance/PDF boxes | High | M | Low | Removes the first dead end and the "which path?" decision. Redirect old import URLs. |
| 3 | **Client optional, after the images, in the card**; type-ahead creates it; "Hide the name" keeps it private and asks industry | High | S-M | Low (better privacy) | Removes a full required step. Matches how confidential work really works. |
| 4 | **Minimum = 1 image + 1 service**; title auto-filled; "What did you do?" optional with chips | High | S | Low-Med (thinner captions) | Fixes the Behance dead stop (shot 74). Quality comes back through nudges, not gates. |
| 5 | **Publish inside the flow**: one rights tick per batch + visibility choice on the same screen; button says the outcome | High | S | Medium (docs/51, docs/08) | Cuts 4 clicks and a page. Owner keeps the default; only the place moves. |
| 6 | **Bulk from photos**: group by file name / date / colour, one image = one project fallback, merge/move | High | M | Medium | Pure grouping functions in `lib/`, unit-tested. Works with no AI. |
| 7 | **Honest service defaults**: no pre-tick of "first service"; suggest from text; prompt to add a post's service to the agency list | Med-High | S | Low | Stops silent mislabels; closes the gap where work for a service the agency does not list can never be matched. |
| 8 | **Roll up post industries and platforms** as suggestions into `agencies.industries` / `agencies.platforms` | Medium | S | Low | Today these +5/+5 points come only from the 45-field profile form. Agency confirms; no ranking change beyond the existing weights. |
| 9 | **First-portfolio target**: "3 to look real, 5 for full match strength", one next step on finish and in the Studio meter | Medium | S | Low | Pairs with council-linkedin L1. Meter never ranks. |
| 10 | **Defer rare fields** (platforms, result, English, app) to "More details" and later nudges | Medium | S | Low | Shortens `/studio/new` from ~60 controls (shot 37) to ~6. |
| 11 | **Inline Arabic validation** on the field, scroll to it; no native bubbles, no generic banner | Medium | S | Low | Shots 03, 14; walkthrough §7. |
| 12 | **Instagram data-export import** (zip: media + captions + dates), no Meta app needed | Medium | M-L | Low | The realistic Instagram path while no developer app exists. Same review screen. |
| 13 | **Strip phones/emails from PDF text before the AI call**; keep "untrusted data" prompt | Low (risk cut) | S | Reduces risk | Contact pages and client lines go to the model today in `planWithAi`. |
| 14 | **Behance bookmarklet only on desktop** | Low | S | Low | Not usable on phones. |

## Non-negotiable check
- Arabic first, RTL, 390px: every screen above is one column, start-aligned, styled picker; strings in `ar.json` and `en.json`.
- Providers optional: every path (photos, PDF, Behance fixtures, grouping) works with rules only; AI only improves suggestions.
- No pay-for-relevance: nothing here touches the boost; the meter explains weights, it does not change them.
- AI and personal data: no client contact data to the model; strip phones/emails from PDF text; agency text stays untrusted.
- Consent: the rights acknowledgement stays (once per batch); hidden client names stay private, which needs a retention note in docs/08 if the name is stored but not shown.
