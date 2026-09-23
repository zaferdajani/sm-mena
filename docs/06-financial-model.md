# 06 · Financial Model (JOD)

Source of truth: `data/build_financial_model.py` → `data/financial-model.csv`. Change assumptions in the script and re-run; paste the printed table here and into `01-business-plan.md`.

## Assumptions

| Assumption | Value | Basis |
|---|---|---|
| Qualified-brief rate | 60% | Comparable RFQ marketplaces; human moderation Year 1 |
| Paid responses per qualified brief | 3 | Cap is 5; expect 3 on average |
| Lead fee | 15 JOD / response | Conversion value 600–1,800 JOD/month retainer; Sortlist CPC €0.5–10 for weaker leads |
| Pro subscription | 49 JOD/mo Y1–2, 59 JOD/mo Y3 | Below Sortlist €300 and Clutch USD 499/yr; priced for Jordanian agencies |
| Hire rate on qualified briefs | 30% → 35% → 40% | Improves with matching data and reviews |
| Escrow take-up of hires | 0% → 25% → 45% | Launches Month 13 |
| Average escrow project | 800 → 900 → 1,000 JOD | First month of a retainer or a one-off package |
| Escrow commission | 8% | Gateway costs 3–4.5%, leaving ~4% margin |
| Briefs / month | Y1: 10 → 60; Y2: 80 → 150; Y3: 170 → 260 | Paid acquisition + SEO + partnerships |
| Paying agencies | Y1 end: 15; Y2 end: 62; Y3 end: 86 | Of ~120–180 agencies in Jordan plus adjacent categories from Y2 |

## Three-year summary

| Line | Year 1 | Year 2 | Year 3 |
|---|---:|---:|---:|
| Briefs submitted | 480 | 1,460 | 2,660 |
| Qualified briefs | 288 | 876 | 1,596 |
| Hires (est.) | 86 | 307 | 638 |
| Lead-fee revenue | 9,720 | 39,420 | 71,820 |
| Subscription revenue | 3,136 | 23,520 | 53,100 |
| Escrow GMV | 0 | 68,985 | 287,280 |
| Escrow commission revenue | 0 | 5,519 | 22,982 |
| Featured, data, partnerships | 0 | 3,000 | 12,000 |
| **Total revenue** | 12,856 | 71,459 | 159,902 |
| **Total costs** | 31,300 | 82,600 | 132,600 |
| **Net** | -18,444 | -11,141 | 27,302 |

## Cost detail

**Year 1 (31,300):** company setup & legal 3,500 · hosting/tools 1,800 · ops & sales hire from M4 8,100 · part-time content from M4 3,600 · paid acquisition from M4 10,800 · agency outreach & events 2,000 · accounting & misc 1,500. Founder unpaid.

**Year 2 (82,600):** founder 18,000 · ops & sales ×2 24,000 · content 6,000 · paid acquisition 24,000 · hosting/tools 3,600 · legal & payments licensing 4,000 · misc 3,000.

**Year 3 (132,600):** founder 24,000 · team of 4 50,400 · content 7,200 · paid acquisition 36,000 · hosting/tools 6,000 · legal 4,000 · misc 5,000.

## Funding need

Cumulative losses Y1 + Y2 ≈ 29,600 JOD. Monthly break-even expected around Month 20. **Raise or commit 40,000 JOD** to cover 18 months plus a 10,000 JOD buffer. Sources: founder capital, Oasis500 seed (typically USD 50–100k), or a JEDCO programme for the company itself.

## Sensitivities

| Scenario | Effect on Y2 revenue |
|---|---|
| Qualified rate 45% instead of 60% | −25% lead revenue (~−10,000) |
| Lead fee 10 JOD | −33% lead revenue (~−13,000) |
| Only 2 responses per brief | −33% lead revenue |
| Escrow delayed to Y3 | −5,500 |
| Paying agencies 40 instead of 62 by Y2 end | −8,000 |

The model survives any single downside. Two together push break-even into Year 3 and the funding need to ~55,000 JOD.
