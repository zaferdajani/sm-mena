# 53 · First-run portfolio setup and platform connections

Implements `docs/upgrades/creator-onboarding/FIRST_RUN_WIZARD.md` and the software parts of `SOCIAL_CONNECTIONS.md`.

## First-run setup (`/portfolio-setup`)

A new provider lands here right after sign-up (an accepted collaboration invitation adds a short notice). Clients, referral agents and staff keep their own destinations; ordinary sign-in is unchanged; returning providers see a "Set up my portfolio" invitation on the Studio overview and profile until they have a project.

Five steps, one task per screen, "Step n of 5", Back, and "Finish later" (pauses the draft and opens the Studio). The page sits outside the Studio layout so no unrelated tools, finance or promotion panels show; language, help and account stay in the header.

1. **Profile**: logo/photo, name (prefilled from sign-up), short introduction and services. Only fields that changed are written (`patchProfile`); contacts, languages, translations, roles, verification and Founder data are never touched. Skippable.
2. **Source**: upload; import (PDF pictures read on the device, or a Behance project read by the existing importer; only when `portfolio_import` is on); or a connected platform. Every platform is listed with its real state; an unavailable one shows its exact reason and "Upload images instead".
3. **Client**: one of the agency's own clients, a new one (name only, added once however often Continue is pressed), personal/practice work (labelled on the project), or a private client (none shown). Import suggestions are shown, never applied silently.
4. **Project**: name, the creator's own part, services, and 1–10 images staged in private storage (`drafts/…`, served only to the owner by `/api/setup-media/[id]`). Reorder, "Make cover", remove. A Behance project's images can be trimmed. An example panel is available on demand.
5. **Preview**: the same avatar and image carousel as the portfolio; Edit returns to a step without losing work. Publishing needs the rights confirmation and is the only step that makes anything public (the live policy: providers' pages are public, so the button says "Publish this project" and the visibility note says so).
   During the registration phase (docs/54) the note, the button and the finished screen follow the page's own publication choice instead: a private page says that only the owner and authorized staff can open the saved project, an unlisted page that people need its link, a public one that the link works now and the directory follows when discovery opens. The wizard never changes that choice; it links to Studio → Visibility.

### State and safety
- `portfolio_setups` (one row per agency): status `in_progress | paused | finished`, step, draft JSON, `version`, and the published `post_id`. Every write names the version it read; stale tabs and retries get "stale" and reload the saved draft.
- Publishing first claims the version (a single `UPDATE … WHERE version = ? AND post_id IS NULL`), so two clicks or two tabs create one project. The staged images are then deleted.
- A project from a platform item is unique per agency and item (`posts_source_item_idx`).
- Staged images untouched for 60 days are deleted by the daily retention job.
- "Add another project" starts a clean draft at the source step.

## Platform connections (Studio → Connected platforms)

| Platform | Scopes (read only) | Resource chosen | Shown as |
|---|---|---|---|
| Google identity | `openid profile` (ID token verified with `jose`: issuer, audience, signature, expiry, nonce) | the identity | linking only; no import, no YouTube access |
| YouTube | `youtube.readonly` (PKCE) | a channel | public, embeddable videos → YouTube (nocookie) player |
| Instagram (Instagram Login) | `instagram_business_basic` | the professional account | Instagram embed; personal accounts are told to upload |
| Facebook Pages | `pages_show_list`, `pages_read_engagement` | Pages the person manages | Facebook post embed |
| TikTok (Login Kit + Display) | `user.info.basic`, `video.list` | the account | TikTok embed player |

Flow: a server action (same-origin) checks the signed-in agency, stores only a hash of a random state with the session, user, agency, provider, "my account / a client account I manage" (+ an owned client) and sealed PKCE verifier/nonce, then leaves for the platform's own consent screen. The callback (`/api/social/callback/[provider]`) takes the state once; a replay, another session, another user, a swapped provider or an expired attempt changes nothing. The code is exchanged server-side, granted scopes are checked (missing ones → "limited"), and the channels/Pages/accounts the platform listed are saved as a 30-minute pending choice; the creator confirms the ones to use. Ids from the browser are only looked up together with the agency.

Tokens: `lib/social/crypto.ts` (AES-256-GCM, `SOCIAL_TOKEN_KEY`, associated data = purpose + grant + platform + agency). Refresh is server-side and compare-and-swap on the grant's `version`, so racing requests don't overwrite a rotated token. Provider calls go only to an allowlist of official API hosts, with no redirects, a 10 s timeout and a 1 MB limit (`lib/social/http.ts`). A 429 or outage never marks a connection disconnected; 401 marks it expired, 403 limited. Daily API units per platform are kept in `social_quota_usage`.

Browsing shows a page of published items with bounded metadata; nothing is downloaded or rehosted. Picking an item stages it in the setup draft; the creator adds a cover image they own, reviews text, client and services, and publishes. The post keeps the platform's permalink as credit and the official player (`lib/social/embed.ts` builds and re-validates it).

Disconnect deletes tokens, chosen resources and unpublished items at once, removes the player from projects made from them (text and uploaded images stay), then revokes at the platform where possible (Google, Facebook, TikTok); Instagram Login has no revocation endpoint, so the creator is told where to remove Sawwiq. Meta deauthorization and data-deletion callbacks (`/api/social/meta/{instagram|facebook}/{deauthorize|delete}`) verify the signed request and remove that person's connections in every agency; the deletion status page is `/social-deletion/[code]`.

## Readiness gates (recorded separately per platform)

A platform shows a working Connect button only when **all** of these hold (`lib/social/providers.ts`):

1. code implemented (all five are);
2. the owner registered a developer app and stored its credentials in Vercel (names in `.env.example`); Meta also needs `META_GRAPH_VERSION` pinned;
3. `SOCIAL_TOKEN_KEY` is set;
4. its name is in `SOCIAL_PROVIDERS_APPROVED`, set only after the platform approved the permissions and a controlled live test with an authorized account succeeded.

Status on 29 Sep 2026: code and fixture tests done for all five; **no developer app is registered for any of them** (no credentials in the deployment), so all five show "Not available yet" with the reason and the upload alternative. No platform has been verified live.

## Tests
- `tests/unit/social-connections.test.ts`: scopes/PKCE per platform, readiness gates, foreign client, state replay/session/user/provider swap/expiry, sealed tokens bound to agency, pending selection with foreign and made-up ids, partial grants, personal Instagram, Google ID token signature/nonce, item browsing (private/unembeddable, unsafe thumbnails, duplicates), 429/outage, refresh race, disconnect (player removed, text kept), remote revocation failure, Meta signed requests and cross-agency deauthorization, retention.
- `tests/unit/portfolio-setup.test.ts`: stale versions, pause/resume, other agencies, profile patch keeps omitted fields, client added once, foreign client refused, private media and foreign ids, publish requirements, concurrent publish → one project, restart, platform item → one project with its player, same item refused twice, 60-day purge.
- `tests/e2e/portfolio-setup.spec.ts`: new provider → five steps with real uploads, reload/resume, private media 404 for others, preview is not public, Edit keeps work, publish once; Finish later → Studio → resume; Behance project returns to the same draft (Arabic).
