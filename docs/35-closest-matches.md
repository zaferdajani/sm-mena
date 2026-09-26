# 35. Closest matches when a search finds nothing

When a search finds no agency that meets everything the person asked for, Sawwiq:
- says so plainly ("No exact matches");
- shows the closest agencies, best first;
- gives each one a **match percentage** and a list of **what differs** from the request.

## Where it shows

- **Explore** (posts or agencies tab) when filters return nothing. Free-text search on its own isn't compared; clearing the filters is still offered.
- **Hire pages** for a city or country where no agency offers the service. The closest are usually the same service in another city, or a similar service.
- **The AI matchmaker**, both rule-based and AI:
  - The reply says no agency in the visitor's country matches everything.
  - The cards show the percentage and the differences.
  - The AI tool `search_agencies` returns the closest agencies with their differences and tells the model to say there was no exact match.

## How the percentage works

The logic lives in `lib/matching/closeness.ts`, which is pure and unit-tested. Only requirements the person actually set count. Each has a weight, and each scores from 0 to 1:

| Requirement | Weight | Full / partial credit |
|---|---|---|
| Services | 40 | each requested service offered = 1; a service in the same category = 0.5 |
| Budget | 20 | lowest price within the maximum = 1; up to 50% over slides to 0; no published price = 0.5; packages all below the minimum = 0.7 |
| Location | 15 | the requested city = 1; another city in the country = 0.6; based abroad but serving the country = 0.5 (0.8 when no city was asked) |
| Platforms | 10 | share of requested platforms listed |
| Industry | 8 | listed or not |
| Full service | 7 | share of content / ads / branding covered |
| Verified | 5 | business identity verified or not |

The percentage is the weighted average of the scores.

## Which agencies are considered

`lib/matching/closest.ts` looks at active agencies (real only, unless the demo view is on):
- agencies listed in the visitor's country;
- agencies elsewhere that offer a requested or similar service.

Agencies under 30% are not suggested. Results are sorted by percentage, then verified, then portfolio size.

## How differences are worded

`lib/matching/describe-core.ts` turns each difference into short lines in Arabic or English. Examples: "Offers SEO", "In Amman, not Aqaba", "Starts at JOD 320: JOD 300 over your maximum of JOD 20", "Doesn't list Snapchat".

Met requirements come first, then partial ones, then gaps. The server and the matchmaker's cards in the browser use the same wording (`messages/*.json` → `Closest.diff`).
