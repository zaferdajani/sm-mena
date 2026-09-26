# 39 · Pre-launch teaser (`/soon`)

A public page for providers: agencies, freelancers, content creators,
influencers, photographers, designers and anyone else whose service helps on
social media. It builds excitement and sends them to `/join`. It does **not**
explain the business model (requests, quotes, protected payments). The home page
is unchanged; `/soon` is the link to use in the pre-launch campaign
(`marketing/05-prelaunch-plan.md`).

- Route: `app/[locale]/(landing)/soon/page.tsx` (no app shell). Arabic RTL by default, full English at `/en/soon`. Listed in the sitemap.
- Copy: the `Teaser` namespace in `messages/ar.json` and `messages/en.json`.
- Live numbers: `teaserStats()` (`lib/data/teaser.ts`) counts **real, active** providers. Demo agencies never count (docs/31). `summariseProviders()` (`lib/teaser.ts`, unit-tested) groups them by country and city. The city wins when it disagrees with the stored country.
- Map: a tile map of the eight served countries (`components/teaser/provider-map.tsx`), laid out west to east and never flipped for RTL. The shade grows with each country's count. A country with no providers shows "first place open". Bars list countries and the top eight cities.
- Social proof: the hero shows the total only once it reaches `TEASER_MIN_PROOF` (25). Below that it says the first places in every city are still open. Both are true at any count.

## Honesty rules for this page
- Counts are real registrations only. Never seed, pad or round them up.
- "Free for now": registering and building a page cost nothing today. Don't promise free forever; pricing follows docs/10.
- Reach: "millions of consumers in 8 Arab countries" rests on population, about 180 million in total (Jordan ~11.5 m, KSA ~35 m, UAE ~10.7 m, Kuwait ~4.9 m, Qatar ~3.1 m, Bahrain ~1.6 m, Oman ~5.3 m, Egypt ~107 m; latest official estimates). It is potential audience, not traffic. Don't state visitor numbers until analytics show them.
- No launch date or countdown until the owner sets a date.
- No testimonials, logos of real brands or people's likenesses.
- No new personal data: registration is the existing `/join` flow (docs/08).
