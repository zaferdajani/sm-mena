# 47. Import from Behance

Many agencies, designers and photographers already keep their portfolio on Behance. Studio → New post → "Have a Behance portfolio?" (or `/studio/import/behance`) pulls it into Sawwiq:
- one post per project, with the project's images, a caption from its description, services from its creative fields and tags, and the client named in its title or text;
- the introduction, website, services and page picture from the Behance profile, offered for the About tab.

As with the PDF import (docs/36), the provider reviews everything and nothing is written until they press Publish. Every imported post keeps a **credit link to its Behance project**, shown under the post.

## Where a new provider meets it

The import is offered as the quick start everywhere a new provider decides how to begin, so nobody rebuilds a portfolio by hand that already exists (`components/studio/behance-shortcut.tsx`):
- the join page says up front that a Behance portfolio carries over (`join-behance`);
- the profile welcome straight after joining shows the shortcut card with the import button and a PDF alternative (`welcome-behance`);
- the packages welcome offers it next to "skip and post your first work" (`packages-behance`);
- the studio setup list leads with it until the first post exists (`setup-behance`);
- on New post, Behance is the first, highlighted way in, the PDF import second.

All of it follows the `portfolio_import` switch: off or "soon" hides every entry point.

## Where the data comes from

Behance closed its public API to new applications years ago, so there is no key to apply for. The import reads what Behance publishes for everyone:

1. **The profile's RSS feed** (`behance.net/feeds/user?username=…`): the official list of a profile's recent projects with title, link, summary, cover and date.
2. **Each project page**: Behance ships its page state as JSON inside the HTML. `lib/behance/parse.ts` walks that JSON for the project object (its image modules, creative fields, tags, owners and publish date) and takes the largest rendition of each image. When the state is missing or its shape changed, the page's Open Graph tags still give the title, description and cover, so the import degrades to covers only, never to a failure.
3. **The profile page**: display name, website, bio, picture, fields and every link on it.

A single project link works too (`behance.net/gallery/{id}/…`): that one project is read and its owner's profile is looked up.

Limits (`BEHANCE_LIMITS`): 12 projects per read, 10 images per post, 4 MB per page, 10 MB per image, 12 s per request, 12 reads an hour per agency.

## When Behance won't answer the server: the browser path

Behance's edge throttles cloud addresses: from a datacenter, every request (feed, profile, project) can come back **429** for hours, whatever the user agent. The import reports that as "Behance is limiting reads" and offers the other way in, which no throttle can touch, because it runs in the provider's own browser:

1. On `/studio/import/behance` the provider drags the **Send to Sawwiq** button to the bookmarks bar (`lib/behance/handoff.ts` builds it: a `javascript:` link bound to this site's origin).
2. They open one of their projects on behance.net and click the bookmark. It opens the Sawwiq import tab (`?handoff=1`), waits for that tab to say it is ready, and posts the page's `application/json` state blobs and Open Graph tags to the Sawwiq origin only.
3. The import tab accepts messages from `behance.net` origins only and sends the payload to `previewBehanceHandoffAction`, which rebuilds a page and runs the same parsers (`portfolioFromHandoff`). The project's owner object inside the state carries the profile's website and links, so ownership is still checked. Then the same review and the same publish: the server still downloads the kept images from Behance's CDN.

No password, no extension, nothing installed; one project per click. Whether the CDN also throttles image downloads from Vercel is not yet known: if it does, the publish step reports "an image couldn't be read" and the PDF import remains the fallback.

## Guarantees

- **Nothing leaves behance.net.** Every request goes through `lib/behance/fetch.ts`, which refuses any host other than `behance.net` and its subdomains (the image CDN is `mir-s3-cdn-cf.behance.net`), follows redirects only within Behance, and caps every body. Image links found in a page are dropped unless they are Behance-hosted, so the server never downloads from a third host.
- **Same pipeline as an upload.** Kept images are downloaded by the server and go through `processImage`; the profile picture through `processAvatar`. The post is created with `createPostFromProcessed`, dated with the project's Behance publish date so the portfolio reads in order.
- **Ownership.** The review says whether the Behance profile points back at the provider: its website domain matches the agency's website, it links to the provider's Sawwiq page (`sawwiq.org/a/{handle}`), or it links to the same Instagram handle. Unverified is a notice, not a block: a provider may simply not have filled the website field. Every post carries its Behance link, so credit is visible either way. Reads and imports are audited (`behance_import.read`, `.post`, `.apply`).
- **Feature switch.** The same `portfolio_import` switch as the PDF import (docs/34).

## Mapping (`lib/behance/map.ts`, pure and unit-tested)

- Services: Behance creative fields and tags first ("Branding" → `brand_identity`, "Photography" → `photography`, "Motion Graphics" → `motion_graphics`, "Web Design"/"UI/UX" → `web_design`, …), then the words of the title and description through the same keyword and catalog matching as the PDF import. At most four; the agency's first service when nothing matched.
- Client: `Client: …` in the description, or the title's pattern ("Rose Café | Branding", "Branding for Rose Café"). It becomes an account on the Clients tab (docs/28), matched to an existing one by name.
- Platforms and industry: the matchmaker's keyword extraction over the text.
- Profile: bio as introduction and website only when the agency has none yet; services the Behance work names that the agency doesn't list; the picture on request.

## Tests

- `tests/unit/behance.test.ts`: link parsing, host allow-list, feed and page parsing (including the Open Graph fallback and a foreign image URL being dropped), mapping, ownership, loading from saved pages, the browser handoff, the bookmarklet's origin binding, and publishing through the real image pipeline with the credit link and the original date.
- `tests/e2e/behance-import.spec.ts`: the whole flow in the browser against saved pages (`BEHANCE_FIXTURES=tests/fixtures/behance` in the e2e environment): a wrong link is refused, two projects are proposed, one is trimmed and published, the post shows on the page under its client with its Behance link; and the browser path, where a page message from a behance.net origin becomes a draft and one from any other origin is ignored.

The saved pages in `tests/fixtures/behance/` mirror Behance's shapes (a store-state JSON blob, a page without state, a feed with a picture-less item). When Behance changes its markup, refresh those fixtures from a real profile and adjust `parse.ts`; the Open Graph fallback keeps production working meanwhile.
