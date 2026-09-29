# 51 · Admin statistics count real data only

Owner decision (28 Sep 2026): the admin dashboard and Admin → Statistics show actual activity only. No demo data, no padding.

Left out everywhere (`lib/data/real-data.ts`):

- **Demo agencies** (`is_demo`) and everything attached to them: posts, profile and post views, contact clicks, messages, reviews, quotes and reports.
- **Pages owned by a staff account** (owner, admin, backbone, maintenance, support), i.e. the team's test pages, and everything attached to them.
- **Seeded demo project requests** (`source = 'demo'`) and the quotes on them.
- **Admin console page views** (`/admin…`): that is the team at work, not visitor traffic.

Kept: site-wide visitor activity that belongs to no agency (page views of public pages, AI assistant chats).

What these numbers are: counts of recorded events (page views, clicks, messages, quotes …) after the exclusions above. What they are not: unique people (a visitor is an anonymous browser id, and one person can be several), paying clients, market demand, or bot-free traffic (no bot filtering beyond the admin-path rule). Read them as activity on the dataset defined here, not as proof of any of those.

The collaboration metrics already used the same rule (`lib/data/collab-metrics.ts`). Tests: `tests/unit/real-data.test.ts`.

The demo agencies still exist for the public demo (`/demo`); they are simply never counted.
