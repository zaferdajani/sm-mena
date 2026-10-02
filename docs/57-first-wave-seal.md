# 57. The Founding Member medal (عضو مؤسس) and the invitation letters

The campaign (docs/56) hand-delivers printed letters to the best agencies and marketers. Each letter carries a reserved number and a personal QR code. The seal is **earned**, not handed out: the invitee watches the one-minute introduction to the end, creates the page, and saves a first project. Then «عضو مؤسس رقم ٠١٢» / "Founding Member №012" appears on the page and on its cards. It is recognition for the first names, capped at 50, permanent, and never a rank: relevance, matching and money are untouched. It is separate from the Founding seats (docs/39, docs/44), which keep their own numbers and economics.

## Name
The owner chose «عضو مؤسس» / "Founding Member" (2 Oct 2026), shown as a numbered gold medal («وسام»). Profiles already carried a dated «عضو مؤسِّس 2026» badge for the first 100 providers (docs/39, docs/44); a page that holds the numbered medal shows only the medal, so no page shows two founding badges. The medal's economics are unchanged: recognition only. The name lives in message keys only (`Pioneer.*`, `Profile.pioneerBadge`, `Common.pioneer`, `AdminProspects.letter.*`), so it can change in minutes.

## Medal
`public/brand/first-wave-seal.webp` (512) and `-192.webp`: the gold medal generated with Higgsfield in the site palette and cut out on transparency, used at 48 px and up (QR page, letters, video). `public/brand/pioneer-seal.svg` is the same shape drawn for small sizes (profile badge, cards).

## Flow
1. Admin → Prospects → "Create letter" on a prospect: `pioneer_invitations` gets the next number (≤ `PIONEER.cap`, under a transaction lock), an 8-character code without look-alike characters, and a 21-day window. One letter per prospect.
2. "Letter" / "Print all open letters" opens `/pioneer-letters` (staff only): A5, Arabic front, English back, the seal, the number, the window, and a QR to `sawwiq.org/i/<code>`. Print → Save as PDF.
3. `/i/<code>`: never indexed. Counts a scan (count and time only). Shows the number, the video and the claim button; the button opens only after the video ends (`watched_at` recorded once). Claim sets the `sw_pioneer` cookie and opens `/join`; a signed-in provider without a seal can claim for their own page.
4. `/join` claims from the cookie in the same step that creates the page (`claimPioneerFromCookie`): the letter is marked claimed, the page gets `agencies.pioneer_number`, the prospect becomes "joined" with its page linked, and the cookie is cleared. Replays, other pages, expired letters, demo pages and second seals are refused.
5. The badge renders only when the page has at least one project (`postCount > 0`): profile header, agency cards.

## Honesty rules
- The letter and the page say what the seal is (recognition, cannot be bought, no ranking, no promise of clients) and what it is not.
- Numbers are reserved by the letter; an unclaimed letter can be extended by an admin. A claimed number is permanent.
- No visitor data on scans; no person's phone or email anywhere in the campaign tables (docs/08).

## Files
`lib/pioneers.ts` (rules), `lib/data/pioneers.ts`, migration `0031_pioneer_invitations`, `app/[locale]/(landing)/i/[code]/` (page, claim route, actions), `app/[locale]/(landing)/pioneer-letters/`, `components/pioneer/*`, `public/brand/pioneer-seal.svg`, `public/pioneers/intro.mp4` (+ poster, .vtt; docs/pioneer-video-script.md), admin pieces in `components/admin/prospect-forms.tsx`, tests `tests/unit/pioneers.test.ts`, `tests/e2e/pioneers.spec.ts`.
