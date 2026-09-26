# 05 · «المنصات للجمهور. سوّق لمن يديرها.» — the Behind-the-Page movement

The launch plan (01) sells a marketplace. This brief adds the thing that makes people *want in*: an identity. Social media platforms are for the audience. The people who actually run brand pages — the managers, agencies and freelancers — have never had a place of their own. Sawwiq is that place, and membership is something to show off.

The owner's framing, kept as the internal north star: *we are the layer above the platforms, because we are where the people who run the platforms' most valuable pages live.* Said outward, it must be pride, not a claim: never "we control", always "we are the ones behind".

## 1. The idea in one line

**«وراء كل صفحة… شخص. وهالشخص على سوّق.»** — "Behind every page, there's a person. That person is on Sawwiq."

Master line for the movement: **«المنصات للجمهور. سوّق لمن يديرها.»** / "Platforms are for the audience. Sawwiq is for the ones who run them."

Hashtags: **#وراء_الصفحة** (movement), #سوّق (brand). English: #BehindThePage.

## 2. Why this creates hype (the mechanics, not the mood)

Hype needs three things: a reveal people are curious about, a status people want, and a loop that spreads on its own.

| Mechanic | What it is | Why it spreads |
|---|---|---|
| **The Reveal** («الكشف») | A member posts their *Behind-the-Page card*: "I'm the one behind @cafe, @clinic, @brand" — a card Sawwiq generates from the accounts they handle (the new Accounts feature, docs/28). | Every card tags 3–20 client pages. Clients repost ("meet the people behind our page"). One agency post reaches its clients' audiences, which are exactly the businesses we want. |
| **Client-confirmed** («مؤكَّد من العميل») | The client page confirms, via a link, that this agency runs it. Confirmed accounts get a badge on the agency page and on the card. | Turns bragging into proof, stops false claims, and gives the client a reason to engage publicly. It is also the moat: nobody else has a confirmed map of who runs what. |
| **Who runs this page?** («مين ورا هالصفحة؟») | A search on Sawwiq: type any Instagram/TikTok page you admire → see the agency behind it (when it's confirmed and public). | The business-side hook. It converts admiration into a hire, and it is a shareable, screenshot-able answer to a question every business owner asks. |
| **The Sawwiq 50** («سوّق ٥٠») | A yearly list per country: the 50 people/agencies behind the most pages, ranked by *confirmed* accounts and verified reviews, revealed at Agency Day. | A list is the oldest hype machine. People register to be eligible, invite clients to confirm to climb, and post when they make it. |
| **Member number** («عضو رقم») | Every agency page and card carries its member number in order of joining. | Scarcity that costs nothing: early numbers become a flex; late joiners want in before the number gets big. |

The loop: agency registers → adds accounts → asks clients to confirm → posts the card (#وراء_الصفحة) → clients repost → their followers search "who runs this page" → businesses hire, and other managers see the card and register to get a number.

## 3. Influencers: who, and what they do

Not lifestyle mega-influencers. Three groups that are credible for this story:

1. **The managers behind famous pages** (the real influencers of this movement). The person who runs a beloved restaurant page or a top clinic page. Invite them personally as *founding members* (numbers 1–40 per city, plan 01 §10). Their card is the first Reveal; their clients' repost is the first wave.
2. **Arabic marketing educators and creators** (accounts that teach marketing, freelancing, design; 20k–300k followers). Paid or partnered: one video each on "the people behind the pages", ending with "if you run pages, get your number". Disclosure «#إعلان» always.
3. **Business owners with loved pages** telling the other side: "this is who runs my page, and this is how I found them". Unpaid; comes from confirmation requests and the Agency Day stage.

What we never do: buy followers, seed fake cards, pay for reviews, or let anyone claim a page the client did not confirm.

## 4. Campaign arc (fits the 90-day plan in 01)

| Phase | When | Beats |
|---|---|---|
| **Seed** | W1–W4 (Amman supply) | Founding members get their numbers and cards privately. Build the confirmed map quietly: 30 agencies × ~8 accounts ≈ 250 confirmed pages. Teasers from the brand account: blurred cards, "who is behind this page?" polls. |
| **Reveal week** | W5 (launch week) | Day 1: founding members post cards at the same hour. Day 2–3: clients repost, creators' videos go out. Day 4: "Who runs this page?" search opens publicly. Day 5–7: business ads: «تعرف مين ورا الصفحات اللي بتحبها؟» ("know who's behind the pages you love?"). |
| **Climb** | W6–W12 | Weekly "page of the week" (a confirmed account and the person behind it). Leaderboard preview: "the Sawwiq 50 closes on {date}". Riyadh founding members repeat the seed. |
| **Ceremony** | W13 (Agency Day) | Sawwiq 50 announced on stage and as a shareable card per winner. Press angle: "the map of who runs the region's pages". |

## 5. Copy (both languages; dialect per 02 §3)

- Card headline: «أنا اللي ورا الصفحة» / "I'm the one behind the page"
- Card footer: «عضو رقم 0047 في سوّق» / "Sawwiq member No. 0047"
- Reveal caption (agency): «كل صفحة بتحبوها ورايها شخص بيسهر عليها. أنا ورا @cafe و@clinic و@brand. #وراء_الصفحة #سوّق»
- Client repost: «هدول اللي ورا صفحتنا 👋 شكراً @agency #وراء_الصفحة»
- Business ad: «بتحب صفحة معيّنة؟ اعرف مين وراها، وشوف شغلهم، واطلب عرض.» / "Love a page? Find who's behind it, see their work, ask for a quote."
- Movement line (creators): «المنصات للجمهور. سوّق لمن يديرها.»

Claim register additions (02 §8): "the ones behind" is descriptive and safe; "we control / we run social media" is **not allowed** in any asset (untrue as a corporate claim, antagonises the platforms that host our ads, and reads as arrogance to the businesses we sell to). Rankings say "by confirmed accounts and verified reviews", never "best".

## 6. What the product provides (built, docs/28)

1. **Behind-the-Page card**: `/api/card/{handle}` (story size), previewed on the studio home with Download and Share. Shows the agency, "I'm the one behind the page", the member number and up to 8 accounts with logos (confirmed first).
2. **Client confirmation**: Studio → Accounts → "Get the confirmation link" → the client taps once at `/confirm-account/{token}`. Confirmed accounts carry the badge everywhere and are the only ones the search answers with.
3. **Who runs this page?**: `/who-runs` (linked from the footer), handle or link in, the confirmed agency out; an empty answer invites the real manager to join.
4. **Member number** on every page header and card; **the Sawwiq 50** at `/sawwiq50`, per country, computed live from confirmed accounts, verified reviews and posts.

## 6b. Apps are work too (docs/37)

Agencies that build apps for businesses list **app development** as a service and post their apps as work: name, version, store links, and **Try the app**, which runs the real app in the owner's app mall sandbox inside Sawwiq. For the movement this adds a second kind of "behind": *behind every app a business uses, there's a builder — and they're on Sawwiq.* Reveal-week content: "the person behind the ordering app you use".

## 7. Measures

Cards posted (tracked by the share button), client confirmations, "who runs" searches → quote requests, registrations with source=#وراء_الصفحة, and the plan's KPIs (01 §6). The movement is working when businesses start their hire by typing a page they admire.
