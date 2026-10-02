# 57. The Founding Member medal (عضو مؤسس) and the invitation letters

The campaign (docs/56) hand-delivers printed letters to the best agencies and marketers. Each letter carries a reserved number and a personal QR code. The seal is **earned**, not handed out: the invitee watches the one-minute introduction to the end, creates the page, and saves a first project. Then «عضو مؤسس رقم ٠١٢» / "Founding Member №012" appears on the page and on its cards. It is recognition for the first names, capped at 50, permanent, and never a rank: relevance, matching and money are untouched. It is separate from the Founding seats (docs/39, docs/44), which keep their own numbers and economics.

## Name
The owner chose «عضو مؤسس» / "Founding Member" (2 Oct 2026), shown as a numbered gold medal («وسام»). Profiles already carried a dated «عضو مؤسِّس 2026» badge for the first 100 providers (docs/39, docs/44); a page that holds the numbered medal shows only the medal, so no page shows two founding badges. The medal's economics are unchanged: recognition only. The name lives in message keys only (`Pioneer.*`, `Profile.pioneerBadge`, `Common.pioneer`, `AdminProspects.letter.*`), so it can change in minutes.

## Medal
`public/brand/first-wave-seal.webp` (512) and `-192.webp`: the gold medal generated with Higgsfield in the site palette and cut out on transparency, used at 48 px and up (QR page, letters, video). `public/brand/pioneer-seal.svg` is the same shape drawn for small sizes (profile badge, cards).

## Who gets the medal (owner decisions, 2 Oct 2026)
- **Only invited names**, and only **the first fifty complete pages**. Letters carry no number; more letters than medals can go out (`PIONEER.letterCap`, 300).
- **Two stages.** Registering from the letter (after watching the video to the end, checked on the server) only **links** the letter to the new page. The medal is earned when the linked page is **complete** (`medalChecklist` in `lib/pioneers.ts`): logo, an introduction of at least 40 characters, services, platforms, a starting price or a package, a WhatsApp number, and at least one published project with images. The first fifty linked pages to be complete get №001…№050 in the order they finish (`awardMedalIfComplete`, under a database lock). The check runs whenever the Studio or the setup is shown, which is right after every save.
- **The Studio shows the checklist** with a link to fix each missing item and the medals left.
- **Too late:** a linked page completed after the fiftieth medal (or a letter used after they ran out) keeps the early-member benefits without a medal; the admin shows "completed after the medals ran out".
- **Everyone else** who registers early (the first 100 providers, docs/39, docs/44) gets the early-member benefits and the plain dated badge «من الأوائل 2026» / "Early member 2026", renamed from «مؤسِّس» so «عضو مؤسس» belongs to the invited only. A page shows one of the two, never both.

## Flow
1. Admin → Prospects → "Create letter": a code without look-alike characters and a 21-day window, one letter per prospect.
2. "Letter" / "Print all open letters" opens `/pioneer-letters` (staff only): A5, Arabic front, English back, the medal, "only 50 medals · first come, first numbered", the window and a QR to `sawwiq.org/i/<code>`.
3. `/i/<code>`: never indexed; counts scans (count and time only); shows the medals left out of 50, the video and the claim button, which opens only after the video ends and the server has recorded it. Claim sets the `sw_pioneer` cookie and opens `/join`; a signed-in provider without a medal can claim for their own page.
4. `/join` links the letter in the same step that creates the page (`claimPioneerFromCookie` → `claimPioneer`); the prospect becomes "joined" with its page linked. The medal number comes later, when the page is complete. Replays, other pages, expired letters, demo pages and second medals are refused.
5. The badge renders only once the page has at least one project.
6. Admin row: medal number once claimed, window, scans, video watched, claimed page, "late" or "medals ran out"; summary: letters, medals given of 50, late, scans.

## Honesty rules
- The letter and the page say what the seal is (recognition, cannot be bought, no ranking, no promise of clients) and what it is not.
- Numbers are reserved by the letter; an unclaimed letter can be extended by an admin. A claimed number is permanent.
- No visitor data on scans; no person's phone or email anywhere in the campaign tables (docs/08).

## Files
`lib/pioneers.ts` (rules), `lib/data/pioneers.ts`, migration `0031_pioneer_invitations`, `app/[locale]/(landing)/i/[code]/` (page, claim route, actions), `app/[locale]/(landing)/pioneer-letters/`, `components/pioneer/*`, `public/brand/pioneer-seal.svg`, `public/pioneers/intro.mp4` (+ poster, .vtt; docs/pioneer-video-script.md), admin pieces in `components/admin/prospect-forms.tsx`, tests `tests/unit/pioneers.test.ts`, `tests/e2e/pioneers.spec.ts`.
