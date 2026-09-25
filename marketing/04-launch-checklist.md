# Launch checklist

Tick in order. **Owner** items need the founder: logins, money, legal. Nothing gets posted or published without owner approval.

## 1. Handles to reserve: @sawwiq everywhere (Owner, day 1)
Use one company Google Workspace address (e.g. social@sawwiq.org) and a password manager. Turn on 2FA everywhere. Fallbacks in order if `sawwiq` is taken: `sawwiq.ar`, `sawwiqapp`, `sawwiq_ar`.

| Platform | Handle | Profile picture | Cover / banner | Bio (AR · EN) |
|---|---|---|---|---|
| Instagram (Business) | @sawwiq | mark on limestone, 1080² | none (use Highlights covers) | «أول منصة عربية لوكالات التسويق 🇯🇴🇸🇦 شوف الشغل قبل ما تدفع 👇» ("The first Arabic marketplace for marketing agencies 🇯🇴🇸🇦 See the work before you pay 👇") · "The first Arabic marketplace for marketing agencies" |
| Facebook Page | /sawwiq | same | `SWQ-cover-facebook-1640x624` | same |
| TikTok (Business) | @sawwiq | same | none | «وكالتك المناسبة بدقيقة 👀» ("The right agency, in a minute 👀") |
| Snapchat (Public Profile) | sawwiq | same | `SWQ-cover-snapchat-tiktok-1080x1920` | «تبي وكالة تسويق؟ شف شغلهم قبل لا تدفع» ("Want a marketing agency? See their work before you pay") |
| X | @sawwiq | same | `SWQ-cover-x-1500x500` | same as Instagram |
| LinkedIn Company Page | /company/sawwiq | same | `SWQ-cover-linkedin-company-1128x191` | "The first Arabic marketplace for marketing agencies. Free showcase and client requests for agencies." |
| Founder LinkedIn | (personal) | own photo | `SWQ-cover-linkedin-personal-1584x396` | Founder, Sawwiq |
| YouTube | @sawwiq | same | `SWQ-cover-youtube-2560x1440` | channel trailer = V02 hero 16:9 |
| Threads | @sawwiq (created with Instagram) | same | none | same |
| WhatsApp Business | company number (not a personal one) | same | none | catalog: "For businesses" / "For agencies" links |
| Google Business Profile | "Sawwiq · سوّق" (service-area business, Amman) | same | none | categories: Marketing agency; Internet marketing service |

Profile picture file: `marketing/assets/sting/` end frame, or `public/assets/brand/mark.png` on limestone. Keep the mark inside the circular crop.

## 2. Ad accounts: setup order (Owner + me)
1. **Meta Business Manager** → verify the business (commercial registration) → verify the domain `sawwiq.org` **by DNS TXT** (no site code) → create an ad account in **JOD**, time zone Asia/Amman → add payment method → Page + Instagram connected. Warm up for 2 weeks at ≤ 5 JOD/day before scaling.
2. **Google Ads** → account in JOD → link Search Console → Search campaign only at first (no display network). Verify the advertiser early; identity verification can take days.
3. **LinkedIn Campaign Manager** → Page → "Agency owners Jordan" matched audience.
4. **TikTok Business Center** → ad account (JO; add KSA later) → verify the domain by DNS.
5. **Snapchat Business** (from W6) → ad account in SAR for KSA → Public Profile.
6. **X Ads** (Growth scenario only).
7. **Supermetrics** (already connected in this workspace) → link each ad account for the weekly dashboard.

## 3. Pixels and tags: what the site needs
`docs/10` says "No third-party ad scripts, ever", and PDPL consent applies. **I have not changed any tracking code.** The logo intro was your explicit request and is on this branch. Recommended, in order (decision #2):
1. **Search Console and Bing Webmaster**, via DNS TXT. No code; pending since `docs/18`.
2. **Full UTMs.** Extend `components/page-tracker.tsx`, which today stores only `utm_source`, to also store `utm_medium`, `utm_campaign`, `utm_content` and the click IDs (`fbclid`, `gclid`, `ttclid`, `ScCid`). Store them first-party on the session only.
3. **Server-side conversion events** at these points: `match_completed`, `request_submitted`, `whatsapp_click`, `agency_signup_started`, `agency_page_published`, `contract_signed`. Send them to:
   - Meta Conversions API
   - Google Ads offline conversion import (gclid)
   - TikTok Events API
   - Snap Conversions API

   Send event name, time, click ID and value only. **No email or phone** unless the owner approves hashed identifiers behind a consent checkbox. That also needs a new consent version and a `docs/08` note.
4. **Keys** (Meta, TikTok and Snap access tokens) go in Vercel environment variables, never in chat or in the repo. The feature must be optional and off by default, as `CLAUDE.md` requires for every provider.
5. **No browser pixels** (Meta Pixel, TikTok Pixel, gtag) unless the owner reverses the `docs/10` policy. That would need a consent banner first.

## 4. Before the first paid post (approvals)
- [ ] **Owner:** legal sign-off on «أول منصة عربية لوكالات التسويق» ("the first Arabic marketplace for marketing agencies"). Keep the evidence file.
- [ ] **Owner:** confirm the Founding offer terms (free Pro for how long?).
- [ ] **Owner:** confirm the guarantee fee shown to agencies at launch (0% or 10%).
- [ ] **Owner:** choose voice-over voices by ear:
  - business voice: Yara (female, Levantine-light)
  - Saudi voice: Orion (male)

  Recast if you prefer. Every film also works muted with captions.
- [ ] **Owner:** approve the logo sting and sonic logo (brand lock). Once approved it is never regenerated.
- [ ] Native reviewer per dialect: one Jordanian, one Saudi. They read every caption aloud.
- [ ] Replace «حسابات تجريبية» (demo accounts) UI footage with real agencies once 30 are live, and re-record with `marketing/tools/`.
- [ ] Health vertical: Ministry of Health and syndicate advertising rules. No medical claims; the business owner is the hero, not a treatment.
- [ ] Payments: **HOLD** V09, V12 and M3 until a licensed PSP is live in Jordan and has passed the CBJ check.
- [ ] Re-measure "in a minute" on production with the live AI provider (`AI_PROVIDER`).
- [ ] Merge this branch's landing intro, or not (decision #1). It is on `claude/marketing-campaign`, not on `main`.
- [ ] Google Search Console and Bing verified.
- [ ] Landing pages: every ad goes to `/ar`, `/ar/match`, `/ar/explore` or `/ar/join` with UTMs. Test at 390 px width.

## 5. Launch week run-sheet (W5)
- **Sunday 12:00:** hero film live on Instagram, Facebook, TikTok, YouTube, LinkedIn and X; press note to 12 outlets; WhatsApp status.
- **Sunday to Tuesday:** reply to every comment within 4 working hours; daily 10-minute KPI check.
- **Wednesday:** first creative review (hook rate, 3 s view rate ≥ 25%, CTR ≥ 1%, cost per match session); cut the bottom third of ads.
- **Thursday:** Chamber or JEDCO webinar.
- **Saturday:** week report to the owner (template: spend, results, learnings, next week).
