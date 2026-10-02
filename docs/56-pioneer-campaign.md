# 56 · The Founding Member (عضو مؤسس): the invitation campaign playbook

The owner hand-delivers printed, numbered invitation letters to the best social media agencies and marketers in Amman during the registration phase (docs/51). Each letter carries a personal QR code that opens `sawwiq.org/i/<code>`: a 24-second intro video in Modern Standard Arabic, the invitee's reserved Founding Member number, "Claim your seal", then the normal `/join` and the five-step setup (docs/53). Nothing is public until the invitee says so.

> **As built (docs/57):** the seal is earned in three steps: the invitee watches the introduction to the end on the letter's page (recorded), creates the page from that page's "Claim" button, and saves a first project; only then does «عضو مؤسس رقم ٠١٢» appear. A letter's number stays reserved for its window (21 days) and an admin can extend it; claimed numbers are permanent. Where this playbook and docs/57 differ, docs/57 describes the code.

**The Founding Member medal («وسام العضو المؤسس», "Founding Member №012")** is a permanent numbered mark on the holder's page and posts. Rules, all enforced in code once built:

- Capped at 50. Numbers are reserved per letter, claimed once, never sold, never reissued once claimed. A reservation that passes its printed date is released; the printed letter said "reserved until", so it stays true.
- Only for names the owner invited, who claim within the letter's window. Registration itself stays open to everyone; the cap is on the recognition, not on joining.
- It gives recognition, and the early window on relevant business requests when discovery opens. That window is the existing Founding Member/Founder head start (docs/44 §3, docs/45): relevance-gated, time-boxed, and subject to the same eligibility (real profile, services, one genuine work). Relevance never changes; a non-member can rank above a Founding Member member.
- No money attached. It does not alter Founder economics (0% first project, 7% launch year, Pro months: docs/44), Founder eligibility, payments, pricing or the seat number (docs/39). Founder status is earned by the docs/44 rules whether or not a seal exists.
- Lost only if the page is removed.

Targets: the 30 agencies in `data/prospects-jordan.json` (Admin → Prospects, docs/55), plus up to 20 names invitees and the owner add during the campaign, including freelancers.

## 1. Goal and metrics

**Goal:** real, complete, private-or-better pages from Amman's strongest social media practitioners before discovery opens.

**The one metric: claimed seals ÷ letters delivered.**

Secondary metrics the admin page can show honestly (all counted from the database, never estimated):

| Metric | Definition | Why |
|---|---|---|
| Letters delivered | Prospects marked "letter delivered" with a date | The denominator |
| Scans | Views of `/i/<code>` (count, first, last) | Did the right person see it? |
| Claims | Seals claimed within the window | The numerator |
| Pages started | Claimed accounts that opened the setup | Friction after the claim |
| Pages complete | Introduction + services + one genuine project saved | What launch actually needs (docs/45) |
| Visibility chosen | private / unlisted / public, counted internally | Never shown publicly during registration (docs/51) |

No benchmark exists for this format, so set no "expected" rate. Decision rule instead: after wave 1's window closes, if fewer than 3 of 10 claimed, change the letter or the landing page before wave 2 rather than printing more of the same.

## 2. The psychology, concretely

- **True scarcity.** 50 numbers, each printed on one letter. Nothing is padded, no countdown, no "places left" (the registration truth tests forbid that language; the landing page must pass them).
- **Personal recognition.** Named, numbered, delivered by the founder in person. The letter says why they were chosen, in one specific sentence the owner writes per agency.
- **Low risk.** The page is private until published (`profile_publications`, docs/51). The letter and the landing page say so plainly.
- **Reciprocity.** The owner offers to stage the page from up to 10 links or a PDF they send (docs/36, docs/47). They review everything and confirm rights before anything is saved as theirs.
- **Social proof, only with consent.** "Who else claimed" is said aloud only for names who agreed to be named. The landing page shows claimed names only after each gave consent in the Studio; until then it shows the count of claimed seals and nothing more.

## 3. Sequence and timeline

Three delivery waves, one per week; each letter's window is 14 days from delivery. The campaign runs about five weeks to the last expiry.

| Wave | Week | Letters | Numbers | Names |
|---|---|---|---|---|
| 1 | 1 | 10 | 001–010 | Owner's picks: UPT House, Muhannad, then eight the owner orders from the list (suggested: UBlac, Hex Corner, Masar, Humanize, Socialanji, Mrketly, Sudacé, Jeel Media) |
| 2 | 2 | 10 | 011–020 | Suggested: Prestige, Smart Cube, Smart Media, IMPRESSIONS, HM Marketing, emango, Extra Expand, AlGurus, Dot Media, RANWA |
| 3 | 3 | 10 | 021–030 | The remaining ten, reordered by what waves 1–2 taught |
| Reserve | any | up to 20 | 031–050 | Names invitees recommend, freelancers, late discoveries |

Numbers follow delivery order. No swaps, no "can I have 007": the answer is "numbers follow the order of the letters; yours is yours".

Per letter, day by day. Follow-ups come from the owner's own phone, to a number given in person for this purpose, at most two chasers; a reply to something the invitee did is not a chaser.

| Day | What happens |
|---|---|
| 0 | Hand delivery and the two-minute conversation (§5). Mark "letter delivered" in Admin → Prospects. |
| 2 | WhatsApp 1 (link + staging offer). Skip if already claimed; send a thank-you instead. |
| 5 | Internal checkpoint only, no message. Admin shows scanned-not-claimed (do nothing yet), claimed-not-started (send the staging offer if not already sent), nothing (verify the letter reached the social lead; one call to the office is acceptable). |
| 10 | WhatsApp 2, the last one. Then silence. |
| 14 | Window closes. Unclaimed number is released to the reserve. Mark `declined` or leave `contacted`; never chase again. |

**WhatsApp 1 (day 2):**

> مرحبا {الاسم}، ظافر من سوّق. شكراً على وقتك يوم {اليوم}. هذا رابطك الشخصي اللي على الورقة: sawwiq.org/i/{code} — رقم {٠١٢} محفوظ باسمكم لغاية {date}. إذا بتحب أجهّز لك مسودة الصفحة من أعمالك، ابعتلي ١٠ روابط أو ملف PDF وأرتّبها، وما بينزل شي قبل ما تشوفه وتوافق عليه.

**Thank-you (on claim, not a chaser):**

> أهلاً بك بين روّاد سوّق، {الاسم}. رقم {٠١٢} صار لك. إذا بتحب مساعدة بالصفحة أنا موجود، وإذا بتفضّل تكمّلها لحالك فالصفحة بتبقى خاصة لحد ما تقرر.

**WhatsApp 2 (day 10):**

> مرحبا {الاسم}، تذكير أخير وما رح أزعجك بعده: حجز رقم {٠١٢} بينتهي {date}. الرابط: sawwiq.org/i/{code}. إذا الوقت مش مناسب هسا، احكيلي وبنشيل الرقم بدون أي إحراج.

Nothing else: no broadcasts, no groups, no "did you see my message".

## 4. The printed letter

A5, 200 gsm or heavier, Arabic on the front, English on the reverse. One QR code per side, generated from `https://sawwiq.org/i/<code>` with the short URL printed beneath (QR codes fail; type-able text does not). The number line and the expiry are printed, not handwritten. The owner adds one handwritten sentence on the Arabic side naming the work that made him think of them.

### Arabic side (front)

**Headline:** دعوة باسمكم

**Paragraph 1:**
أكتب لكم بصفة شخصية. سوّق منصة تُبنى الآن في عمّان لتجمع وكالات التسويق والمستقلين وصنّاع المحتوى في مكان واحد: يعرضون فيه أعمالهم، ويصلهم عبره طلب الشغل المناسب عند فتح التصفّح العام. قبل أن نفتح الأبواب أردت أن تكون أسماء محدودة من أفضل من يعمل في هذا المجال موجودة من البداية، وأعمالكم كانت من أول ما خطر في بالي.

**Paragraph 2:**
احتفظت لكم برقم من خمسين رقماً فقط، لأسماء مدعوة بالاسم. من يطالب بختمه خلال المدة يحمل علامة «رائد سوّق» برقمه على صفحته ومنشوراته بشكل دائم. الختم لا يُباع ولا يُمنح لمن لم يُدعَ. هو تقدير، ونافذة مبكرة على طلبات الشغل المناسبة لكم عند فتح التصفّح. لا يغيّر ترتيب الظهور، ولا يحمل أي مقابل مالي.

**Paragraph 3:**
المطلوب قليل: امسحوا الرمز، شاهدوا فيديو مدته ٣٦ ثانية، طالبوا بالختم، ثم أنشئوا صفحتكم من الهاتف في جلسة واحدة. الصفحة تبقى خاصة إلى أن تقرروا نشرها. وإن أردتم، أجهّز لكم مسودة الصفحة من روابط أعمالكم وتراجعونها قبل أي نشر.

**Number line:** عضو مؤسس رقم ٠١٢ من ٥٠

**QR caption:** امسحوا الرمز لفتح صفحتكم الخاصة · sawwiq.org/i/{code}

**Expiry line:** الحجز لغاية {date}

**Signature line:** ظافر · مؤسس سوّق · {رقم واتساب}

### English side (reverse)

**Headline:** An invitation in your name

**Paragraph 1:**
I am writing to you personally. Sawwiq is being built in Amman to bring marketing agencies, freelancers and content creators into one place: a page for their work, and a way for the right business requests to reach them when public discovery opens. Before the doors open I wanted a small number of the best people in this field to be there from the start, and your work was among the first I thought of.

**Paragraph 2:**
I have reserved one of only fifty numbers for you, offered by name only. Whoever claims their seal within the window carries the "Founding Member" mark with their number on their page and posts, permanently. The seal cannot be bought and is not given to anyone who was not invited. It is recognition, and an early window on relevant business requests when discovery opens. It does not change ranking and carries no money.

**Paragraph 3:**
Little is asked: scan the code, watch a 36-second video, claim the seal, then build your page from your phone in one sitting. The page stays private until you decide to publish it. If you prefer, I will stage a draft from links to your work for you to review before anything is published.

**Number line:** Founding Member №012 of 50

**QR caption:** Scan to open your private page · sawwiq.org/i/{code}

**Expiry line:** Reserved until {date}

**Signature line:** Zafer · Founder, Sawwiq · {WhatsApp number}

### Envelope line

إلى فريق {اسم الوكالة} · دعوة شخصية، تُسلَّم باليد
To the team at {Agency} · a personal invitation, delivered by hand

### Insert card for freelancers (A7, with the same letter)

وسام العضو المؤسس للأشخاص كما للشركات. رقمكم محفوظ: عضو مؤسس رقم ٠٢٣ من ٥٠. الصفحة باسمكم، أعمالكم وحدها، خاصة إلى أن تقرروا.
The Founding Member medal is for people as much as companies. Your number is reserved: Founding Member №023 of 50. The page is in your name, your work alone, private until you decide.

Words to keep out of every piece: «الأفضل», «رقم ١», «مضمون», "revolutionary", "guaranteed", "best", "#1", "hurry", «سارع», «مقاعد متبقية». Per market copy rules (marketing/08).

## 5. Delivery plan

Go in person, mid-morning or mid-afternoon, Sunday to Thursday. Dress like a client, not a salesperson. Two minutes, then leave.

**Script (Arabic, adapt freely):**

> مرحبا، أنا ظافر، بأعمل على منصة اسمها سوّق لأهل التسويق في الأردن. جاي أسلّم دعوة شخصية لـ{اسم الوكالة}، لأن شغلكم {الجملة المحددة}. الورقة فيها رمز، بتفتح صفحة خاصة إلكم فيها فيديو ٣٦ ثانية ورقمكم المحفوظ من خمسين. مين عندكم بيدير حسابات السوشيال ميديا؟ بحب الورقة توصله هو. ممكن آخذ اسمه ورقم واتساب حتى أبعت الرابط نفسه؟ شكراً، ما بأخذ من وقتكم أكثر.

**Leave behind:** the letter in its envelope (plus the freelancer card where relevant). Nothing else: no brochure, no price list.

**Ask for:** the name of the person who runs their social accounts, and permission to WhatsApp that person about this invitation. Note the name in Admin → Prospects; keep the phone number on the owner's phone only, never in the notes (docs/08, docs/55).

**Do not:**
- talk pricing, commissions or percentages (none are public; docs/10, marketing/08);
- promise clients, leads, requests or "being first in search";
- compare them with another agency, or name who else has claimed without that agency's consent;
- ask them to open the link while you stand there; the letter does the asking;
- leave a letter with a guard or at an empty front desk: come back.

## 6. On-site expectations and the admin page

What the invitee sees after scanning `sawwiq.org/i/<code>` (Arabic by default, English offered, phone-first):

1. **Video** (36 s, captioned, plays muted) with the Sawwiq mark; no autoplay audio.
2. **Number**: «عضو مؤسس رقم ٠١٢ من ٥٠ محفوظ لـ {الاسم} لغاية {date}» and, below, the count of seals already claimed; names only with consent.
3. **Claim**: one button, «أطالب بختمي». An expired or already-claimed code shows a calm message and the ordinary `/join` link, never an error page.
4. **Join**: the normal `/join` with the invitation attached; the seal is bound to the account at creation, in the same transaction as its private `profile_publications` row.
5. **Setup**: the five-step first run (docs/53). The Studio shows the seal and the existing Founder status panel; the two are different things and the copy says so.

Build notes: the code is a random token, single-claim, time-boxed; voiding and reissuing a code is an audited admin action; the code-to-invitee link and scan counts are a new data row, so add the docs/08 table line (invitee business name or person's name, code, scans without IP; retention until campaign end + 12 months) before it ships. The landing page must pass `tests/registration/campaign.spec.ts` truth rules.

What Admin → Prospects must show so the owner can act (one row per prospect, no phone numbers or emails):

| Column | Values |
|---|---|
| Name, wave, social lead's name | from the prospect row |
| Invitation code, Founding Member number | reserved / claimed / expired / voided |
| Letter delivered | date (one tap) |
| Scans | count · first · last |
| Claimed | date, account linked |
| Page progress | profile · first project · visibility chosen |
| Follow-ups | WhatsApp 1 sent · WhatsApp 2 sent (owner ticks; a reminder shows when due) |

Header totals: delivered, scans, claims, claim rate, pages complete, numbers left in the reserve.

## 7. Risks and honest answers

| They ask | Honest answer |
|---|---|
| "Is this just a directory?" | Today it is your private portfolio page. When discovery opens, business requests are matched to pages by relevance to the request, not by payment or by who joined first. Nobody pays to be listed. |
| "Who else is on it?" | "I am inviting fifty names in Amman by hand. I name others only with their permission; a few have agreed: {names, if any}." Never pad. |
| "Can you pull from our Instagram?" | Not yet. The connections are built but wait for the platforms' approval of our developer apps (docs/53), so no Connect button is live. Meanwhile I stage your page from public links, a PDF or Behance, and you review everything before it is saved. |
| "What does the seal give?" | A permanent numbered mark on your page and posts, and an early window on business requests relevant to you when discovery opens. It never changes ranking and never carries money. |
| "Can we lose it?" | Only if the page is removed, by you or for a serious policy breach. It does not expire. |
| "Does it cost anything?" | Registration and the page are free during this phase; no card is asked. Pricing, if any, comes later and will be published first. The seal itself never has a price. |
| "Is this the Founder program?" | No. Founder benefits have their own rules and eligibility (docs/44) and apply whether or not you hold a seal. The seal changes none of that. |
| "Can I have a lower number?" | Numbers follow the order the letters went out. |

Owner-side risks: the letter stops at reception (always get the social lead's name); a QR that will not scan (print the URL; test with three phones); a code forwarded to someone else (single claim, voidable by admin, audited); an invitee who feels pressured (two chasers, then silence, and offer to release the number without embarrassment); a claim with no page behind it (the staging offer; "pages complete" is the metric that matters).

## 8. Checklist before wave 1

**Product**
- [ ] `/i/<code>` live in production: video plays muted with Arabic captions, number and expiry correct, claim → join → setup works on a phone at 390 px in Arabic; expired and claimed states checked.
- [ ] Seal shows on the page and posts in the Studio preview; Founder panel copy unchanged.
- [ ] Admin → Prospects shows the §6 columns and totals; "letter delivered" is one tap.
- [ ] Ten codes generated, numbers 001–010 reserved to named prospects, Muhannad's details filled in.
- [ ] Owner timed the full claim-to-first-project path on his own phone; the letter says "one sitting", not a minute count, until that time is measured.
- [ ] docs/08 line added; registration truth tests pass; nothing public counts or names anyone without consent.

**Print**
- [ ] Letter proofread in both languages by a second reader; number line and dates printed; URL under each QR.
- [ ] Three phones scan every QR to the right code.
- [ ] Envelopes labelled; freelancer cards for the names that need them; a pen for the handwritten sentence.

**Owner**
- [ ] One specific sentence per agency on why they were chosen.
- [ ] WhatsApp 1, thank-you and WhatsApp 2 saved as drafts; phone numbers stay on the phone.
- [ ] Route and order of the ten visits fixed; expiry dates computed from each delivery date.
- [ ] Decision rule noted: fewer than 3 of 10 claims after the window → revise before wave 2.
