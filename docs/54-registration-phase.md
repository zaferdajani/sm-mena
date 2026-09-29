# 51 · Registration phase without a second platform

Owner decision: public provider registration first; discovery and financial
services later. This supersedes the older front-page-only `prelaunch_home`
decision. The approved brochure identity stays; no old dark/vibrant teaser is
restored. No membership totals, city races or future platform fees are advertised.

## One deployment setting, independent capabilities

`LAUNCH_PHASE` is a server deployment variable:

| Value | Public entrance | New discovery | New contracts / NDAs / checkout |
|---|---|---|---|
| `registration` (default, including invalid values) | early registration + read-only examples | closed except explicit staff/pilot access | closed for everyone |
| `discovery` | normal marketplace | allowed where the existing feature is enabled | closed |
| `full` | normal marketplace | existing feature settings | existing feature settings and all payment readiness checks |

The phase is a policy overlay, NOT a rewritten feature map, account type, new
database or new membership sequence. Existing feature settings are retained.
Setting `full` never enables live money, selects a payment provider, changes a
commission, restarts a benefit clock or satisfies KYC/legal conditions.
`LAUNCH_PILOT_HANDLES` is an optional server-only, explicit handle allowlist for
limited discovery trials. An ordinary cookie or query string cannot enroll a
pilot; pilot discovery never grants access to a private profile.

Registration uses the same accounts, services, portfolios, packages, referrals,
Behance import, roles, moderation and Studio. No account recreation at stage 2.
New signed contracts and NDA generation are denied at their data-layer entry
points as well as page/action gates. Existing agreements retain their identifiers,
terms hashes, signatures, ledger history and authorized settlement/read paths.
Old signed documents are not invalidated by a phase change.

## Private preview is a real permission

New real accounts created during registration get a `profile_publications` row
in the SAME transaction as the account:
- `private`: owner and appropriately authorized staff can view the page;
- `unlisted`: anyone with the link, never directory/search inclusion;
- `public`: owner has expressly permitted link sharing now and directory/search
  inclusion when public discovery opens, subject to normal moderation rules.

Changing phase never promotes a private or unlisted account. Publication choices
are owner-scoped, validated, acknowledged and audited with a consent version.
A missing row means an older already-public account; its old link is preserved.
During registration those legacy links are unlisted from platform discovery and
have noindex metadata. We do not silently revoke links an owner already shared.

Public list readers, feed pagination, matching candidates, price/count summaries,
sitemaps and AI summaries are gated independently of menus. Single-profile,
post and client-portfolio pages check access before identifying metadata or
content. Unlisted pages use noindex but not fake authentication. Private pages
require actual authorization and return non-identifying 404s to others.

New media keys use `portfolio/<agency>/...` in the PRIVATE storage bucket. The
no-store `/api/portfolio-media/...` route checks access per request. The generic
public media route rejects that prefix. Brand/demo artwork remains public.
Previously-public files or external downloaded/cached copies cannot be recalled;
the publication screen explains this limitation rather than promising erasure.

## Registration experience

- Real front page and `/soon` both identify the registration phase and show a
  clear free-profile action, local-market copy, language/flag/theme controls.
- No public provider counts, populated-market claims, guaranteed clients,
  invented urgency, published commission percentages or promised launch dates.
- `/examples` uses the actual profile header and static, clearly labelled sample
  content. No fake members, reviews, earnings, interactions or registrations.
- New Studio focuses on introduction/services, work/package and publication;
  keeping a profile private is a valid completed choice, not a conversion defect.
- Existing account history remains reachable through an archive section.
- Pioneer eligibility is the EXISTING program, not automatic entitlement for all
  registrations. The cohort, proof requirements and economics are unchanged.
- Buyer inquiries go to the real contact path during preparation, not an empty
  public search or an invented instant shortlist.

## Deployment and migration order

`0028_profile_publication` is additive; it changes no existing user or money rows.
The Drizzle snapshot/journal accompanies the schema. Vercel's existing build
command applies migrations before building. An old deployed app can keep running
while the new table exists. Never reset, re-seed, backfill private visibility or
run test fixtures against production.

1. Validate final branch against current main; retain concurrent changes.
2. Run lint, typecheck, unit tests, the full-phase browser regression suite and
   the independent registration-phase browser suite.
3. Inspect rendered ar/en mobile/desktop examples, landing, registration, private
   Studio and publication settings; check privacy access and media, not just CSS.
4. Deploy through normal main workflow. Verify actual `/api/version` phase and
   exact commit, health, public routes, images, country/language controls and form
   navigation without submitting test data to production.
5. Record evidence and rollback reference. Do not call a branch preview live.

## Stage 2 / stage 3 checklist

Before `discovery`: decide ready markets/services, test useful profile coverage,
notifications and support; review publication consent and public/unlisted/private
counts INTERNALLY. Rehearse the switch in a non-production environment. Existing
private/unlisted preferences must survive. Notify participants through appropriate
consented channels; do not present registration alone as marketing consent.

Before `full`: separately validate contracts, partner adapter, sandbox and controlled
real pilot, KYC, safeguarding arrangements, settlement/refunds/disputes, monitoring
and support. Follow docs/33; no flag shortcuts. Restore relevant existing feature
settings deliberately, not with a blanket 'all on'.

Rollback to `registration` closes new discovery and new financial acquisition; it
does not delete profiles, undo consent, renumber members or erase signed records.
The additive migration should not be rolled down in production. Previously-public
search cache cleanup, where needed, is an operational task, not a privacy guarantee.

## Tests

`registration-phase.test.ts` covers defaults, phase transitions, membership/data
continuity, atomic private signup, owner permissions, private post/feed reads,
unlisted exclusion, new-document denial and retained signed contracts.
`playwright.registration.config.ts` uses an isolated seeded PGlite database on
3101 with saved feature flags deliberately ON; the registration phase must still
block discovery and transactions. The normal full-phase suite remains on 3100.
No shared global switch is flipped by parallel registration tests.
