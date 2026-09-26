# 28 · Agency introduction, countries served, and portfolio clients

## Introduction and strengths

Studio → Profile has, besides the one-line bio:
- **Introduction** (up to 1,500 characters): who the agency is, how it works, what it excels at. Shown at the top of the About tab under "About us".
- **Strengths** (up to 6 short points, one per line; leading "-" or "•" is removed). Shown on the About tab as a checklist under "What we do best".

## Countries served

An agency is based in one country (from its city) and prices in that country's currency. In Studio → Profile it can tick **other countries it takes clients in** (quick buttons: all Gulf, all, clear). Stored in `agencies.serves_countries`.

- **Listings.** In a country's Explore, feed, hire pages, AI matcher and sponsored slots, agencies based there come first, then agencies that serve it (`inCountry()` in `lib/data/agency-filters.ts`). A city filter still means agencies in that city.
- **The note.** Wherever such an agency appears outside its home country it says so: "🇯🇴 Based in Jordan · takes clients in 🇸🇦 Saudi Arabia" (`lib/serves-note.ts`). Its own page lists the countries it serves in the header and in About.
- **Prices.** The matcher never compares a budget with a price in another currency: an agency from another country counts as "price unknown" for budget fit.

## Portfolio clients

Studio → **Clients** lists the businesses the agency works for. For each client:
- name, business type, country, what the agency did for it;
- **the accounts the agency runs for it**: as many rows as needed, each a type (Instagram, TikTok, Facebook, YouTube, X, Snapchat, LinkedIn, website, Google Maps, other link) and the account name (`@name`) or a pasted link. A new client starts with empty Instagram, TikTok, Facebook and website rows; "Add another account" adds more.

Links are checked (`lib/social-links.ts`): a handle becomes the network's profile address; a pasted link must be on that network's domain (an Instagram row can't hold another site); websites must be http(s). Up to 20 accounts per client and 60 clients per agency.

When publishing or editing a post, the agency can pick **Client (optional)**. On the agency's page, a **Clients** tab (shown once it has clients) groups everything by client: the accounts as tappable chips opening the real profiles (`rel="nofollow noopener ugc"`), the description, and thumbnails of the work tagged with that client. A tagged post shows "For {client}" under it.

Data: table `portfolio_clients` (links as JSON), `posts.client_id` (set to null if the client is deleted; the posts stay). Migration `0009_portfolio_clients.sql`.

## Accounts: an agency's work grouped by the client it handles

Each portfolio client is an **account** the agency handles, and the agency's work falls into two kinds:
- **work filed under an account** (`posts.client_id` set): on the agency's page it is grouped, not spread through the grid;
- **standalone work** (no account): shown as ordinary posts.

What visitors see:
- **Work tab.** First the accounts: one tile per account with published work (`accountTiles()`): the latest post's picture as a cover, the account's logo, its name and how many posts. Then the standalone posts (`feedPage({ agencyId, standalone: true })`).
- **Account page** `/a/{handle}/c/{clientId}`: the logo, name, business type and country, what the agency did, the real accounts it runs (Instagram, TikTok, website…), and every post filed under it (`feedPage({ agencyId, clientId })`). Pressing an account anywhere (tile, Clients tab, a post's "For {account}" line) opens it.
- **Posts.** A post filed under an account carries the account's logo and name ("For {account}") linking to its page, in the feed and on the post page.

The agency side:
- Studio → Clients: each account has a **logo** (any picture; stored square like an agency avatar, `portfolio_clients.logo_key`, migration `0014_client_logos.sql`), besides its links and description.
- New post / edit post: **Account (client)** files the post under an account.
- PDF import (docs/36): logos cut out of the PDF become accounts, and each draft names the account it belongs to; the guide at the top of the review says what is still unsorted.

## Client confirmation, "Who runs this page?", member numbers and the Sawwiq 50

The Behind-the-Page movement (marketing/05) needs proof, not claims:

- **Client confirmation.** Studio → Accounts → "Get the confirmation link" makes a private link (`portfolio_clients.confirm_token`) the agency sends the client (copy, or WhatsApp with a ready message). The client opens `/confirm-account/{token}` (no sign-in; not indexed), sees the account and the agency, and taps "Yes, {agency} runs this page" → `confirmed_at` is set. The account then shows **"Confirmed by the client"** on the agency's page, the account page and the card. The agency can withdraw a confirmation (which also voids the link). A visitor may confirm at most 10 links an hour.
- **Who runs this page?** (`/who-runs`, `lib/data/who-runs.ts`): type a handle or paste a profile link; the answer is the agency (or agencies) whose client **confirmed** that account, with a link to the account page. Unconfirmed listings never appear, so nobody can claim a page they don't run. Demo agencies appear only in the demo view. An empty answer invites the person who does run it to join.
- **Member number**: the founding seat (`agencies.founding_seat`, docs/39), given to real providers in the order they joined and never reused; shown on the page header and the card as "Member No.". Demo agencies have none.
- **The Behind-the-Page card** (`components/profile/behind-card.tsx`): a 1080×1920 card (story size) with the agency's picture and name, "I'm the one behind the page", the member number, and up to 8 accounts with logos (confirmed first, ticked). It is drawn by the browser (so Arabic is shaped and the layout mirrored exactly as on the site) and rasterised to PNG on the device by `modern-screenshot` when the agency presses Download or Share on the studio home (Web Share with the file where supported; otherwise a download). No server image rendering: the server-side renderer could not lay out Arabic acceptably.
- **The Sawwiq 50** (`/sawwiq50`, `lib/data/top.ts`): the visitor's country, real agencies only, ranked by confirmed accounts, then verified reviews, then posts. Computed live; never edited by hand; the page says how it is ranked.

## Demo data

`lib/db/demo-profiles.ts` gives several demo agencies an introduction, strengths, countries served and made-up clients (marked "demo"). It runs once per database (`demo_profiles_v1` flag): locally with `npm run db:seed`, live with Actions → Maintenance → **seed-demo**.
