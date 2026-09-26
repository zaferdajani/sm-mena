# 30 · Services as tags, freelancers, and partners

## Services are tags

Every service is a numbered tag (`service_tags`, integer `id`). The vocabulary starts from a researched catalog, `data/service-catalog.json`:
- **246 services** in 9 groups (social media, paid ads, creative production, branding, digital and e-commerce, offline and events, strategy and research, web and app development, PR);
- names in Arabic and English, and aliases with Gulf and Levant spellings, transliterations and abbreviations (ريلز، موشن، سوشيال، قوقل، SEO، UGC، CTWA…);
- the **roles** that deliver each service (photographer, videographer, media buyer, 25 roles in all);
- a **parent**: the closest of the 28 core services (`lib/taxonomy.ts`).

The catalog is rebuilt with `python3 scripts/gen-service-catalog.py`. Built-in tags are written to the database after every migration (`syncServiceCatalog`, run by `npm run db:migrate` and the seed).

**Picking services** (sign-up, Studio → Profile): type part of a name in Arabic or English and pick a suggestion (`components/service-picker.tsx`; letter variants and diacritics are ignored). Choosing a detailed service also adds its core parent, so hire pages, Explore filters and the matcher still find the agency.

**A service that isn't in the list**: "Add “…” as a new service". It is saved as a **pending** tag with the text as typed and shows in the agency's studio as waiting for review, but not on its public page. The same text typed by another agency joins the same proposal; text that matches a tag's name or alias exactly becomes that tag.

**Admin → Services** (permission `agencies.moderate`, with a badge for waiting items) lists each proposal and the agencies that used it:
- **Approve**: Arabic and English names, group, closest main service, roles and other spellings. It becomes a tag (`key` from the English name) and moves onto every agency that typed it.
- **Merge**: into an existing tag. The typed text becomes an alias of that tag, so the next person who types it finds the tag.
- **Reject**: removed from the agencies. Every decision is written to the audit log.

Approved custom tags are loaded into the vocabulary on each server instance (cached for a minute) and passed to the browser by the locale layout (`ServiceRegistry`).

## Agencies and freelancers

`agencies.kind` is `agency` or `freelancer`. At sign-up and in Studio → Profile:
- **An agency** ticks **who it has in its team** (the main roles). At sign-up, the key roles it doesn't have become the roles it's **looking for partners for**; it can change these in the studio.
- **A freelancer** (photographer, videographer, designer, writer, content creator…) ticks **what they do**.

Freelancers show a "Freelancer" badge on their page and in lists, and appear in Explore like agencies.

## Partners

**Studio → Partners** (badge for requests received) shows:
- **Suggested for you**: freelancers and agencies in the same country, or that serve it, whose team roles, or the roles behind their services, cover what the agency is looking for. Ranked by how many roles they cover, then published work, freelancer, same city, verified and rating. Filter by one role with the chips. People you already work with or have asked aren't suggested again.
- **Request partnership**: pick the roles and add a short note. The other side gets a notification.
- **Requests to you**: accept or decline. Once accepted, both see each other's WhatsApp and email under "Your partners". The work itself can be put in writing with a contract (Studio → Contracts).

Tables: `partner_requests` (one open request per pair); `agencies.team_roles`, `seeks_roles`, `pending_services`. Migration `0010_services_and_partners.sql`.

## Demo data

`DEMO_ROLES` in `lib/db/demo-profiles.ts` gives several demo agencies team roles and roles sought, and makes a few of them freelancers (Madaba Pixels, Salt Stories, Abha Trails). It runs once per database (`demo_roles_v1`): Actions → Maintenance → **seed-demo**.

## Later

- Partner contracts with protected payments between two agencies (the hiring agency as the client).
- Suggest partners automatically when an agency receives a request it can't fully cover.
