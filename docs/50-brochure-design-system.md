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


## Swiss International Typographic System — v2 migration (2026-10-29)

The founder requested a platform-wide shift from inconsistent floating forms/cards to a
disciplined Swiss-inspired layout. **This is a progressive design-system migration, not a
claim that every page is already converted.** Preserve the official green palette,
Noto Sans Arabic, RTL/LTR support, brand lockup, content and business behavior.

### Shared visual rules

- One app content measure: `--sw-swiss-measure: 68rem` inside the sidebar-aware
  main content area; avoid independent `max-w-xl/2xl/3xl` wrappers at page root.
- Use a predictable 8px-derived spacing scale (8, 16, 24, 32px); use responsive
  16–24px section gutters rather than arbitrary vertical gaps.
- Forms have an explicit containing card and a semantic rail/panel/aside layout.
  All controls have >= 44px touch height and never overlap; hidden native
  country selectors remain fully inside their visible trigger.
- Use 1-column field grids until the **available panel** width (not viewport width)
  supports two usable columns. Prefer a full-width phone field and aligned
  email/password rows. Test with long Arabic labels and native select overlays.
- Swiss styling means strong type hierarchy, purposeful whitespace, fine dividers,
  restrained corners and almost no decorative shadows. It does not mean removing
  Sawwiq green, reducing Arabic legibility or forcing all cards to the same height.
- Each screen has one page container and clearly grouped sections; no arbitrary
  nested max-widths, escaped full-bleed content or sidebar/footer collisions.
- Test 320, 390, 768, 1024, 1440px, both locales, both themes, keyboard navigation,
  visible focus, native mobile selects and field error states.

### Rollout sequence

1. **Registration /join** — this PR: eliminate compressed desktop inputs, fix
   phone-country picker overlay, group consent, and apply container-aware grids.
2. **Studio** — unify all tab roots, header, navigation, sections, tables and
   footer within the existing 68rem measure; use Publication as an acceptance
   reference but update its surface styling to the new shared tokens.
3. **Provider profiles / Explore / requests** — shared cards, typography,
   action placement, filters, loading/error/empty states and mobile hierarchy.
4. **Admin and remaining public/legal flows** — apply the same geometry while
   preserving dense operational tables and explicit permissions.
5. **Cross-platform visual QA** — visual diffs and interaction checks across
   Arabic/English, light/dark and mobile/desktop; ship each tranche only after
   CI and canonical production verification.

The registration work must not be treated as full platform completion. Never
change database schema, auth semantics, consent requirements, founder benefits,
launch phase, matching, commissions or deployment settings to achieve a visual
redesign. Each tranche should be reviewed and merged independently to avoid
reverting parallel feature work.
