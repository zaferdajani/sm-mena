# The feed: business-type tags and the phone swipe feed

## Business-type tags

Every post carries the business type it was made for: `posts.industry`, one of the taxonomy's `business_types` (restaurants and cafés, clinics, retail, real estate and so on; `lib/business-types.ts`). Agencies pick it in the post form.

- **On each post**, a tag with a small picture (for example «🍽️ مطاعم ومقاهي») opens the feed with only that type (`components/post/business-tag.tsx`).
- **Above the feed**, chips ("All" first) filter it by type: `/feed?type=restaurant_cafe` (`components/feed/business-type-bar.tsx`). An unknown type is ignored.
- **Sponsored posts obey the filter.** In a feed narrowed to one type, a sponsored post must be of that type too (`injectPromotions`). Paid placement adds priority, never relevance.

## Phones: one post per screen

Phones get a TikTok-style feed (`components/feed/reel-feed.tsx`, `components/post/reel-card.tsx`). The server picks it from the user agent (`deviceOf`), so the page never switches layout after loading. Tablets and desktops keep the Instagram-style card list.

Why TikTok-style rather than Instagram cards: one full-screen post per swipe puts every piece of work in front of the visitor. A single thumb movement always brings something new, and this is the pattern with the strongest "one more" pull. It suits a portfolio showcase whose content is visual.

How it works:
- The page itself scrolls and snaps (`html.reel-snap`), so the header, the type chips and the bottom bar stay put. Each post fills the space between them (`--reel-h`, measured from `[data-app-header]`, `[data-reel-bar]` and `[data-app-nav]`).
- The work fills the screen, whole: nothing is cropped, and a blurred copy of the same image fills the edges. Swipe sideways for the other photos of a post.
- The agency, business tag, caption (tap to expand), result, hashtags and a WhatsApp button sit over a shade at the bottom. The logo, like (with count), save and share sit in a column at the side. Double-tap likes, with a heart burst.
- After the third post, a full-screen card invites visitors to the AI matchmaker, to Explore, or to join as an agency. The page's `h1` stays in place for search engines, visually hidden.
- A "swipe up" hint shows once per session, until the first real swipe.
- The next page loads two screens ahead.

## Tests

- `tests/unit/feed-types.test.ts`: every type has a picture; the type filter; sponsored posts respect it.
- `tests/e2e/feed.spec.ts`: chips filter the feed (sponsored posts included); phones get snapping full-screen posts, the hint and double-tap like; desktops keep the cards.
