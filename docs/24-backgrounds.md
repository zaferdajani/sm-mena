# 24 · Interface backgrounds per country

Admin → **Appearance** (permission `appearance.manage`: owner and admin) puts an image or a looping video behind the app for one country's interface or for all of them. A background can run indefinitely or only between two dates, for example the Saudi flag on Flag Day (11 March) for visitors whose interface is set to Saudi Arabia.

## How it works

- **Upload**
  - Images (JPG, PNG or WebP, up to 15 MB) are converted to WebP, at most 2400 px.
  - Videos (MP4 or WebM, up to 25 MB) are stored as they are.
  - The file type is checked from its bytes, not its name.
  - Files go to storage under `backgrounds/` (local disk or Supabase). The `/media` route serves video with byte ranges, which Safari needs.
- **Which background shows.** The choice follows the visitor's interface country (the `sw_country` cookie, which defaults to Jordan) and today's date in that country's time zone. Priority, highest first:
  1. A dated background for that country.
  2. A dated background for all countries.
  3. The country's undated background.
  4. The undated background for all countries.
  
  Within each level, the newest wins. Switched-off backgrounds are ignored.
- **Readability.** A "veil" of the page colour (0–95%) covers the media so text stays legible in light and dark mode. Videos play muted and inline, and are hidden for people who prefer reduced motion.
- **Where it shows:** the app interface (feed, explore, profiles, studio). The landing page keeps its own design.
- **Audit.** Every add, switch on/off and delete is written to the audit log.

## Code

- `lib/theme/backgrounds.ts`: the list, stored as JSON in `app_settings` under the key `theme.backgrounds`; `pickBackground()` and `dayIn()`.
- `components/theme/interface-background.tsx`: the fixed layer, rendered first in `components/shell/app-shell.tsx`.
- `app/[locale]/(main)/admin/appearance/*`: the admin page, form and actions.
- Tests: `tests/unit/backgrounds.test.ts` and `tests/e2e/appearance.spec.ts`.

## Notes

Use official artwork for national symbols. The Saudi flag carries the Shahada, so upload the official flag file rather than a redrawn or AI-generated one, and don't place it where it would be disrespected (for example behind promotional offers).
