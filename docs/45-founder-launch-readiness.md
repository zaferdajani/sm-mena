# 45 · Founder launch readiness

## North-star launch gate

Do not optimize for raw registrations. The first supply milestone is **50 launch-ready Founder profiles**.

A launch-ready Founder is a real, active, non-demo provider inside the founding cohort, with a complete core profile (bio + approved service) and proof (at least one genuine published work item or useful package). KYC/payment eligibility is checked separately when protected payments go live.

Track: soon visitor → join started → registered → core profile complete → proof added → Founder eligible → opportunity viewed → proposal → contract → funded/released milestone → repeat project.

Never call an email signup a launch-ready Founder.

## Approved Founder economics

- First completed Sawwiq-acquired protected project: **0% Sawwiq platform commission**.
- Then **7%** for the first 365 days after live protected-payment activation.
- Payment-provider charges/taxes are separate.
- Existing-client Founder infrastructure fee remains **TBD** until real partner costs are known.
- Founder status never changes relevance scores or quality ranking.
- Eligible Founders get a **24-hour visibility head start** on otherwise relevant open opportunities during launch.
- Six months Pro begins when Pro actually launches.

## How the code enforces it

- **Activation gate** (`founderEligibility` in `lib/founding.ts`): founding cohort seat, active non-demo provider, bio + at least one service, and one published work item or one package. Read from the database at decision time, never from the caller. Studio shows "activated" or what is still missing.
- **24-hour head start** (`lib/data/requests.ts`): the opportunities feed, its "new" badge, the single-opportunity page and the invitation notification all use the same cutoff. A non-founder's invitation is written when the brief is created but dated for the moment it may open it, so nobody is alerted to a brief they cannot see and nobody misses it. Match scores are stored once per brief and never change with founder status. Demo agencies are the owner's fixtures and are exempt. `FOUNDER_HEAD_START_UNTIL` (ISO date) ends the head start without a deploy; while it is unset the head start stays on.
- **0% then 7%** (`founderFeeDecision` in `lib/founding.ts`, applied in `createContract`): only on a protected contract that came from a Sawwiq brief or proposal, while real protected payments are live, between `FOUNDING_ACTIVATED_AT` and 365 days later. Direct contracts carry no Sawwiq fee at all; an agency's own client paid through Sawwiq pays the standard rate.
- **One waiver, ever, per agency**: the 0% contract is marked `founder_waiver` and a partial unique index (`contracts_founder_waiver_idx`: one non-cancelled waiver contract per agency) makes the database refuse a second one. `createContract` pre-checks, inserts, and if two contracts race the loser is re-created with the 7% founder rate and freshly computed terms before anyone signs. Cancelling the waiver contract (an unsigned draft, or an active one with no money held) frees the waiver for the next Sawwiq-acquired project; the cancelled contract's signed terms are never edited.
- **Not activated in test mode**: `protectedPaymentsLive()` is false until a real payment partner is configured and `PROTECTED_PAYMENTS_LIVE=true`; until then every contract carries the standard fee and `payments_live=false`.

## Acquisition copy

### Jordan / WhatsApp

**شغلك مرتب؟ خلّيه يبين قبل ما نفتح سوّق للعملاء.**

سوّق عم يجمع وكالات التسويق، الفريلانسرز، المصورين، المصممين وصنّاع المحتوى بمكان واحد. العميل يحكي شو محتاج، والمنصة تساعده يوصل للناس المناسبة. وإذا أخذت مشروع وناقصك حدا، بتلاقي شركاء من نفس الشبكة.

المؤسسون المؤهلون إلهم أفضلية حقيقية: أول مشروع يجي من سوّق بدون عمولة منصة، بعدها 7% لأول سنة من الدفعات المحمية، سبق 24 ساعة على الفرص المناسبة خلال الإطلاق، و6 أشهر Pro من يوم إطلاقه.

**التسجيل مجاني قبل الإطلاق.** ما بنوعدك بعملاء مضمونين؛ بنعطيك مكان جاهز وفرصة تبدأ معنا قبل ما يدخل العملاء.

### Saudi / WhatsApp

**شغلك يستاهل يبان قبل ما نفتح سوّق لأصحاب المشاريع.**

سوّق يجمع الوكالات والمستقلين وصنّاع المحتوى في شبكة واحدة: تعرض شغلك، توصل للطلبات المناسبة، وإذا احتجت مصوّر أو مصمم أو مختص إعلانات لمشروعك تلقى شريك من داخل الشبكة.

للمؤسسين المؤهلين: أول مشروع يجيك من سوّق بدون عمولة منصة، بعدها 7% لأول سنة من الدفعات المحمية، نافذة مبكرة 24 ساعة للفرص المناسبة وقت الإطلاق، و6 أشهر Pro من يوم إطلاقه.

**الدخول قبل الإطلاق مجاني.** ما فيه وعد بعملاء مضمونين؛ فيه أفضلية عملية للناس اللي تساعد الشبكة تبدأ.

### Egypt / WhatsApp

**شغلك حلو؟ خلّيه يتشاف قبل ما نفتح سوّق لأصحاب البيزنس.**

سوّق شبكة للوكالات، الفريلانسرز، المصورين، الديزاينرز وصنّاع المحتوى. تعرض شغلك، توصل لطلبات مناسبة، ولو خدت مشروع ومحتاج حد يكمل الفريق تلاقيه جوه الشبكة.

للمؤسسين المؤهلين: أول مشروع ييجي من سوّق من غير عمولة منصة، بعدها 7% لأول سنة من الدفعات المحمية، 24 ساعة أسبق في الفرص المناسبة وقت الإطلاق، و6 شهور Pro من يوم إطلاقه.

**التسجيل مجاني قبل الإطلاق.** مفيش وعد بعملاء مضمونين؛ فيه بداية أقوى للناس اللي تدخل وهي جاهزة.

### Instagram Reel / Story

Hook: **قبل ما نجيب أصحاب الشغل… بدنا الناس اللي بتعرف تعمله.**

Shots: agency reading a brief → creator on set → designer/media buyer working → Sawwiq profile/opportunity → project team collaborating.

On-screen: خلّي شغلك يبين · خذ فرص مناسبة · كمّل فريق المشروع · أول مشروع 0% عمولة سوّق · بعدها 7% لأول سنة · 24 ساعة أسبق على الفرص المناسبة · 6 أشهر Pro · سجّل قبل الإطلاق.

Caption: **مش رقم على قائمة. أفضلية لأنك ساعدتنا نبدأ.**

### LinkedIn

Sawwiq is building the provider side before opening demand: agencies, freelancers, creators, photographers, designers and specialist marketers first; buyers second. Founders publish useful profiles and real proof of work. Qualifying Founders receive launch economics and opportunity access without compromising relevance-based matching.

## Guardrails

Never use guaranteed clients/leads, "best because you joined first", 180M audience, race of cities, founding-seat scarcity, or paid priority presented as organic relevance.
