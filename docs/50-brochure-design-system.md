# 50 · Approved brochure → one platform design system

## Reference and exact typeface

The owner approved **Sawwiq_Saudi_Brochure_Corrected.pdf**, not the earlier
Media/PalestineStyle drafts. Embedded PDF font metadata identifies Noto Sans
Arabic Regular, SemiBold, Bold and ExtraBold. It is **not** Palestine or Amiri.
The root Next.js layout now self-hosts Noto Sans Arabic as one variable family
for Arabic and Latin UI. Code blocks retain a system monospace face. Decorative
photos and customer-supplied artwork retain their original appearance.

## Shared palette

| Role | Light token from the reference |
|---|---|
| Paper | `#f8f6ef` |
| Main ink | `#102e25` |
| Card | `#fffdf7` |
| Primary action | `#106b4c` / white |
| Wordmark | `#106a4c` |
| Supporting text | `#4c6257` |
| Sage panel | `#e5ede0` |
| Divider | `#d6ddd4` |
| Decorative gold | `#c19a4f` |
| Gold text on light | `#6d592f` |
| Gold text on dark media | `#f0cf82` |

Light is the default; saved dark mode remains available with corresponding
contrast-tested tokens. Gold is an accent, not faint text on cream. Form borders
are deliberately stronger than decorative dividers.

## Scope and ownership

- `app/globals.css`: palette, shared typography, utility sizes and corner radii.
- `app/styles/brochure.css`: brochure compositions and app/workspace chrome.
- `components/brand-lockup.tsx`: actual repository logo plus an Arabic wordmark;
  shared by marketing, invitation, authentication and application navigation.
- Public landing retains the film/intro and repaired spacing; an editorial
  media panel gives the approved brochure's typography a predictable contrast.
- `/soon`: cream page, photographic panel, green actions, sage content cards,
  gold rule, readable copy and explicit country/language/theme controls.
- Shared Input, Textarea and Button primitives: legible font sizes and real tap
  targets. Labels can wrap; selectors keep the native mobile picker.
- Public agency/freelancer profiles inherit the new palette/font and more
  readable secondary text while retaining their grids and owner-only followers.
- Studio/admin nested routes share card/navigation treatment; the entire
  application shell, including agent, request, messaging, support, hire and
  legal routes, inherits the same typography/tokens. Media-based feed surfaces
  retain their presentation and existing interaction model.

## Non-negotiable preservation

No changes to payments, commissions, founder eligibility, one-time waivers,
matching, reviews, country/locale semantics, auth, RLS, Behance import, existing
content/translations, private follower visibility or database schema. No
production DB resets or seeding; no monetization flags enabled. The deleted
vibrant teaser is not restored. Preserve newer main work during merge.

## Verification

`tests/unit/brochure-design.test.ts`: font/asset source guards, palette and text
contrast. `tests/e2e/brochure-design.spec.ts`: actual rendered font and light/dark
tokens, bounds, real logo, screenshots, public surfaces, provider Studio,
admin, eight country selections, language/theme changes, and 320px forms.
Existing full CI remains required, including Behance and payment regressions.
All authenticated tests run against isolated seeded test data, never production.

A passing CI run is not production verification. After the normal deployment,
confirm `/api/version` reports `brochure-2026-09-27-v1` and the exact merge SHA,
then inspect public ar/en landing, `/soon`, profiles, country/language/theme
controls in a real browser at phone and desktop sizes. Preserve the screenshots
and report what was actually inspected. Do not call a preview production.
