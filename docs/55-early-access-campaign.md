# 55 · Early-access campaign layer (registration landing)

Owner brief, 1 Oct 2026: early registration must read as an event, not a status label. The registration
landing (`components/registration/registration-view.tsx`, `app/styles/registration.css`) keeps the approved
brochure identity, the photography and the market-specific headlines, and gains a campaign layer around them.

## Hierarchy, top to bottom

1. **Launch announcement** — a full-width strip above the header (`launch-strip`, `<aside aria-label>`):
   "✦ سوّق قادم قريباً · التسجيل المبكر للدفعة الأولى مفتوح الآن · انضم من البداية ←" /
   "✦ Sawwiq is coming · Early registration for the first cohort is open now · Join from the beginning →".
   Deep green with a gold rule, centred on desktop, two short lines with an inline text link on phones.
2. **First-cohort mark** — in the hero, before the headline (`launch-badge`, a `<p>`): "تسجيل مبكر / الدفعة الأولى / 2026" ·
   "EARLY ACCESS / The first cohort / 2026". A stamp, not a button. The year is a date, not a count.
3. **Headline and lead** — unchanged per market (docs/51); English leads shortened so the CTA sits above a phone fold.
4. **Primary CTA** — "احجز مكانك في الدفعة الأولى" · "Join the first cohort" → `/join`. "See an example profile" stays secondary.
5. **Promise line** (`launch-trust`, a list of three) — only statements true today:
   free during early registration · no payment card · your page stays private until you decide otherwise
   (new accounts are private by `profile_publications`; the owner changes it under Studio → Visibility; no phase change promotes a page).
6. **Product preview** — the existing "available now / next stage" cards.
7. **Why join from the beginning** (`launch-early`, dark panel, four numbered points): get your page ready before launch · organise your work and services now ·
   be ready the moment public discovery opens · be part of the first community Sawwiq starts with. Closing note: registration is free and commits to nothing;
   when discovery opens the page is already there.
8. Everything that was already there: Pioneers (with its existing caveats), stages, who, FAQ, final CTA (same cohort CTA and promise line), buyer line, footer.

The weak "Early registration phase" label in the header is removed; the strip and the mark carry the message. The studio
and join notices keep using `phaseLabel`.

## Truth rules (tested)

- No counts, countdowns, seats, deadlines, testimonials or activity feeds. `tests/registration/campaign.spec.ts` fails on
  "places left", "closes tonight", "hurry", "limited time", "متبقي", "مقاعد", "ينتهي الليلة", "سارع", and on commission or
  money figures, in both languages.
- Founder/Pioneer benefits are not advertised beyond the existing, reviewed Pioneer block (docs/44, docs/51): the campaign
  copy names only what a registered provider can do now.
- The strip and the mark are plain HTML text (an `aside`, a `p`, a list): readable by people, search engines and answer engines.
  `organizationLd()` is emitted on the registration page; the website SearchAction is not (its target is closed in this phase).

## Motion and accessibility

- Entrance only, CSS only, inside `@media (prefers-reduced-motion: no-preference)`: the strip and the hero elements rise 8 px and fade
  over ≈0.5 s with 80 ms stagger. With reduced motion nothing animates (tested: `animation-name: none`).
- Tab order: strip link → brand → country → locate → language → theme → sign in → cohort CTA; every stop has a visible focus ring
  (gold on the strip and the CTA). Colours are scoped tokens (`--launch-*`) with dark-mode overrides so contrast holds on both themes.
- Validated at 320/390/768/1024/1440 (light), 390/1440 (dark), 720 CSS px (a 1440 desktop at 200 %), and with reduced motion, in
  Arabic and English: no horizontal overflow; strip, mark, headline and CTA above the fold on a 390×844 phone and at 320 px.

## Not changed

Registration behaviour, private-by-default, the five-step setup, save/resume, authentication, roles, consent, launch-phase gates,
release identification, media permissions, database. The draft Terms stored separately stay inactive.

## Related

- `app/manifest.ts`: shortcuts follow the launch phase (join, examples during registration), plus `id`, `scope`; the locale layout
  declares a `viewport.themeColor` for both schemes.
- `docs/architecture/mobile-and-api-roadmap.md`, `docs/architecture/dependency-audit.md`: the architecture direction decided with this release.
