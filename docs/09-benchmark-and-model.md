# 09 · Benchmark Platforms and the Showcase Model

Written September 2026. This document **supersedes the request-for-proposal (RFP) flow** in `03-product-spec.md` for the first release. The brief-and-proposals flow stays in the backlog for when there is traffic.

## 1. The closest existing concepts

| Platform | What it is | How supply and demand meet | How it makes money | What we take from it |
|---|---|---|---|---|
| **Houzz** | Visual feed of home-design projects plus a directory of professionals | Homeowners browse photos, filter pros by service and location, contact them from the profile | Houzz Pro subscription for premium profile and tools (estimated ~$149–399/month), advertising add-on from ~$499–685/month ([Capterra](https://www.capterra.com/p/199689/Houzz-Pro/pricing/), [Fervor Studio](https://fervorstudio.ca/news/houzz-pro-review-pricing-alternatives/)) | **The closest match.** Portfolio posts are the content, the directory is the filter layer, contact is the conversion |
| **Dribbble** | Instagram-like grid of design "shots" | Clients browse shots, open a designer profile, hire | Pro subscription $4–99/month; 3.5% platform fee waived for higher tiers; designer advertising ([Dribbble fees](https://help.dribbble.com/en/articles/11062173-dribbble-project-fees), [Fastlancer](https://www.fastlancer.org/en/fastlancer-blog/dribbble-review/)) | Grid-first visual discovery; paid tiers that remove friction rather than lock basics |
| **Behance** (Adobe) | Portfolio network for creatives | Browse projects, hire the creator | Behance Pro from $9.99/month removes platform fees ([Behance help](https://help.behance.net/hc/en-us/articles/10770324288923-FAQ-What-are-the-fees)) | Free for all at scale, then a Pro tier |
| **Contra** | Commission-free freelance network with portfolio feed | Portfolio + direct hire | Contra Pro $29/month for ranking boost and analytics; client contract fee ([Contra](https://contra.com/commission-free), [Memvers](https://memvers.com/for-freelancers/platforms/contra)) | "0% commission" as a growth promise; charge for visibility and analytics |
| **Thumbtack / Bark** | Local services lead marketplaces | Customer posts a need; pros pay to respond | Pay-per-lead via credits, typically $15–75 per lead ([Bark vs Thumbtack](https://datalatte.pro/blog/bark-vs-thumbtack-local-business), [Auto-Respond](https://auto-respond.com/blog/thumbtack-cost-per-lead-2026/)) | Lead pricing works only once lead volume and quality are proven. Credit expiry backlash is a warning |
| **Instagram** | The interface every agency and SME already uses daily | Follow, browse, DM | Free for users; paid promotion (ads) | The interface: stories strip, feed, grid profile, likes, saves, follow |
| **app-mall (your developer platform)** | Feed of running apps, developer profiles | Scroll, try, subscribe | Plans (free/starter/growth/scale), first-party promoted listings, commission | Cursor-paged feed, "strip" with bounded paid slots, house ads only, no prices set before traffic |

## 2. The model: "Instagram for agencies"

Agencies already market themselves on Instagram, but a business owner cannot filter Instagram by *service, city, platform, industry or budget*, and cannot tell a real agency from a reseller. The platform is Instagram's interface with those gaps closed.

**Who has an account.** Only agencies and freelancers who offer social media services. Business owners browse without an account. Likes, saves and follows are tied to an anonymous browser cookie so there is zero sign-up friction on the demand side.

**Content unit.** A **post** is a piece of work: one to ten images, a caption, the services it shows, the client's industry, the platform it ran on, and an optional result ("+180% reach in 30 days").

**Surfaces.**

| Surface | Instagram equivalent | Purpose |
|---|---|---|
| Home feed | Home | Newest work from all agencies, full-width cards |
| Agencies strip | Stories row | Round avatars of active and newly joined agencies. Later: bounded paid slots |
| Explore | Explore | Grid of posts with filters (service, city, platform, industry, budget, verified) and search |
| Agency profile | Profile | Header with stats, bio, service chips, **WhatsApp / Call / Message** buttons, grid of posts, about tab |
| Post page | Post | Image carousel, caption, tags, like, save, share, contact the agency |
| Saved | Saved | Posts and agencies the visitor saved or followed |
| Studio | Professional dashboard | Agency edits profile, publishes posts, reads messages, sees insights |
| Admin | — | Verify agencies, handle reports, run promotions, see platform stats |

**Tweaks versus Instagram, and why.**
1. **Filters everywhere.** Discovery is the product.
2. **Contact is the primary action.** WhatsApp is how Jordanian businesses buy services, so it is the biggest button. Every contact click is counted, because it is the value agencies will later pay for.
3. **Structured tags on posts.** Service, industry and platform tags power filters and SEO pages.
4. **"Starting from" price on profiles.** Removes the biggest buyer anxiety.
5. **Verified badge** means the platform checked the commercial registration, not follower count.
6. **No comments.** Comments add moderation load and give competitors a place to fight. Likes and saves carry the social proof.

## 3. What was deliberately left out of v1

- Buyer accounts, direct messaging threads, briefs and proposals (the old RFP flow)
- Stories that expire, video uploads, comments
- Payments and escrow

Each is additive later without changing the data model.
