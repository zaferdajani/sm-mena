# 33 · Protected payments: the go-live pack

This is the owner's pack for turning on real protected payments. It is written for the founder, not for engineers.

**Protected payment** means: the client pays each milestone to a licensed payment partner. The partner holds the money. When the client accepts the milestone, the partner pays the agency, minus Sawwiq's fee. Sawwiq never holds client money itself.

Related: docs/14-contracts-and-milestones.md (how contracts work), docs/32-payment-partner.md (the partner plan), docs/22-legal-documents.md (the legal texts).

---

## a. Where things stand

- **Everything is built.** Milestone payments, payouts to agencies, refunds, disputes with one appeal, mutual cancellation, receipts in Arabic and English, and chargeback alerts all work end to end.
- **It runs in test mode.** No real money moves. Every contract, payment screen and receipt says "test mode". Test entries are labelled and never counted in real totals.
- **No partner is connected yet.** The only payment "provider" today is the built-in test checkout (`mock`). A template for the real one is ready in `lib/payments/partner-template.ts`.
- **Two switches must both be on for real money.**
  1. **Admin → Features → "Protected payments".** Three states:
     - **on**: everyone can use it;
     - **coming soon** (today's default): shown as "Coming soon"; only the pilot agencies you list (by handle) can use it; staff can preview it;
     - **off**: hidden; contracts already signed keep working.
  2. **The server settings** (environment variables, set through GitHub → Actions → Vercel): `PROTECTED_PAYMENTS_LIVE=true` **and** `PAYMENTS_PROVIDER=<partner>` (a real partner, not `mock`). If either is missing, payments stay in test mode.
- **Until then, contracts use direct payment.** While "Protected payments" is coming soon (and the agency isn't a pilot) or off, new contracts are sent as **direct**: the client pays the agency, Sawwiq keeps the contract, checklists and review deadlines, and charges no fee. The contract's payment section says so in Arabic and English.
- **The go-live checklist is in Admin → Features.** Tick the steps you finish outside the platform (partner chosen, signed, lawyer, fee account, sandbox test, pilots, dispute cover); the technical ones are checked automatically.
- **Each contract remembers its mode.** A contract sent in test mode stays a test contract forever. Only contracts sent after the switch use real money.
- **Sawwiq's fee** is 10% of what is paid to the agency (`PLATFORM_FEE_PERCENT`). Nothing refunded to a client carries a fee. No fee is charged in test mode.
- **Safety nets are built in.** Every payment is recorded once only, even if a button is pressed twice or a message arrives twice. Failed payouts are retried daily, then shown to admins.

---

## b. Step-by-step to go live

Tick each step in order. Don't skip the lawyer.

1. **Choose the partner.** Send the letter in section c to PayTabs and HyperPay. Compare their written answers.
   - PayTabs (Jordan, has split payouts) is the first candidate.
   - HyperPay (Jordan and the Gulf) is the second.
   - Fallback: a Jordanian bank's escrow service, paying agencies by CliQ (Jordan's instant bank transfer). Slower and more manual, but clearly legal.
   - Tap Payments is for a later Saudi/UAE phase, not the first partner.
2. **Sign with the partner.** Get their merchant agreement and their marketplace (split payout) terms in writing.
3. **Legal review.** Give the lawyer the brief in section d, plus the partner's contract. Wait for written approval and any edits.
4. **Get sandbox keys.** A **sandbox** is the partner's practice environment: fake cards, no real money. Add the keys as **GitHub secrets** (GitHub → the repository → Settings → Secrets and variables → Actions). **Never paste keys in chat, email or WhatsApp.**
5. **Claude builds the adapter.** An **adapter** is the small piece of code that talks to the partner. Claude copies the template into `lib/payments/<partner>.ts`, fills it in from the partner's API docs, registers it, and adds the new secrets to the deploy workflow.
6. **Test in the partner's sandbox.** Run the whole flow with fake cards: pay a milestone, deliver, approve, pay out; ask for changes; dispute and split; cancel with a refund; a late payment; a chargeback. Check every receipt and the admin page.
7. **Pilot with invited agencies.** Admin → Features → "Protected payments": keep it on **coming soon** and add 3 to 5 trusted agencies to the pilot list. Switch the server settings to live keys. Start with small milestones. Watch Admin → Payments every day for two to four weeks.
8. **Switch on for everyone.** Admin → Features → "Protected payments" → **on**. Update the landing page and announce it.

The first real payment happens in step 7, from a pilot agency's client.

---

## c. Letter to payment partners

Send the same letter to each partner. Replace everything in [brackets].

### English

> **Subject:** Marketplace payments with held funds and split payouts — Sawwiq (Jordan)
>
> Dear [Partner] team,
>
> I am the founder of Sawwiq (سوّق), an Arabic-first marketplace that connects businesses with marketing agencies. We are launching in Jordan, then Saudi Arabia, the UAE and Egypt.
>
> Clients hire agencies on Sawwiq under signed contracts split into milestones. We want each milestone payment to be held by a licensed partner until the client accepts the work. Sawwiq does not want to hold client money at any point. We are looking for a partner to hold funds and pay out on our instructions.
>
> **The flow we need**
>
> 1. **Pay-in.** The client pays one milestone through your hosted checkout. We send our own reference for each milestone.
> 2. **Holding.** You hold the payment until we instruct you, for up to 60 days per milestone.
> 3. **Release.** When the milestone is accepted, we instruct you to pay out. One payment is split into the agency's share and Sawwiq's fee (10% of the released part).
> 4. **Refunds.** A milestone may be refunded in full or in part. Sometimes one payment is split three ways: part to the agency, Sawwiq's fee on that part, and the rest refunded to the client.
> 5. **Idempotency.** Every payout and refund instruction carries a unique idempotency key. A repeated instruction must never move money twice.
> 6. **Signed webhooks.** We need signed notifications (for example HMAC-SHA256) for: payment succeeded or failed, payout succeeded or failed, refund succeeded or failed, and chargeback opened. Each notification should carry a unique event id and our reference.
> 7. **Agency onboarding.** Agencies are the payees. We would like you to host their onboarding and identity checks (KYC), and give us an account id for each approved agency.
> 8. **Currencies.** Jordanian dinar (JOD) first. Saudi riyal (SAR) and UAE dirham (AED) later.
> 9. **Sandbox.** We would like sandbox access to build and test the integration before going live.
>
> **Our questions**
>
> 1. Which licence do you hold, from which regulator, and does it cover holding funds for a marketplace?
> 2. What is the longest you can hold a payment before paying out? Can it be 60 days or more?
> 3. Do you support split payouts to several parties from one payment (agency, platform fee), and partial refunds of the rest?
> 4. How does agency onboarding and KYC work? Is it hosted by you? What documents do agencies need? How long does approval take?
> 5. What are your fees for: pay-in (cards, local methods), payout, refund, and chargeback? Are there monthly or setup fees?
> 6. How long does settlement take to an agency's bank account after we instruct a payout?
> 7. Which currencies can clients pay in, and which currencies and countries can agencies be paid in?
> 8. What name appears on the client's card statement (statement descriptor)? Can it include "Sawwiq"?
> 9. Do you accept our idempotency key on payouts and refunds? How are webhooks signed, and are they retried?
> 10. How are chargebacks handled while funds are held, and after they are paid out?
> 11. Please share your API documentation and the steps to get sandbox access.
>
> I would be glad to arrange a call at your convenience.
>
> Kind regards,
> [Your name]
> Founder, Sawwiq (سوّق)
> [Company legal name and registration number]
> [Phone] · [Email] · [Website]

### العربية

> **الموضوع:** مدفوعات منصة وسيطة مع حفظ المبالغ وتقسيم التحويلات — سوّق (الأردن)
>
> السادة فريق [اسم الشريك] المحترمين،
>
> تحية طيبة وبعد،
>
> أنا مؤسس منصة سوّق، وهي منصة عربية أولًا تربط الشركات بوكالات التسويق. نبدأ في الأردن، ثم السعودية والإمارات ومصر.
>
> يتعاقد العملاء مع الوكالات على سوّق بعقود موقّعة مقسّمة إلى مراحل. ونرغب في أن يحفظ شريك مرخّص مبلغ كل مرحلة إلى أن يقبل العميل العمل. لا تريد سوّق أن تحتفظ بأموال العملاء في أي وقت، ولذلك نبحث عن شريك يحفظ المبالغ ويحوّلها بناءً على تعليماتنا.
>
> **آلية العمل المطلوبة**
>
> 1. **الدفع:** يدفع العميل مبلغ مرحلة واحدة عبر صفحة الدفع المستضافة لديكم، ونرسل مرجعًا خاصًا بنا لكل مرحلة.
> 2. **الحفظ:** تحفظون المبلغ إلى أن نرسل التعليمات، لمدة تصل إلى 60 يومًا لكل مرحلة.
> 3. **التحويل:** عند قبول المرحلة نطلب منكم التحويل، ويُقسَّم المبلغ إلى حصة الوكالة ورسوم سوّق (10٪ من الجزء المحوَّل).
> 4. **الاسترداد:** قد يُعاد مبلغ المرحلة إلى العميل كليًا أو جزئيًا. وقد يُقسَّم المبلغ الواحد ثلاثة أجزاء: جزء للوكالة، ورسوم سوّق على هذا الجزء، والباقي يُعاد إلى العميل.
> 5. **منع التكرار:** تحمل كل تعليمات تحويل أو استرداد مفتاحًا فريدًا (Idempotency Key)، ويجب ألا يؤدي تكرار التعليمات إلى تحريك المبلغ مرتين.
> 6. **إشعارات موقّعة:** نحتاج إلى إشعارات موقّعة (مثل HMAC-SHA256) عند: نجاح الدفع أو فشله، ونجاح التحويل أو فشله، ونجاح الاسترداد أو فشله، وفتح اعتراض على عملية بطاقة (Chargeback). ويحمل كل إشعار رقمًا فريدًا ومرجعنا.
> 7. **تسجيل الوكالات:** الوكالات هي الجهات المستفيدة من التحويل. نرغب في أن تستضيفوا تسجيلها والتحقق من هويتها (اعرف عميلك KYC)، وأن تزوّدونا برقم حساب لكل وكالة معتمدة.
> 8. **العملات:** الدينار الأردني أولًا، ثم الريال السعودي والدرهم الإماراتي لاحقًا.
> 9. **بيئة الاختبار:** نرغب في الحصول على بيئة تجريبية (Sandbox) لبناء الربط واختباره قبل التشغيل الفعلي.
>
> **أسئلتنا**
>
> 1. ما الترخيص الذي تحملونه، ومن أي جهة رقابية، وهل يشمل حفظ الأموال لصالح منصة وسيطة؟
> 2. ما أطول مدة يمكنكم فيها حفظ المبلغ قبل تحويله؟ وهل تصل إلى 60 يومًا أو أكثر؟
> 3. هل تدعمون تقسيم المبلغ الواحد بين أكثر من جهة (الوكالة ورسوم المنصة)، واسترداد الباقي جزئيًا؟
> 4. كيف يتم تسجيل الوكالات والتحقق من هويتها؟ هل تستضيفونه أنتم؟ ما المستندات المطلوبة، وكم يستغرق الاعتماد؟
> 5. ما رسومكم على: الدفع (البطاقات ووسائل الدفع المحلية)، والتحويل، والاسترداد، والاعتراض على عمليات البطاقات؟ وهل توجد رسوم شهرية أو رسوم تأسيس؟
> 6. كم يستغرق وصول المبلغ إلى حساب الوكالة البنكي بعد طلب التحويل؟
> 7. ما العملات التي يمكن للعملاء الدفع بها، وما العملات والدول التي يمكن التحويل إليها؟
> 8. ما الاسم الذي يظهر في كشف بطاقة العميل؟ وهل يمكن أن يتضمن اسم "سوّق"؟
> 9. هل تقبلون مفتاح منع التكرار الخاص بنا في التحويلات والاستردادات؟ وكيف توقَّع الإشعارات، وهل يُعاد إرسالها عند الفشل؟
> 10. كيف تُعالَج الاعتراضات على عمليات البطاقات أثناء حفظ المبلغ وبعد تحويله؟
> 11. نرجو تزويدنا بوثائق الربط البرمجي (API) وخطوات الحصول على بيئة الاختبار.
>
> يسعدني ترتيب اتصال في الوقت الذي يناسبكم.
>
> وتفضلوا بقبول فائق الاحترام،
> [اسمك]
> المؤسس، سوّق
> [الاسم القانوني للشركة ورقم التسجيل]
> [الهاتف] · [البريد الإلكتروني] · [الموقع الإلكتروني]

---

## d. Brief for the lawyer

Give the lawyer this section, the partner's contract, and printouts of the texts below. Ask for written answers and tracked edits.

**Who we are.** Sawwiq is a marketplace. Agencies sign milestone contracts with clients on it. Sawwiq does not do the marketing work. Sawwiq never holds client money: a licensed payment partner holds it and pays it out on Sawwiq's instructions.

### What to review

| Topic | Where the text lives |
|---|---|
| Contract general conditions, version **2026-10** (terms v4), Arabic and English | `lib/legal/clauses.ts` |
| The payment section in each state: **live** (partner holds the money, fee applies), **test** (simulation, no money, no fee), and **direct** (client pays the agency directly, no fee; used while protected payments are off or "coming soon") | `lib/legal/payment-holder.ts` (`PAYMENT_SECTION`, `PAYMENT_DIRECT`) |
| Country annex: governing law, courts, e-signature, data protection, VAT | `lib/legal/jurisdictions.ts` |
| Receipts (not tax invoices) | `lib/legal/receipt.ts` |
| Privacy notice and terms page | `/legal` page; text in `messages/ar.json` and `messages/en.json` (section "Legal") |
| How it all works, in plain words | `docs/14-contracts-and-milestones.md`, `docs/22-legal-documents.md`, `docs/08-legal-compliance.md` |
| The partner's merchant and marketplace contract | From the partner |

**Points in the texts to check:**

1. **Who holds the money.** The live text names "Sawwiq's licensed payment partner" as holder. Sawwiq never holds funds in its own accounts.
2. **Deemed acceptance.** If the client does not accept, ask for changes or dispute within the review period (7 days by default, 3 to 30), the milestone counts as accepted and is paid out. Reminders go out 2 days and 1 day before.
3. **Revision rounds.** Each milestone includes 0 to 10 rounds of changes (2 by default). Extra rounds are free if the agency agrees, or a paid change request.
4. **Dispute decisions.** Sawwiq's team decides on held money only: release all, refund all, or split. Written reasons. **One appeal** within 7 days, then the decision is final. Courts stay open to both sides.
5. **Cancellation splits.** While money is held, one side proposes a split per milestone (default: full refund of undelivered work). The other side accepts, or either opens a dispute.
6. **Chargebacks.** The client stays liable for accepted work. If the partner recovers an amount from Sawwiq after a payout, Sawwiq may deduct it from the agency's **future payouts only**, after notice with details and **14 days** to contest. No interest or penalty.
7. **IP transfer per milestone.** Economic rights pass to the client when that milestone is paid to the agency in full; partly, for a split or cancellation.
8. **Limits of protection.** Sawwiq covers delivery of the checklist, not business results, ad platforms or money paid outside the platform. In test mode Sawwiq guarantees nothing.
9. **Fee.** 10% of the part paid to the agency. Nothing on refunds.
10. **Privacy.** Jordan's Personal Data Protection Law No. 24 of 2023 (PDPL). Payment data goes to the partner; Sawwiq keeps the contract record and ledger.

### Questions to ask the lawyer

1. **Licensing.** Given that the partner holds all funds, is Sawwiq's role a commercial agent or a technical platform that does **not** need a Central Bank of Jordan (CBJ) licence? Does sending payout and refund instructions change that?
2. **Deemed acceptance.** Is acceptance after the review period enforceable in Jordan, against businesses and against individual consumers? Is 7 days reasonable?
3. **Dispute decisions.** Can Sawwiq decide on held funds, with one appeal, without this being treated as arbitration? Is the wording on keeping court access right?
4. **Chargeback recovery.** Is deducting from the agency's future payouts (with notice and 14 days) enforceable? Does it need separate agency consent?
5. **Consumer protection.** Which rules apply when the client is an individual (Consumer Protection Law)? Do any clauses need changing for consumers?
6. **E-signatures.** Is a typed name plus a drawn signature, with a fingerprint of the terms, valid under the Electronic Transactions Law No. 15 of 2015 (as amended)? Do we need OTP confirmation or anything more?
7. **Tax.** Is VAT/general sales tax (16% in Jordan) due on Sawwiq's fee? Who invoices whom? Does the agency's price include tax? Do we need e-invoicing (JoFotara)?
8. **Record retention.** How long must we keep contracts, signatures, ledger entries, receipts and dispute evidence?
9. **The partner's contract.** Is liability between Sawwiq, the partner and agencies fair? Who bears chargeback losses and fraud?
10. **Privacy notice.** Does it cover sharing data with the payment partner, KYC by the partner, and transfers outside Jordan?
11. **Gulf and Egypt.** What changes before launching in Saudi Arabia, the UAE and Egypt?

---

## e. What Claude needs from you to finish

1. **The partner's name** and the signed agreement (or a note that it is signed).
2. **Sandbox API keys, added as GitHub secrets.** Never paste them in chat, email or WhatsApp. Names:
   - `PAYMENTS_PARTNER_KEY`: the partner's secret API key;
   - `PAYMENTS_PARTNER_BASE_URL`: the partner's API address (sandbox first);
   - `PAYMENTS_WEBHOOK_SECRET`: the secret the partner uses to sign its notifications;
   - any extra id the partner gives (for example `PAYMENTS_PARTNER_MERCHANT_ID`).
3. **A link to the partner's API docs** (checkout, split payouts, refunds, webhooks, onboarding/KYC).
4. **The webhook address to register with the partner.** Claude will give you this: `https://<your domain>/api/payments/webhook/<partner>`.
5. **The lawyer's approved edits**, in writing, for the contract texts and the privacy notice.
6. **Live keys**, only after the sandbox tests pass. Same secret names; you replace the values.
7. **The pilot list**: the handles of 3 to 5 agencies you trust.

---

## f. After go-live: daily routine

**Every morning (10 minutes), Admin → Payments → Protected client payments:**

1. **Disputes.** Open each one. Read both sides' evidence and the checklist. Decide: release all, refund all, or split. Always write clear reasons. Remember: either side can appeal once within 7 days; the second decision is final.
2. **Payouts and refunds needing attention.** These failed 5 times or are still pending after 3 days. Check the partner's dashboard, fix the cause (often agency bank details), and contact the agency.
3. **Totals.** The held amount on the page should match the partner's dashboard. If not, tell Claude.

**Chargebacks** (when a client's bank reverses a card payment):

1. You'll see `escrow.chargeback_opened` in Admin → Audit.
2. Answer the partner with evidence: the signed contract, the checklist, delivery notes and the acceptance date.
3. If the chargeback is upheld after the agency was paid, tell the agency in writing with the details. Give it **14 days** to contest. Only then deduct it from its **future** payouts on Sawwiq. Nothing else is ever deducted.

**Every month:**

- Admin → Payments → Protected → "Download test transactions (CSV)" if you need the test history (for your accountant or an audit). Test entries are kept and never counted as real money.
- Compare Sawwiq's fees with the partner's statement.
- Review the pilot list and the Features switch.

**If something looks wrong,** go to Admin → Features → "Protected payments":
- **coming soon** limits it to the pilot agencies;
- **off** stops it for new contracts for everyone.

Either way, signed contracts keep working, and money already held stays with the partner.
