# Council seat: competitor analysis of agency sign-up and portfolio flows (30 Oct 2026)

Seat: competitor analysis. Inputs: `docs/65-agency-onboarding-council.md`, `walkthrough.md`, the other seat reports, and web research done on 30 Oct 2026. Every claim has a link. Where a page was blocked (help.behance.net, help.fiverr.com, support.upwork.com, sortlist.co.uk/how-it-works returned 403 to our fetcher) the fact comes from search snippets or third parties and is marked **(not verified)**. Prices and fees change often; treat all numbers as "as of autumn 2026, check before quoting".

Sawwiq baseline (measured by the walkthrough): 12 screens, 19 clicks, ~32 fields shown / 15 required, to a public page with one project. Planned: 4 screens, ~9 clicks, ~14 fields.

## Summary in five lines

1. The portfolio networks (Behance, Dribbble) make **finishing = live**. Their publish gate is tiny: one image, a cover, a title, one category. Everything else is optional. Sawwiq's plan matches this; today's build does not.
2. The agency directories (Clutch, Sortlist, Entasher, Fiverr Agencies, Upwork agencies) all **review before listing** and ask for business facts (size, rates, min project, registration). They make money from agencies (sponsorship, per-lead fees, subscriptions). Their trust unit is the **verified client review**, not the portfolio.
3. Every closed marketplace (Khamsat, Mostaql, Ureed, Dribbble since March 2025, Entasher) **bans off-platform contact** because it takes a cut of the deal. Sawwiq's WhatsApp-first, no-commission stance is the opposite choice and is rare in the region. It should be said out loud on the landing page.
4. **Nobody serves Arabic agencies well.** Behance has 19 interface languages and Arabic is not one of them. Clutch lists 21 creative agencies in Amman, only 3 with reviews. Entasher has an Arabic site but is an RFQ directory with no portfolio. The Arabic-first portfolio with a matchmaker is an open slot.
5. The planned 4-screen flow is competitive on screens (Behance is about 5) but heavier on fields (~14 vs Behance's ~7) because Sawwiq needs WhatsApp, consent, 18+ and a password up front. That is acceptable. The changes worth making are inside the "show your work" screen and the "page is live" screen, not in the screen count.

---

## 1. Behance (primary)

### How onboarding works
Sign-up needs an Adobe ID (email, password, name, date of birth) or Google/Apple/Facebook login ([Behance help: Sign up](https://help.behance.net/hc/en-us/articles/204484934-Guide-Sign-Up-For-Behance), via search snippet). Behance **generates the username from the first and last name**; the user can change it later (same source). A short, skippable onboarding asks for location, headline, bio, links and creative fields; third-party walkthroughs list it as "set up profile → choose creative fields → upload first project" ([unil.ink guide, 2026](https://unil.ink/blog/how-to-use-behance-2026)). Nothing in the profile is required to publish a project.

### How a project is created
The project editor is a vertical canvas: upload images, text, video or embeds in any order ([Behance help: Create a project](https://help.behance.net/hc/en-us/articles/204483684-Guide-Create-Publish-A-Project), snippet). On "Continue" a settings modal asks for:
- **Cover image** (required; crop; 808×632 minimum recommended) ([Cover images](https://help.behance.net/hc/en-us/articles/204483484-Guide-Project-Cover-Image), snippet)
- **Project title** (required)
- **Creative fields** (required, at least one; the maximum is 3 **(not verified)**)
- Tags (optional), tools used (optional; Adobe tool galleries use them), description (optional), co-owners and credits (optional; each co-owner must accept the invite before appearing; co-owners get full edit and unpublish rights and the project shows on both profiles) ([Co-owning](https://help.behance.net/hc/en-us/articles/204483494-Guide-Co-owning-And-Crediting), snippet; [Adobe: Behance for teams](https://www.adobe.com/creativecloud/business/enterprise/behance-for-teams.html))
- Save as draft, or **Publish → live immediately**, no review.

Behance's own help says it plainly: "To publish a Project, you'll need to select a Cover Image, Project Title, and Creative Fields" (snippet from the Create a project page). Mobile apps follow the same order: upload → cover → title → creative field → tags → Publish ([Pratt design critique of the Android app, 2022](https://ixd.prattsi.org/2022/02/design-critique-behance-android-app/)). The 2022 critique's main complaint: the home screen had no "create your first project" cue.

**Count to a first published project (web, best case):** sign-up form (1 screen) → optional profile prompts (1, skippable) → editor (1) → publish modal (1) = **4 to 5 screens, ~8 to 10 taps, ~7 required fields** (email, password, name, birth date, 1+ image, cover, title, 1 creative field; the name/birth date are Adobe ID fields). Email verification happens in the Adobe account, not in the Behance flow **(not verified whether it blocks publishing)**.

### Teams (the agency equivalent)
Behance has no agency account type. A **Team page** is created from a personal profile: unique name, team URL, location, website, description, social links. Members add their own projects to the team; an admin confirms. Up to 100 members. "Only public Projects can be added to Teams." Included free ([Adobe: Behance for teams](https://www.adobe.com/creativecloud/business/enterprise/behance-for-teams.html); [Teams basics](https://help.behance.net/hc/en-us/articles/360034065094-Guide-Teams), snippet). Projects belong to people, never to the team.

### Discovery and curation
A human curation team picks projects for 100+ galleries daily. Rules that matter for Sawwiq ([Behance blog: How to get featured](https://www.behance.net/blog/how-to-get-featured-on-behance)):
- A project is reviewed **only the first time it is published**; "publish only when complete".
- **Projects with fewer than 3 images are not reviewed.**
- 5 to 15 images, ~1400 px wide, mockups welcome, cover without text.
- Pick the creative field that matches *your role*, not the whole project.
- Fewer, relevant tags beat long lists.
- "Shops, publishers or agencies are not featured unless the artist is listed as a collaborator."
Behance says galleries are chosen on quality, not on Pro status ([Behance blog: Behance Pro](https://www.behance.net/blog/behance-pro)).

### Hire, Services, Jobs and fees
- **Hire Me / availability:** the creative switches on "available for freelance / full-time"; the status shows next to the work and the profile appears on the Hire page ([Behance blog: Freelance proposals](https://www.behance.net/blog/freelance-proposals-on-behance)).
- **Services:** up to 25 service cards per profile, each with **price, timeline, number of concepts and revisions**, plus attached project images. Clients press **Inquire**; the creative answers with a proposal and an upfront percentage; payment runs through Stripe (or PayPal) ([Behance blog: Get hired with Services](https://www.behance.net/blog/get-hired-on-behance-with-services); [Behance facts](https://www.behance.net/facts)).
- **Jobs:** clients post a freelance job in 4 steps (describe → budget range → title + up to 3 categories + optional website/location → review and publish). Since Jan 2026 an AI drafts the listing from a one-line brief and recommends 10 freelancers. No posting fee stated ([Behance blog: Structured job posts, 20 Jan 2026](https://www.behance.net/blog/structured-job-posts)).
- **Fees:** platform fee on both sides, scaled by project size. Official FAQ example (snippet, [Fees FAQ](https://help.behance.net/hc/en-us/articles/10770324288923-FAQ-What-are-the-fees)): client 10% of the first $500 then 5.5%; freelancer 5% of the first $500 then 2%; Stripe 2.9% + $0.30 on top. **Behance Pro** (from $9.99/month on an annual plan, varies by country **(not verified)**) waives the platform fee for both sides and adds analytics, Adobe Portfolio sites, password/link-only projects, scheduled publishing and a badge ([Behance Pro FAQ](https://help.behance.net/hc/en-us/articles/23707936129947-Behance-Pro-FAQ), snippet; [Behance blog: Behance Pro, 13 Mar 2024](https://www.behance.net/blog/behance-pro)).

### What made it win
- Free, unlimited projects, no gate; 1M members and 3M projects when Adobe bought it in Dec 2012 ([TechCrunch](https://techcrunch.com/2012/12/20/adobe-acquires-social-media-platform-behance-to-power-its-creative-cloud-community-features/)); 50M+ members today ([Behance facts](https://www.behance.net/facts)).
- **Distribution where the work is made:** Adobe ID is the login, Photoshop/Illustrator/Premiere have "Publish to Behance", and Adobe Portfolio sites sync from Behance projects ([unil.ink guide](https://unil.ink/blog/how-to-use-behance-2026); [Behance blog: Behance Pro](https://www.behance.net/blog/behance-pro)). The designer never re-uploads.
- The project (a story of many images) as the atomic unit, with a human-curated front page. Credits and co-owners spread one project across several profiles for free.

### What designers complain about
- Low views and random reach: "projects barely reach 20 views", views dropping from thousands to hundreds; search placement despite correct tags ([Adobe Community, Nov 2024](https://community.adobe.com/t5/creative-cloud-services-discussions/my-behance-projects-are-getting-very-low-views-and-not-appearing-in-search/m-p/15581702/highlight/true); [InspoAI roundup, secondary](https://www.inspoai.io/blogs/behance-alternatives)).
- Opaque curation and Pro leads: a March 2026 thread asks whether badges follow follower count rather than craft, and reports Pro "leads" going silent for two weeks; no staff answer ([Adobe Community, Mar 2026](https://community.adobe.com/questions-712/seeking-transparency-behance-pro-leads-and-curation-criteria-1552525)).
- Spam flags and shadow bans with no explanation ([Adobe Community, Aug 2024](https://community.adobe.com/t5/creative-cloud-services-discussions/my-behance-project-has-been-marked-as-spam-for-the-second-time-no-word-from-behance/m-p/15179373/highlight/true)).
- **No Arabic interface** among 19 languages ([Behance about page](https://www.behance.net/about), language menu).

### Publish model, required vs optional, imports, mobile, money
- Publish model: **finish = live**, per project. Drafts exist. Profile is public from the start.
- Required: cover, title, ≥1 creative field, ≥1 image. Optional: everything else.
- Imports: Adobe apps publish directly; Lightroom/Portfolio sync; no PDF or Instagram import.
- Mobile: full publish flow in iOS/Android apps; "Work in Progress" posts from the camera ([Behance help: WIP from iOS](https://help.behance.net/hc/en-us/articles/360005904314-Guide-Sharing-a-Work-in-Progress-from-the-Behance-iOS-app), snippet).
- Who pays: creatives (Pro), both sides of a freelance job (platform fee), recruiters (Recruiter Pro). Browsing and listing are free.

### Lessons for Sawwiq
- **Take:** the three-field publish gate (cover + title + one field). Make the first image the cover by default. Auto-name the project.
- **Take:** "publish only when complete; fewer than 3 images is not reviewed" as a *nudge* on the page-strength meter, never a block.
- **Take:** availability as a first-class signal ("Hire Me" / available for work), and service cards with price + timeline + revisions as the first "make it stronger" step.
- **Take:** co-owners/credits: one project on two pages (agency + freelancer) is how Behance grew per project. Sawwiq's collaborate feature can do this later.
- **Avoid:** opaque curation. Sawwiq's score breakdown (`lib/matching/`) is already the opposite; show the agency its own breakdown.

---

## 2. Dribbble

### How onboarding works
Sign up (email, name, username, password, or Google/Apple), a short purpose question, then upload. Since 2018 anyone ("prospects") can upload; shots used to be invite-only ([Dribbble story, 2018](https://dribbble.com/stories/2018/08/22/more-pixels-and-a-perfect-crop)). Whether a drafting/invite gate still exists in 2026 is **(not verified)**.

### The shot
The atomic unit is a **shot**: one block-based page (image, text, video, gallery blocks), PNG/JPG/GIF up to 10 MB, video up to 20 MB, minimum width 1600 px recommended, no fixed ratio since 2018 ([Dribbble help: Creating shots](https://help.dribbble.com/en/articles/11062601-creating-dribbble-shots)). After "Continue" a "Final touches" modal asks for thumbnail crop, title, tags (up to 20, third party **(not verified)**), description, "publish as" team, and visibility. Publish → live immediately. Dribbble's own posting advice: specific title, description that names brief/client/outcome, focused tags, and **turn on "Available for Work" or you are "less likely to receive project requests"** ([Dribbble story, Feb 2026](https://dribbble.com/stories/2026/02/18/how-to-share-your-work-on-dribbble-while-attracting-the-right-clients)).

### 2024 to 2026 changes to freelance services
- Sept 2024: pivot to a marketplace; designers message freely but pay a revenue share on converted clients or buy Pro ([TechCrunch, Aug 2025](https://techcrunch.com/2025/08/04/a-top-designer-was-banned-from-dribbble-now-hes-building-his-own-competitor)).
- 17 Mar 2025 terms: no contact details or payment instructions on profiles, in shots or in messages until the client has paid on Dribbble; Dribbble auto-stripped offending fields on 31 Mar 2025; only paying "Designer Advertisers" may show phone, email, website or booking links ([Dribbble help: ToS update FAQ](https://help.dribbble.com/en/articles/11056584-dribbble-terms-of-service-update-faq-march-17-2025); [Dribbble story, 17 Mar 2025](https://dribbble.com/stories/2025/03/17/work-in-progress-part-9)). Offering Services and receiving Project Requests stays free.
- Enforcement: dozens of permanent bans, including a designer with 210k followers; the way back is advertising at $1,500/month for three months ([TechCrunch](https://techcrunch.com/2025/08/04/a-top-designer-was-banned-from-dribbble-now-hes-building-his-own-competitor)).
- Fees since 5 Feb 2026: designer platform fee 10% / 7% / 4% by bracket on Projects, flat 3.5% on Services; client fee 5% / 3.5% / 2% plus $2 under $100; 2.9% + $0.30 processing; annual Pro Standard and Pro Plus pay 0% ([Dribbble help: Project fees](https://intercom.help/dribbble/en/articles/11062173-dribbble-project-fees); [Pricing and payment terms](https://help.dribbble.com/en/articles/11062025-dribbble-pricing-and-payment-terms)).
- Plans: Pro Lite $4, Pro Standard $8, Pro Plus $99 per month billed yearly; Pro Plus is "Best for Agencies" with 3 team seats, 50 services, search ranking boost and $300/month of Boosted Shots ([dribbble.com/pro](https://dribbble.com/pro)). Note the explicit **paid ranking boost** and "Promoted Services" at a fixed rank. Hiring: Job board $150/month, Hiring Suite $300/month.

### Publish model, required vs optional, imports, mobile, money
- Publish model: finish = live. Required: one media file, title. Everything else optional.
- Imports: none (Figma plugin existed historically **(not verified)**).
- Mobile: the block editor is desktop-first; the iOS app is mostly for browsing **(not verified)**.
- Who pays: designers (Pro, platform fee, boosts), clients (platform fee), employers (job board).

### Lessons for Sawwiq
- **Take:** one media file + title is enough to post; the "Available for work" toggle as a ranking input.
- **Avoid:** locking contact details behind payment and banning off-platform contact. The 2025 backlash is the clearest recent proof that creatives read this as rent-seeking. Sawwiq's CLAUDE.md already forbids it; say it on the landing page.
- **Avoid:** paid ranking ("Plus boost", "Promoted Services at a fixed rank"). Sawwiq's capped, relevance-gated, labelled "Featured" is the right line; do not drift toward Dribbble's.

---

## 3. Clutch and Sortlist (agency directories)

### Clutch
**Onboarding:** choose Basic / Verified / Advertiser → sign in with LinkedIn, Google or company email → fill the company profile, "10 minutes or less": company name, tagline, number of employees, minimum project size, average hourly rate, website, location(s), contact information, company overview, service focus (percentages) → **Clutch's team reviews it before publishing** ([Clutch help: Get listed](https://help.clutch.co/en/knowledge/get-listed-on-clutch)). Free Basic profiles can edit location, industry, services and standard details; languages, time zones, social links and featured reviews need a paid product ([Clutch help: new fields](https://help.clutch.co/en/knowledge/how-do-i-update-new-fields), snippet).

**Trust = reviews.** Clients review online (LinkedIn login) for free, or by a phone interview run by Clutch staff, which is only offered to Clutch+, sponsoring or featured providers; staff edit the transcript; reviews are checked against identity and work history ([Who conducts phone interviews](https://help.clutch.co/knowledge/who-conducts-phone-interviews); [How Clutch verifies reviews](https://help.clutch.co/knowledge/how-clutch-verifies-reviews), snippets). The first review comes from a "vendor reference form" the agency submits.

**Verification is paid.** You must buy Clutch Verified or advertising first, then submit company registration number, phone, email, HQ address, legal entity name; Clutch checks a CreditSafe score (A to E) and legal filings. "Premier Verified" needs 3+ reviews (one in 12 months), 3.0+ average, low to moderate credit risk ([Clutch help: Get verified](https://help.clutch.co/knowledge/get-verified)). Verification is removed if sponsorship ends ([Failed verification](https://help.clutch.co/en/knowledge/failed-clutch-verification), snippet).

**Money:** sponsorship is sold **per directory page**; price "varies by level of sponsorship and the number of pages"; not published ([How much does sponsorship cost](https://help.clutch.co/knowledge/how-much-sponsorship-cost)). Clients pay nothing.

**Jordan check:** Clutch lists **21 creative agencies in Amman**; only 3 cards show a rating; cards show size, location, min project size and hourly-rate band; no sponsored labels on the page but a general "we may earn a fee for some placements" ([clutch.co/jo/agencies/creative](https://clutch.co/jo/agencies/creative)).

### Sortlist
**Onboarding:** free listing; "create an agency profile, add your previous works and get reviewed by your clients"; a **Profile Quality Index** scores completeness; no minimum headcount ([Sortlist: how it works for agencies](https://www.sortlist.co.uk/how-it-works/agency), snippet, page blocked; [Sortlist provider help index](https://intercom.help/sortlist/en/collections/65591-agencies)). Help topics include "how to centralise client reviews from other sources" and "embed Sortlist reviews on your website".

**Money:** clients pay nothing; agencies pay **per accepted opportunity**, priced by "the level of qualification and engagement of the client we were able to verify", from a credits wallet; plus an optional daily visibility budget and a Sortlist+ subscription ([Does the client pay](https://intercom.help/sortlist/en/articles/1714412-does-the-client-pay-for-your-service); [Opportunity page](https://www.sortlist.co.uk/providers/opportunity), snippet). Third-party figures (€129 to €189/month, up to €650 per opportunity) are **(not verified)**.

**Complaints:** "a lot of credits have to be used, which quickly makes the cost per lead very high"; leads "only marginally qualified"; leads delivered by email with no CRM hooks ([G2 reviews](https://www.g2.com/products/sortlist/reviews); [Trustpilot](https://ca.trustpilot.com/review/www.sortlist.com)). One French agency praises lead quality ([Sortlist story](https://www.sortlist.fr/story/canal-web)). Mixed, as expected for pay-per-lead.

### Publish model, required vs optional, imports, mobile, money
- Publish model: **review before listing** (Clutch), listing on completion with a quality index (Sortlist). Neither has a portfolio editor worth the name; "works" are a few images with a title.
- Required: business facts (size, rates, min project, locations, services). Optional: works, team, languages.
- Imports: Sortlist imports reviews from other sources; neither imports portfolios.
- Mobile: desktop forms; the owner fills them at a desk.
- Who pays: agencies only (sponsorship per page; per-lead credits; subscriptions).

### Lessons for Sawwiq
- **Take:** the review request as a product step. Clutch's first review comes from a reference form the agency fills; Sortlist has "request a review" in its getting-started guide. Sawwiq's "page is live" screen should carry **"Ask a past client for a review"** with a WhatsApp message template, next to "Share on WhatsApp".
- **Take:** the business facts clients filter on (team size band, starting price, min project) as *optional* page-strength items with a clear "clients filter by this" reason. Not at sign-up.
- **Avoid:** paid verification and paid phone reviews. Verification that disappears when you stop paying is not trust. Sawwiq's `isVerified` (commercial registration, staff-set, +3 points, optional) is the right shape.
- **Avoid:** per-lead fees. Sortlist's reviews show the exact resentment ProFinder created.

---

## 4. Fiverr Pro / Fiverr Agencies and Upwork agencies (service-first)

### Fiverr
**Seller onboarding:** profile (photo, description, languages, skills) then a **gig**: "I will …" title, category and subcategory, search tags, three price packages with delivery time and revisions, description and FAQ, buyer requirements, a gallery (images, video, PDF) → Publish. New sellers get a limited number of active gigs (4 or 7, sources conflict **(not verified)**) and a short visibility boost on a fresh gig; most wait weeks for a first order ([Fiverr community threads](https://community.fiverr.com/public/forum/boards/support-and-troubleshooting-by1/posts/306905-new-sellers-and-gigs); [third-party 2026 guide](https://eduearnhub.com/?p=5496)). Fiverr's 20% seller commission is widely published but we could not open the help page **(not verified here)**.

**Fiverr Pro:** application open to anyone, category-specific, free, with portfolio links and work history; a Pro applicant creates a separate account tied to the application email ([Fiverr help: How to become a Pro freelancer](https://help.fiverr.com/hc/en-us/articles/29453001296913-How-to-become-a-Fiverr-Pro-freelancer), snippet). Acceptance rates quoted online range from 1% to 15% **(not verified)**.

**Fiverr Agencies (launched Feb 2024):** for "established companies with a team of in-house experts, a solid online presence"; **only sellers whose main gig is in Digital Marketing or Programming & Tech** may apply; agency profile shows team members and past projects; branded card image 1280×776; **the display link cannot be changed later**; **Fiverr staff review before approval**, and you are told "approved and live" or "minor adjustments needed" ([Fiverr help: agencies onboarding requirements](https://help.fiverr.com/hc/en-us/articles/21836241851409-Fiverr-agencies-onboarding-requirements), snippet; [Fiverr help: agencies](https://help.fiverr.com/hc/en-us/articles/29454085707409-Fiverr-agencies), snippet; [Fiverr news, Winter release 2024](https://www.fiverr.com/news/winter-product-release-2024)).

### Upwork agencies
Created **from an approved freelancer account**; the agency URL slug is permanent; choose **Agency Basic ($0, cannot bid, Enterprise invites only)** or **Agency Plus (~$19.99 to $20/month, bids, Connects at $0.15 each)**; add logo, tagline, overview, services, **hourly rate, at least one service and a primary location** (Upwork's own minimum per search snippet of [Upwork resources](https://www.upwork.com/resources/how-to-craft-an-impressive-agency-profile-on-upwork)); review 1 to 3 business days; service fee variable 0 to 15% per contract ([GigRadar guide, 2026](https://gigradar.io/blog/upwork-agency-account); [Upwork resources: Agency Plus](https://www.upwork.com/resources/agency-plus), snippet). A zero-review agency is filtered out by clients using "Top Rated / 90%+ JSS" filters; the standard advice is to move one live contract to the agency to seed a review (GigRadar).

### Publish model, required vs optional, imports, mobile, money
- Publish model: gig live on publish (Fiverr, with content checks); **agency profiles are staff-approved** on both platforms.
- Required: a priced service with delivery time (Fiverr); hourly rate + one service + location (Upwork). Portfolio optional on both.
- Imports: none.
- Mobile: Fiverr seller app can create gigs; Upwork agency setup is desktop.
- Who pays: sellers (commission, Pro, Connects, Plus), buyers (service fee).

### Lessons for Sawwiq
- **Take:** the "first order" framing. Fiverr and Upwork both know a profile with zero activity is invisible, so they push a first small, cheap transaction. Sawwiq's equivalent is the **first quote sent** (or first WhatsApp click). Track it as the activation event, not the published page.
- **Take:** service = what + from price + in N days. One such card is worth more to a client than a bio. Keep it optional, but make it the first "stronger" step with those three fields only.
- **Avoid:** manual approval before anything is visible. Fiverr's community threads are full of agencies waiting on review. Live first, moderate asynchronously (duplicate-image queue from the growth seat).
- **Avoid:** a permanent slug chosen at sign-up. Both Fiverr and Upwork lock it; both get complaints. Auto-generate, allow one change before first publish, and redirect the old handle after.

---

## 5. Regional: Mostaql, Khamsat (Hsoub), Ureed (ex-Nabbesh), Entasher, Campaign ME

### Khamsat (Hsoub; fixed-price micro-services, Arabic-first)
Sign up, add a service (title, description, $5 units, delivery time, image, category); **support staff review every service before it shows to buyers**; commission $1 of every $5 (20%) taken from the seller ([Khamsat: how it works](https://khamsat.com/how), snippet). Vague titles ("design anything") and non-compliant images are the top rejection reasons ([Khamsat community](https://khamsat.com/community/general/316554)). Terms: no agreeing to deal outside the site; offering to pay outside or "insisting on external communication without need" are listed violations; account frozen or closed; the 14-day guarantee applies only to in-site deals ([Khamsat terms](https://khamsat.com/terms), snippet). Native RTL Arabic UI; mobile web.

### Mostaql (Hsoub; project bidding)
Free account by email or Google; profile with specialty, skills, bio, portfolio samples ("أرفق نماذج أعمال حقيقية في ملفك الشخصي قبل التقديم"); bid on open projects; escrow ("نظام ضمان"); commission taken at withdrawal; official rate not reachable, third parties quote 10 to 15% **(not verified)** ([wdeftksa guide](https://www.wdeftksa.com/sa/guides/mostaql); [jobbers.io comparison](https://www.jobbers.io/arabic-speaking-freelance-platforms-compared-in-2026-complete-analysis/)). Portfolio is a flat list of samples, not projects.

### Ureed (acquired Nabbesh in June 2020)
Free to join; email must be verified before you can send a proposal; profile goes through an **automated review**; bio, skills, roles and portfolio feed an AI match; **15% fee from the freelancer** on completion; escrow; cards plus "regional payment methods"; min withdrawal $100 bank / $70 e-wallet; **platform and mobile apps fully in Arabic**; proposals containing contact details or links are hidden; keep communication on Ureed; agencies go through "Ureed Enterprise" by contact ([Ureed FAQ](https://ureed.com/en/faqs/); [Wamda on the Nabbesh deal](https://www.wamda.com/index.php/en/2020/06/wamda-invests-freelance-marketplace-ureedcom)).

### Entasher (Cairo, 2018; RFQ directory, 19 countries including Jordan)
Clients post a tender (goal, timeline, budget range, references, decision criteria); "only verified, matching agencies receive requests"; answers in 2 to 5 working days; **"لا تتواصل مباشرة مع الشركات"** (do not contact companies directly), message buttons only, no WhatsApp. Agency sign-up form: first name, last name, email, company phone with country code, company name, password (7 fields, no portfolio, no logo at sign-up). Arabic site exists at `/ar` ([entasher.com](https://entasher.com/); [entasher.com/ar](https://entasher.com/ar); [agency sign-up](https://agency.entasher.com/createaccount)). Fees and verification steps not public.

### Campaign Middle East agency guide (print/online directory)
Free basic listing by email: agency name, type, year founded, head of company, 50-word bio, key clients, email, up to five services, office location; needs a business licence and an office in the country ([Campaign ME call for listings 2026](https://campaignme.com/call-for-listings-in-campaigns-creative-media-agency-guide-and-map-2026/); [Saudi report 2024](https://campaignme.com/call-for-listings-in-campaigns-saudi-report-2024/)). Paid upgrades for the online directory and map.

### No Jordan-specific Arabic agency marketplace was found
Searches in Arabic and English surfaced Clutch's Jordan pages, Entasher (Egypt-first) and Campaign ME (UAE-first). Nothing Arabic-first with portfolios and a request flow. Treat this as the gap, not as proof it does not exist.

### How Arabic-first platforms handle RTL onboarding, WhatsApp and payment
- RTL: Khamsat, Mostaql and Ureed are built RTL-first with Arabic error messages; Ureed also ships Arabic apps. Behance, Dribbble, Clutch and Sortlist have no Arabic UI.
- **WhatsApp:** none of them offer it. All ban off-platform contact because their revenue is a 15 to 20% cut of the deal. Sawwiq is the only model in this set where WhatsApp is the intended channel. That is a selling point *and* a measurement problem (see change 5 below).
- Payment: all hold escrow, all take a commission, withdrawals via PayPal/bank/Payoneer with minimums. Sawwiq's "never holds client money; payments off until docs/10 triggers" is unusual and should be explained to agencies in one sentence, because they will assume a cut.

### Lessons for Sawwiq
- **Take:** Khamsat's rejection reasons as **inline guidance**: a specific project name ("Rose Boutique · Brand identity", not "designs"), and a compliant cover. Their review queue exists because the form did not teach; Sawwiq's form can.
- **Take:** Ureed's "verified email before you can send a proposal" (not before you can publish). Matches the growth seat's non-blocking email link.
- **Avoid:** staff review before a service is visible (Khamsat) and contact bans. Both are revenue protection, not quality.
- **Say it:** "Clients contact you on WhatsApp. No commission." is a real difference from every Arabic platform an agency has used. Put it on the landing and on the "page is live" screen.

---

## Comparison table

| Platform | Screens / taps to first published work (best case) | Required fields to publish | Imports | Publish model | Who pays | Trust signals |
|---|---|---|---|---|---|---|
| **Behance** | ~4–5 screens, ~8–10 taps | email, password, name, birth date (Adobe ID); 1 image, cover, title, 1 creative field (~7–8) | Publish from Photoshop/Illustrator/Premiere; Adobe Portfolio sync | Finish = live, per project; drafts | Creatives (Pro $9.99+/mo), both sides of freelance jobs (scaled fee), recruiters | Curated galleries, appreciations/views, Pro badge, client reviews after paid jobs, co-owner credits |
| **Dribbble** | ~4 screens, ~8 taps | email, name, username, password; 1 media file, title (~6) | None | Finish = live | Designers (Pro $4/$8/$99 per mo, fees 0–10%, boosts), clients (2–5%), employers ($150–300/mo) | Likes/views, Pro badge, "Available for work", reviews after paid projects; paid rank boosts |
| **Clutch** | 3 steps, "10 minutes", then staff review (days) | company name, tagline, employees, min project, hourly rate, website, location, contact, overview, service focus (~10) | None (reviews collected by Clutch) | Review before listing | Agencies only: sponsorship per page, Clutch Verified, Clutch+ (prices on request) | Verified client reviews (phone interviews for payers), paid Verified badge with CreditSafe check, rankings |
| **Sortlist** | Profile + works + reviews; quality index; listed on completion | name, location, services, description; works and reviews raise the index (**not verified** which are hard-required) | Reviews from other sources | List on completion; quality-indexed | Agencies only: per accepted opportunity (credits), visibility budget, Sortlist+ | Client reviews, Profile Quality Index, "verified" client briefs |
| **Fiverr (seller/Pro/Agencies)** | Profile + 1 gig, ~5–6 screens; agencies: staff review | gig title, category, tags, 3 packages (price, days, revisions), description, gallery (~9); agencies: team, branded image, categories limited | None | Gig live on publish (content checks); agency approved by staff | Sellers (20% commission **not verified here**), buyers (service fee), Pro free | Orders, ratings, seller levels, Pro badge, "established" vetting for agencies |
| **Upwork agency** | From a freelancer account; plan choice; 1–3 day review | hourly rate, ≥1 service, primary location, name, overview (~5–6) | None | Staff review (1–3 days); Basic cannot bid | Agencies (Plus ~$20/mo, Connects $0.15, 0–15% fee), clients (fees) | Job Success Score, Top Rated tiers, earnings history, reviews |
| **Khamsat** | Account + 1 service; **staff review** before visible | title, description, price units, delivery time, image, category (~6) | None | Review before live | Sellers (20%) | Ratings, levels, 14-day guarantee, in-site-only deals |
| **Mostaql** | Account + profile; bid per project | specialty, skills, bio; samples advised (~4) | None | Profile live; work comes from bids | Freelancers (10–15% **not verified**) | Ratings, completed projects, escrow |
| **Ureed** | Account, email verification, automated profile review | bio, skills, roles, portfolio samples; verified email to propose (~5) | None | Automated review, then visible | Freelancers (15%) | Ratings, AI match, escrow, in-platform only |
| **Entasher** | 7-field sign-up; verification by staff (**not verified** how) | first/last name, email, company phone, company name, password | None | Verified before receiving requests | Agencies (model not public), clients free | "Verified" label, request routing |
| **Sawwiq today** | 12 screens, 19 taps | 15 | PDF, Behance (6 entry points) | **Finish = private**; separate publication page | Nobody yet | Founding badge, WhatsApp/phone on page; `isVerified` later |
| **Sawwiq planned (docs/65)** | 4 screens, ~9 taps | ~14 (name, WhatsApp, email, password, terms, 18+, 1 image, project name, 1 service, publish box; handle/city preset) | Photos, PDF, Behance (2 entry points) | **Finish = live** (one box) or "keep private" link | Nobody; later buyers first (docs/10) | Founding badge, page strength, reviews later |

---

## Verdict on the planned 4-screen flow

**Competitive, and on the right side of every fork.** Four screens is where Behance and Dribbble sit; every directory and every Arabic marketplace is slower because it reviews first. Sawwiq's ~14 required fields are about double Behance's, but the extra ones are the ones Sawwiq cannot drop (WhatsApp, consent with version, 18+, password; Behance hides its equivalents inside the Adobe ID). The gap between Sawwiq and the field is not screen count. It is three things the plan should borrow: a **three-item publish gate** inside the work screen, an **availability + review request** on the "live" screen, and a **plain statement of the no-commission, WhatsApp-direct model** that no competitor in the region offers.

Where Sawwiq is already ahead: Arabic RTL (nobody in the portfolio tier has it), PDF import (nobody has it), finish = live without staff review (no directory has it), a score breakdown the agency can read (Behance's curation is a black box), and no pay-for-rank (Dribbble sells it openly).

## What docs/65 should change or add

Concrete, in build-order terms. Field names in `snake_case` are suggestions for the Zod schema; Arabic labels are first drafts for `messages/ar.json`.

1. **Stage 3, "show your work": adopt Behance's publish gate exactly.** Minimum to publish a project = `cover_image` (first upload, "اجعلها الغلاف" to change) + `title` (auto-filled "<Brand> · <Service>", editable) + `services[]` with **1 to 3 per project** (Behance caps creative fields; it keeps tags honest for matching). `contribution` ("What did you do?") becomes optional with starter chips. Show the Behance curation rule as a nudge under the strip: "٣ صور أو أكثر تظهر أفضل في البحث" (3+ images rank better), never as a block.

2. **Stage 2, join: handle policy from Fiverr/Upwork's mistake.** Auto-generate `handle` from the name (Behance does this), allow it to be changed freely **until first publish**, then one more change with a 301 redirect from the old handle. Say "يمكنك تغييره قبل النشر" under it. Never a permanent slug chosen at sign-up.

3. **Stage 4, "your page is live": add two buttons the directories live on.** (a) `availability` toggle, default on, label "متاح لمشاريع جديدة" (Behance Hire Me, Dribbble "Available for work"; both say unavailable profiles get fewer requests); store `available_until` optional; feed it into `matchReady()` as a freshness input, not a score. (b) **"اطلب تقييماً من عميل سابق"**: a WhatsApp share with a prefilled Arabic message and a signed review link (Clutch's reference form, Sortlist's review request, done the Sawwiq way). First reviews are the trust unit every directory sells; Sawwiq can collect them for free from day one.

4. **Stage 5/6, "make it stronger": order the steps the way clients filter.** First step = one **service card**: `service`, `price_from` (JOD), `delivery_days`, optional `revisions` (Behance Services and Fiverr packages use exactly these). Second = `team_size_band` and `min_project_jod` (the two fields every Clutch card shows). Third = logo and intro. Each with a one-line "why": "العملاء يرشّحون بهذا" (clients filter by this). Keep all optional.

5. **Landing and "live" screen copy: state the model competitors cannot.** One line, both locales: "العملاء يتواصلون معك مباشرة على واتساب. بدون عمولة." (Clients contact you directly on WhatsApp. No commission.) Every Arabic platform an agency has used takes 15 to 20% and bans WhatsApp; Dribbble's 2025 ban wave shows what the opposite costs. Because WhatsApp hides the transaction, add the growth seat's funnel events now: `wa_click` and `quote_sent` without personal data, and define activation as **first quote sent or first WhatsApp click within 7 days of publish**, not "page published".

6. **Stage 3, imports: meet the work where it is (Adobe's lesson, done for Jordan).** Behance won because Photoshop had "Publish to Behance". Jordanian agencies' work lives in the phone gallery, WhatsApp and Instagram. Add a PWA `share_target` so "Share → Sawwiq" from Photos or WhatsApp opens the add-work screen with the images already in the strip; it needs no provider and no developer app. Keep Behance as one text line ("أو الصق رابط Behance") and the bookmarklet desktop-only, as the portfolio seat says.

7. **Do not add:** staff approval before a page is visible (Clutch, Fiverr Agencies, Upwork, Khamsat, Entasher all do it; it is why they are slow), paid verification, paid rank, per-lead fees, or any contact ban. The growth seat's asynchronous duplicate-image queue and optional commercial-registration badge cover trust without those.

## Open questions this seat could not settle
- Behance's exact caps (creative fields per project, tags) and whether Adobe ID email verification blocks publishing: help.behance.net blocked our fetcher. Worth a 5-minute manual check on a phone before Stage 3 copy is final.
- Fiverr's current new-seller gig limit and commission; Mostaql's current commission; Sortlist's prices. All marked above.
- Whether any Jordan-only Arabic agency directory exists offline (chambers, Campaign ME's Jordan coverage). Nothing found online.

## Sources

Behance: [Sign up](https://help.behance.net/hc/en-us/articles/204484934-Guide-Sign-Up-For-Behance) · [Create a project](https://help.behance.net/hc/en-us/articles/204483684-Guide-Create-Publish-A-Project) · [Cover images](https://help.behance.net/hc/en-us/articles/204483484-Guide-Project-Cover-Image) · [Co-owning](https://help.behance.net/hc/en-us/articles/204483494-Guide-Co-owning-And-Crediting) · [Teams](https://help.behance.net/hc/en-us/articles/360034065094-Guide-Teams) · [Behance for teams (Adobe)](https://www.adobe.com/creativecloud/business/enterprise/behance-for-teams.html) · [How to get featured](https://www.behance.net/blog/how-to-get-featured-on-behance) · [Get hired with Services](https://www.behance.net/blog/get-hired-on-behance-with-services) · [Freelance proposals](https://www.behance.net/blog/freelance-proposals-on-behance) · [Structured job posts](https://www.behance.net/blog/structured-job-posts) · [Behance Pro](https://www.behance.net/blog/behance-pro) · [Pro FAQ](https://help.behance.net/hc/en-us/articles/23707936129947-Behance-Pro-FAQ) · [Fees FAQ](https://help.behance.net/hc/en-us/articles/10770324288923-FAQ-What-are-the-fees) · [Facts](https://www.behance.net/facts) · [About](https://www.behance.net/about) · [TechCrunch 2012](https://techcrunch.com/2012/12/20/adobe-acquires-social-media-platform-behance-to-power-its-creative-cloud-community-features/) · [unil.ink guide 2026](https://unil.ink/blog/how-to-use-behance-2026) · [Pratt critique of Android app](https://ixd.prattsi.org/2022/02/design-critique-behance-android-app/) · [Adobe Community: low views](https://community.adobe.com/t5/creative-cloud-services-discussions/my-behance-projects-are-getting-very-low-views-and-not-appearing-in-search/m-p/15581702/highlight/true) · [Adobe Community: Pro leads and curation](https://community.adobe.com/questions-712/seeking-transparency-behance-pro-leads-and-curation-criteria-1552525) · [Adobe Community: spam flag](https://community.adobe.com/t5/creative-cloud-services-discussions/my-behance-project-has-been-marked-as-spam-for-the-second-time-no-word-from-behance/m-p/15179373/highlight/true)

Dribbble: [Creating shots](https://help.dribbble.com/en/articles/11062601-creating-dribbble-shots) · [ToS update FAQ, Mar 2025](https://help.dribbble.com/en/articles/11056584-dribbble-terms-of-service-update-faq-march-17-2025) · [Work in progress part 9, Mar 2025](https://dribbble.com/stories/2025/03/17/work-in-progress-part-9) · [Project fees](https://intercom.help/dribbble/en/articles/11062173-dribbble-project-fees) · [Pricing and payment terms](https://help.dribbble.com/en/articles/11062025-dribbble-pricing-and-payment-terms) · [dribbble.com/pro](https://dribbble.com/pro) · [Sharing work to attract clients, Feb 2026](https://dribbble.com/stories/2026/02/18/how-to-share-your-work-on-dribbble-while-attracting-the-right-clients) · [TechCrunch, Aug 2025](https://techcrunch.com/2025/08/04/a-top-designer-was-banned-from-dribbble-now-hes-building-his-own-competitor) · [2018 upload change](https://dribbble.com/stories/2018/08/22/more-pixels-and-a-perfect-crop)

Clutch: [Get listed](https://help.clutch.co/en/knowledge/get-listed-on-clutch) · [Get verified](https://help.clutch.co/knowledge/get-verified) · [Failed verification](https://help.clutch.co/en/knowledge/failed-clutch-verification) · [Sponsorship cost](https://help.clutch.co/knowledge/how-much-sponsorship-cost) · [Who conducts phone interviews](https://help.clutch.co/knowledge/who-conducts-phone-interviews) · [How reviews are verified](https://help.clutch.co/knowledge/how-clutch-verifies-reviews) · [New fields](https://help.clutch.co/en/knowledge/how-do-i-update-new-fields) · [Jordan creative agencies](https://clutch.co/jo/agencies/creative)

Sortlist: [How it works for agencies](https://www.sortlist.co.uk/how-it-works/agency) · [Provider help index](https://intercom.help/sortlist/en/collections/65591-agencies) · [Does the client pay](https://intercom.help/sortlist/en/articles/1714412-does-the-client-pay-for-your-service) · [Opportunity product](https://www.sortlist.co.uk/providers/opportunity) · [G2 reviews](https://www.g2.com/products/sortlist/reviews) · [Trustpilot](https://ca.trustpilot.com/review/www.sortlist.com) · [Canal Web story](https://www.sortlist.fr/story/canal-web)

Fiverr and Upwork: [Fiverr agencies onboarding requirements](https://help.fiverr.com/hc/en-us/articles/21836241851409-Fiverr-agencies-onboarding-requirements) · [Fiverr agencies](https://help.fiverr.com/hc/en-us/articles/29454085707409-Fiverr-agencies) · [Fiverr Winter release 2024](https://www.fiverr.com/news/winter-product-release-2024) · [Become a Fiverr Pro freelancer](https://help.fiverr.com/hc/en-us/articles/29453001296913-How-to-become-a-Fiverr-Pro-freelancer) · [Fiverr community: new sellers](https://community.fiverr.com/public/forum/boards/support-and-troubleshooting-by1/posts/306905-new-sellers-and-gigs) · [Upwork: agency profile guide](https://www.upwork.com/resources/how-to-craft-an-impressive-agency-profile-on-upwork) · [Upwork: Agency Plus](https://www.upwork.com/resources/agency-plus) · [Upwork support: About agencies](https://support.upwork.com/hc/en-us/articles/360009528034-About-Agencies) · [GigRadar agency guide 2026](https://gigradar.io/blog/upwork-agency-account)

Regional: [Khamsat: how it works](https://khamsat.com/how) · [Khamsat terms](https://khamsat.com/terms) · [Khamsat community: service tips](https://khamsat.com/community/general/316554) · [Mostaql guide (wdeftksa)](https://www.wdeftksa.com/sa/guides/mostaql) · [Arabic platforms compared 2026 (jobbers.io)](https://www.jobbers.io/arabic-speaking-freelance-platforms-compared-in-2026-complete-analysis/) · [Ureed FAQ](https://ureed.com/en/faqs/) · [Wamda: Ureed acquires Nabbesh](https://www.wamda.com/index.php/en/2020/06/wamda-invests-freelance-marketplace-ureedcom) · [Entasher](https://entasher.com/) · [Entasher Arabic](https://entasher.com/ar) · [Entasher agency sign-up](https://agency.entasher.com/createaccount) · [Campaign ME agency guide 2026](https://campaignme.com/call-for-listings-in-campaigns-creative-media-agency-guide-and-map-2026/) · [Campaign ME Saudi report 2024](https://campaignme.com/call-for-listings-in-campaigns-saudi-report-2024/)
