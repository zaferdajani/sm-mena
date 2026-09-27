# 40 · Sawwiq Arabic voice system

Sawwiq is Arabic-first, but Arabic marketing copy is **not** translated sentence-for-sentence from English.

## Rule

Product/legal copy stays clear professional Arabic. Marketing copy may use a light local voice selected by the visitor's market:

- Jordan: natural Levantine/Jordanian ("بدنا", "خلّي شغلك يبين")
- Saudi Arabia: light Saudi ("نبي", "وش", "خلك") without caricature
- Egypt: natural Egyptian ("عايزين", "خليك", "دلوقتي")
- UAE/Kuwait/Qatar/Bahrain/Oman: light market-specific Gulf phrasing, kept understandable across the region

Country comes from the existing saved country choice, then Vercel country detection, then Jordan. English stays neutral. The visitor's explicit country choice always wins.

## Tone

Aim for roughly 80% universally understandable Arabic and 20% local flavour. Sound like a good local marketer talking to another professional, not a translated corporate brochure.

Prefer:
- "خلّي شغلك يبين"
- "ورّنا شغلك"
- "أخذت مشروع وناقصك مصوّر؟"
- "كمّل فريقك"
- "قبل ما ييجوا أصحاب الشغل"

Avoid:
- "أعمالك تستحق أن تُرى"
- "ارتقِ بأعمالك"
- "آفاق جديدة"
- "شريكك نحو النجاح"
- "حوّل رؤيتك إلى واقع"
- "عالم من الفرص"
- "كن جزءاً من الرحلة"
- exaggerated population/audience claims

## Pre-launch persuasion order

1. Concrete value: clients, partners, proof of work.
2. Why joining early matters: founder advantages.
3. Curiosity: reveal future advantages gradually, but anchor every teaser to a real category of value.
4. Honest social proof: real registered pages only.
5. CTA.

Registration order is stored for history but is **not** a selling point and must not imply quality or ranking.

## Founder promises

Never promise a specific fee discount, free paid-plan period, lead priority or guaranteed work until the owner approves the economics and the product can honor it. Locked benefit cards can describe the category ("an advantage tied to work opportunities") without inventing the final commercial term.

Once a benefit is publicly announced as definite, treat it as a commitment and record eligibility/cutoff rules before launch.

## RTL

Arabic layouts must be designed rather than mirrored:
- use text widths that produce natural Arabic line breaks;
- isolate Latin acronyms and numbers with explicit bidi direction where needed;
- do not place a giant LTR membership number inside an RTL sentence;
- keep chips inside the viewport and allow wrapping;
- test mobile first at common iPhone widths;
- English and Arabic may use different line breaks and copy lengths even when they share components.
