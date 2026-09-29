# Additional roles and SEO naming

Owner request: add more team/freelancer roles; show exact and partial existing
matches before creating a new title. Keep **SEO** unchanged in every language.

- Shared RolePicker searches all 25 catalog roles, not only the 10 signup chips.
- Bilingual names, known aliases, Unicode width, case, accents/diacritics and
  punctuation are normalized; exact matches reuse the existing key. Already
  selected roles remain visible as already added, rather than allowing duplicates.
- Partial matches are suggestions, not proof of equivalence. A user must explicitly
  choose a distinct specialty before adding a related but genuinely different title.
- New custom titles are provider self-descriptions stored in existing string arrays
  under a `custom:` prefix. No schema/migration change, global registry mutation,
  cross-provider lookup or disclosure. Labels retain readable original spelling.
- Custom descriptions are NOT automatically approved matching categories. Existing
  matching/planner logic continues to use its canonical roles. The picker offers
  those established roles first. Future catalog promotion can add explicit aliases;
  normalization then reuses the canonical key on the next save.
- Both signup and Studio profile actions normalize and deduplicate submitted values.
  Unknown IDs, links/control characters, oversized titles and excess selections are
  rejected/bounded. The component does not rely on client validation alone.
- Names use SEO (e.g. «مختص SEO»). Arabic transliterations remain search aliases.
  The source catalog AND its generator use the same display names; no blanket
  replacement in user content or place names such as أسيوط.
- Root `messages/ar.json` and `messages/en.json` contain the RolePicker strings.
- Tests cover exact/partial matches, additions beyond signup chips, custom spelling,
  duplicate attempts, signup persistence/removal, keyboard controls, ar/en and 320px.

Coordination: PR #22 is the cross-session thread. Preserve the role-input patch
when merging registration and onboarding. This feature does not edit uploads,
portfolio-setup transactions, social consent, migrations, publication or payments.
