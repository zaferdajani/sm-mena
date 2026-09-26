# 06 · Response to the external launch review (26 Sep 2026)

The owner shared an outside review of Sawwiq (repository, contracts and payments architecture, SEO, partner network, "The List" campaign). This note says what we take from it, what we had already built in that direction, and what changes.

## What we take, in full

| Review point | Our position | Action |
|---|---|---|
| **Launch order**: focused founding community + a private buyer pilot at the same time; working relationships, not registration counts, as the foundation of the public launch. | Agreed. The Behind-the-Page brief (05) already ties every mechanic to proof (client-confirmed accounts, hires from "who runs this page"), but its arc still led with a Reveal week. The Reveal moves after the private seed has real, confirmed relationships. | 05 §4 re-ordered: Private seed (20–30 providers + first buyers) → Founding launch → Buyer launch. The Sawwiq 50 is announced only when it can be computed from confirmed accounts and completed work. |
| **No public payment-protection promises** until a licensed partner holds funds and the legal answers are in writing. | Agreed and already enforced: protected payments are a feature switch in "coming soon" (docs/34), the partner pack and lawyer brief exist (docs/33), the claim register (02 §8) HOLDs those assets. | No change; the review's list of written answers (funds and eligibility, failure and dispute handling, commercial and legal terms) is appended to docs/33. |
| **Drop "the first Arabic marketplace"** as the master claim; lead with the network. | Agreed. The claim register already required legal sign-off; the review is right that it is hard to defend and makes the platform the hero. | Master line becomes the network line (below). Messages, SEO titles and landing copy change in one pass (task). |
| **Start narrow commercially, broad organisationally**: Amman restaurants and cafés first; everyone may register. | Agreed as the pilot segment (clinics second). | 01 §4 Phase A gets the segment and its package. |
| **Founding 100 with a concrete offer**, and separate *membership number* from *founding-cohort eligibility* from *benefits received*. | Agreed. Member numbers (docs/28) are a join sequence and say so; the offer needs cohort dates, a cap on hands-on benefits, activation and expiry. | Founding program spec in 01 §10 (replaces "first 40 per city"); code: cohort rules and a dated badge (task). The public counter names what it counts. |
| **Value before buyer traffic**: overflow work, missing capabilities, client administration, permissioned credit. | Agreed; the partner network (docs/29) and accounts (docs/28) are the tools. | Weekly partner-matching session and a moderated opportunity digest go into the calendar (03). |
| **Reward activation, not spam.** | Agreed; 01 §10 already counts an invite only when the invited agency is verified and posts work. | No change. |
| **Research first**: 20 buyer and 15 provider interviews in Jordan; test three provider messages. | Agreed. | Interview script (task); results feed 01 §1. |
| **Campaign "Who is behind this work?"** | This is the Behind-the-Page idea (05) seen from the work rather than the person; the same mechanics serve both. Permission for client names, logos and credits is already a rule (client confirmation, docs/28). | 05 §5 adds the work-first video format. |
| **Two contract types for the 12-post example** (production vs monthly management). | Agreed; the milestone templates already distinguish deliverable milestones from periods, but the docs should say it plainly. | docs/17 example rewritten (task). |
| **SEO**: price guide from comparable packages, not agency starting prices; editorial indexing over scaled city×service pages; country-correct OG locale; don't sell FAQ markup or llms.txt as growth. | Agreed on all four. | `lib/data/hire.ts` price guide from packages (service + country + period + scope); `lib/seo.ts` og:locale per country; index only pages with real providers and comparable packages; docs/18 wording (task). |
| **Hosting**: Vercel Hobby is for personal, non-commercial use; a free-to-users marketplace is still commercial. | Correct. docs/27 deferred Pro until charging; that reading was too generous. | Owner: move the Vercel project to Pro before public launch. README and docs/27 updated (task). |
| **Pricing**: Free 10% / Pro $29 at 8%, transparent fees; sponsored placement separate from the main recommendation; verification never purchasable. | Agreed; matches docs/16 and the matcher's relevance threshold. | No change now; billing stays off until payments are live. |
| **90-day plan with gates and raw counts**, staged budget. | Agreed. | 01 §4 gates replaced by the review's (≥20 launch-ready providers; ≥70% of qualified briefs with three responses in 48 h; ≥20% funded once payments are live; 20–30 completed paid engagements with ≥90% on time; ≥60% renewal). |

## Where we differ, slightly

- **"Platform of platforms" / "king of kings."** The review and our own brief (05 §1) say the same thing: never a corporate claim. We keep *"behind the page"* as the members' identity line because it is literally true and client-confirmed; the platform is not the hero, the person behind the page is.
- **Scope of seeding.** The review reads the marketing session's "List" campaign as five cities before thousands of seats. The plan of record (01) is Amman first, Riyadh second, and now the private seed comes first; other cities' providers may join and are not promised a transaction market.
- **Apps.** The review predates the app-development service (docs/37). It fits its own advice: an app is recurring, scoped work with a clear owner-of-accounts question, and "Try the app" is proof, not a promise.

## New positioning (replaces "the first Arabic marketplace")

- Master (Arabic): **فريقك التسويقي يبدأ من هنا.** — اكتشف الوكالات والمستقلين، قارن أعمالهم، واتفق على شغل واضح.
- Master (English): **Your marketing team starts here.** — Find agencies and freelancers, compare their real work, and agree on clear scope.
- Providers: **اعرض شغلك. وسّع فريقك. وابنِ علاقات تجيب شغل.** / Show your work. Grow your team. Build relationships that bring work.
- Buyers (Jordan): **مش عارف مين يمسك تسويق مشروعك؟** احكِ لنا شو تحتاج، وقارن فرق مناسبة حسب الشغل والميزانية.
- Movement (members): المنصات للجمهور. سوّق لمن يديرها. #وراء_الصفحة

"First" may still appear as a fact where it can be shown for a specific thing (for example, client-confirmed "who runs this page" across Arabic agencies), never as the master claim.

## Owner decisions this asks for

1. Approve the new master line (above) so the messages, SEO titles and landing copy change in one pass.
2. Move Vercel to Pro before the public launch.
3. Confirm the pilot segment (Amman restaurants and cafés, clinics second) and who runs the 35 interviews.
4. Choose the payment partner (docs/32/33) so the written answers can be requested.
