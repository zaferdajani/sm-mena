# 10 · Monetization — Free Now, Paid Later

**Launch rule: everything is free for everyone.** The platform earns nothing until traffic proves value. The code already carries the switches, so turning revenue on is a configuration change, not a rebuild.

## 1. What we measure from day one

These numbers are the price list later. Without them nothing can be sold honestly.

| Event | Why it matters |
|---|---|
| Profile views, post views | Reach an agency gets from the platform |
| Contact clicks by channel (WhatsApp, call, email, website, Instagram) | The conversion agencies will pay for |
| Inquiries sent through the message form | Highest-intent leads |
| Likes, saves, follows | Social proof and ranking signals |

Each agency sees its own numbers in Studio → Insights. Admin sees totals.

## 2. Revenue streams, in the order to switch them on

| # | Stream | Model | Benchmark | Switch-on trigger |
|---|---|---|---|---|
| 1 | **Promoted posts and profiles** | Agency pays to appear in a clearly labelled "Sponsored" slot in the feed, the agencies strip, or at the top of an explore filter (for example "Instagram ads, Amman"). First-party only, no ad networks | Instagram ads; Houzz advertising; app-mall house ads | ≥ 20,000 monthly visitors |
| 2 | **Pro plan** | Monthly subscription: verified fast-track, higher post limit, full insights history, boosted ranking, custom profile link, "Pro" badge | Contra Pro $29/mo, Behance Pro $9.99/mo, Dribbble Pro $4–99/mo | ≥ 150 active agencies and median ≥ 10 contact clicks per agency per month |
| 3 | **Business plan** | Pro plus team seats, lead export, priority in strip, monthly performance report | Houzz Pro tiers | ≥ 20 Pro agencies asking for more |
| 4 | **Pay per lead (optional)** | Inquiry details unlocked per lead for non-subscribers | Thumbtack/Bark $15–75 per lead | Only if inquiry volume is high and subscriptions stall. Never expire credits |
| 5 | **Data and sponsorships** | Annual "State of Social Media Pricing in Jordan" report; brand/telco/bank sponsorship of categories | — | Year 2 |

### Suggested launch prices (validate before charging)

| Plan | Price (JOD / month) | Limits when monetization is on |
|---|---|---|
| Free | 0 | 12 posts, 30 days of insights, standard ranking |
| Pro | 19 | Unlimited posts, 12 months of insights, ranking boost, Pro badge |
| Business | 49 | Pro + 3 team seats, lead export, priority strip placement |
| Promoted post | from 5 JOD / day | One sponsored slot rotation per placement |

Jordanian agencies already pay 800–2,500 USD per month in retainers from each client (`02-market-research.md`), so one extra client pays for years of Pro.

## 3. Rules that protect trust

- Sponsored content is always labelled "مُموَّل / Sponsored".
- At most **one sponsored item after every six organic** items in the feed, one in the strip after two organic, one at the top of an explore result.
- Only verified, active agencies can be promoted. Eligibility is checked when the slot is served.
- Never promote an agency to a visitor on that agency's own profile.
- No third-party ad scripts, ever.

## 4. How it is built (already in code)

| Setting | Where | Effect |
|---|---|---|
| `MONETIZATION_ENABLED=false` | environment | Every agency gets unlimited entitlements; no prices shown |
| Plans and limits | `lib/monetization/plans.ts` | Single source of truth for plan names, prices and limits |
| `entitlementsFor(agency)` | `lib/monetization/entitlements.ts` | Every limit check goes through this function |
| Promotions table | database | Admin creates promotions (free pilot now); feed, strip and explore inject them with the rules above |
| Plan per agency | Admin → Agencies | Admin can grant Pro manually (founding members) |

Turning on revenue later means: set the flag, connect a payment provider (see `08-legal-compliance.md`), and add a checkout page. The limits, badges and sponsored slots already work.
