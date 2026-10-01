# 55. Launch prospects (Admin → Prospects)

The owner wants to go to the best social media agencies in Jordan before launch and invite them personally. Admin → Prospects is that list: who to contact, why they fit, and where each contact stands. It is a working list for the owner and admins, never shown anywhere public and never a sign-up.

## What is on the list
- **Researched list** (`data/prospects-jordan.json`): agencies found in public directories on 1 Oct 2026 (Clutch's social media ranking for Jordan, al5otwa, entasher, and the agencies' own sites). Each entry carries its source. "Add the researched list" on the page, or Maintenance → `seed-prospects`, adds whatever is missing and leaves existing rows alone.
- **The owner's names**: typed on the page (name, city, website, Instagram, services, note, top priority). The first two, UPT House and Muhannad, came from the owner on 1 Oct 2026; "Muhannad" had no agency or page under that name in the directories searched, so it is on the list with its details to be filled in.
- One row per business however the name is typed (`prospectKey`: case, spaces, punctuation and a leading "the" are ignored).

## Status
`new` (to contact) → `contacted` (date recorded) → `replied` → `joined` or `declined`. "Mark contacted" is one tap. When a real page signs up with the same website host, `linkJoinedProspects` (run by `seed-prospects`) links it and marks it joined; nothing is guessed from names.

## Access and data
- Permission `prospects.manage`: owner and admin.
- Businesses only. Fields are the public website and Instagram handle plus the owner's note. The page tells admins to keep people's phone numbers and emails out of the notes (docs/08).
- Every add, change, import and removal is audited (`prospect.*`).

## Files
`lib/prospects.ts` (rules, zod), `lib/data/prospects.ts`, `lib/db/seed-prospects.ts`, `app/[locale]/(main)/admin/prospects/`, `components/admin/prospect-forms.tsx`, migration `0030_prospects`, `tests/unit/prospects.test.ts`, `tests/e2e/admin-prospects.spec.ts`.
