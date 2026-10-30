# Council seat: UX writer and information architect (Arabic / English)

Scope: every label, heading, helper, button and error on the agency journey (landing CTA → join → portfolio wizard → studio → going public), plus the Studio navigation. Evidence: `walkthrough.md`, shots 01–74, `messages/ar.json` / `en.json` (namespaces `Auth`, `Partners.form`, `Setup`, `CreatorSetup`, `Registration`, `Studio`, `LangOffer`, `BehanceImport`, `Social`), `components/studio/studio-nav.tsx`, `app/[locale]/(main)/studio/layout.tsx`, `components/registration/studio-shell.tsx`. No repo files changed.

Ground rules I kept: Arabic first and RTL; each proposal comes in both languages; the 18+ box, the consent box and its version, the rights box and the visibility acknowledgement all stay. Legal and compliance wording is **flagged, not rewritten** (section 9). Arabic proposals use short, plain Modern Standard Arabic that reads naturally in Jordan, with no dialect.

---

## 0. What is wrong, in one paragraph

The owner's words were "not direct, complicated". The copy makes this worse in four ways. (1) **Too many names for one thing.** A single piece of work is called مشروع، عمل، منشور، منشور أعمال، نموذج عمل، معرض أعمال، ملف أعمال، محفظة أعمال in Arabic, and project, post, work sample, portfolio in English. The page is called صفحة، ملف، ملف تعريفي and page, profile. (2) **The words hide what happens.** "Save my portfolio" does not publish. "Insights" is the label of a home page that has no data. "Source" and "Client" are steps the user does not understand before reaching them. (3) **The same caution is repeated everywhere.** The early-registration notice appears on join, on the studio header, on studio home and on publication. The Behance offer appears in 6 places. The "private until you choose" line appears in about 7 places. The one decision that matters, who can see my page, sits on a fourth tab. (4) **The Arabic register is uneven.** Formal MSA sits beside dialect (لمين عملت هذا الشغل، تعذر علينا نستخدم، ورّيني كيف، ماذا أحط) and there are a few typos. To an Arabic reader this looks unfinished.

---

## 1. Top 5 recommendations

1. **Combine "save" and "go public" into one final step of the wizard.** Its last screen asks "من يرى صفحتك؟ / Who can see your page?" (default stays Private) and keeps the acknowledgement box. The button names the result: "احفظ صفحتي" for private, "انشر صفحتي" for link or public. Remove the separate trip to `/studio/publication`. This saves 4 clicks, 1 page load and the 404 surprise.
2. **Shorten the journey and ask each thing once.** Join: 3 steps become 2 (Your page; Sign-in details). Team, specialty and services leave join. Wizard: 5 steps become 3 (عنك / عملك / النشر, About you / Your work / Publish). Source and Client fold into the project screen. Social connect is hidden while no platform works.
3. **Day-one Studio has 4 tabs, not 9 (or up to 21 after launch):** الرئيسية / أعمالي / صفحتي / الحساب (Home / My work / My page / Account), plus one "+ أضف عملاً / + Add work" button. Every other section appears only when it has something in it (rules in section 7).
4. **Adopt and enforce a 6-word glossary.** صفحتك (your page), عمل/أعمالك (work), عميل (client), خدمات (services), باقات (packages, never used for the subscription plan), نشر (publish = visible to others). Rename everything to match, in both locales. Fix the dialect and the typos (section 8).
5. **Replace native browser bubbles and the generic "something isn't right" banner with inline, field-specific messages in the page language**, shown under the field and next to the button. Make the Studio home checklist honest: show the page's actual status ("صفحتك الآن: خاصة") instead of a tick for a choice the user never made.

---

## 2. Glossary (one word per concept, both locales)

| Concept | Arabic (use) | Arabic (stop using) | English (use) | English (stop using) |
|---|---|---|---|---|
| The public page at /a/handle | **صفحتك** | ملفك، الملف التعريفي، معرض أعمالك، الحساب (for the page) | **your page** | profile, portfolio (as a noun for the page) |
| One piece of work (1–10 images) | **عمل** (pl. **أعمال**); "مشروع" only inside the form as "اسم العمل" | منشور، منشور أعمال، نموذج عمل، قطعة عمل، محفظة أعمال، ملف أعمال | **work** / **a piece of work** ("project" only as the name field) | post, portfolio post, work sample |
| The set of all work | **أعمالك** | معرض أعمالك، محفظة أعمالك | **your work** | portfolio |
| Who it was made for | **العميل** | العلامة، الجهة، سجل عميل | **client** | brand, client record |
| What you sell | **خدماتك** | تخصصاتك (for services), مجال عملك | **services** | specialties (for services) |
| Priced bundles | **باقاتك** | — | **packages** | — |
| Sawwiq subscription | **اشتراكك** | الباقة (clashes with packages) | **plan** | — |
| Visible to others | **منشورة / انشر** | موافقة على النشر العام، الظهور العام | **published / publish** | public publication, disclosure |
| Visible only to you | **خاصة** | معاينة خاصة | **private** | private preview |
| The agency's workspace | **الاستوديو** | — | **Studio** | — |

The username/handle field: call it what it is, **رابط صفحتك / Your page link**, not اسم المستخدم / Username.

---

## 3. Target journey (what the copy below assumes)

| # | Screen | Asks | Required |
|---|---|---|---|
| J1 | Join 1/2 "صفحتك" | You are (agency / freelancer), name, page link, city (country as a small "change" link) | type, name, link, city |
| J2 | Join 2/2 "بيانات الدخول" | WhatsApp, email, password, [agent code behind a link], consent, 18+ | 5 |
| W1 | Wizard 1/3 "عنك" | logo, short intro, services (one place only) | ≥1 service |
| W2 | Wizard 2/3 "عملك" | images (with "or import PDF / Behance" link), work name, your part, client (name + "شخصي / سري" chips), services pre-ticked | 1 image, name, part |
| W3 | Wizard 3/3 "النشر" | preview card, **who can see your page** (3 options, Private preselected), visibility acknowledgement, rights box | rights box, acknowledgement |
| D | Done | "Your page is ready", see my page / add another work / go to Studio | — |

Result: 6 screens instead of 12, roughly 11 clicks instead of 19, 2 page loads into a published page instead of 5, and no question asked twice. Team roles, the "add another specialty" field and the partner-gap note move to صفحتي → "فريقك" (shown later as a "complete your page" prompt). This is a flow decision for the product seats. The copy below works with the current flow too.

---

## 4. Copy, screen by screen

Verdicts: **K** keep · **R** rewrite · **C** cut · **M** move. "(legal)" = flagged, see section 9.

### 4.1 Landing CTA and language bar

| Key | Current EN / AR | V | Proposed AR | Proposed EN |
|---|---|---|---|---|
| Registration.cta | Join the first cohort / احجز مكانك في الدفعة الأولى | R | أنشئ صفحتك مجاناً | Create your free page |
| Registration.freeNote | Free registration and profile creation · No payment card | R | مجاناً · بدون بطاقة دفع · صفحتك خاصة حتى تنشرها | Free · No card · Private until you publish |
| Registration.exampleCta | See an example profile / شاهد نموذجاً للصفحة | R | شاهد مثالاً لصفحة | See an example page |
| Registration.navExamples (bottom bar, logged-in agency) | Examples / نموذج الصفحة | R (logged in only) | صفحتي | My page |
| Registration.navHome | Start here / البداية | R | الرئيسية | Home |
| LangOffer.text/switch/dismiss | "Sawwiq is available in English." shown on **every** Arabic page, truncated | M | Keep the wording, but show it **once** on landing and only when the browser language is English. Never show it inside join, the wizard or Studio, where the header language button is enough. | same |

The two language versions disagree ("reserve your place" against "join the cohort"). Both should name what the user actually gets: a page.

### 4.2 Join (current: `Auth`, `Partners.form`, `Registration.join*`, `BehanceImport.shortcut.join`)

| Key | Current EN / AR | V | Proposed AR | Proposed EN |
|---|---|---|---|---|
| Registration.joinTitle | Get your profile ready. / جهّز صفحتك من البداية. | R | أنشئ صفحتك المجانية | Create your free page |
| (new) join subtitle | — | add | دقيقتان، ثم تضيف أول عمل. | Two minutes, then add your first work. |
| Auth.steps.page.title / hint | Your page / Name, link and where you work | K / R hint | صفحتك — الاسم والرابط والمدينة | Your page — name, link and city |
| Auth.steps.team.* | Team and services | C (moves to wizard and to My page) | — | — |
| Auth.steps.contact.title / hint | Contact and sign-in / WhatsApp, email and a password | R | بيانات الدخول — واتساب والبريد وكلمة المرور | Sign-in details — WhatsApp, email, password |
| Auth.stepOf | Step {n} of {total} | K | الخطوة {n} من {total} | Step {n} of {total} |
| Auth.draftNote | What you type stays on this device until you finish… | R (shorter) | نحفظ ما تكتبه على جهازك حتى تُكمل. | We keep what you type on this device until you finish. |
| Partners.form.kind (move to step 1, first field) | You are / أنت | R | أنت: | You are: |
| Partners.form.agency / agencyHint | An agency or company / A team offering marketing services to clients | R | وكالة أو شركة — فريق يقدّم خدمات تسويق | An agency or company — a team offering marketing services |
| Partners.form.freelancer / hint | A freelancer or creator / Photographer, videographer… | R | مستقل أو صانع محتوى — تعمل وحدك | A freelancer or creator — you work on your own |
| Auth.agencyName | Agency name / اسم الوكالة | R (depends on kind) | اسم الوكالة · (freelancer) اسمك كما يظهر للعملاء | Agency name · (freelancer) Your name as clients will see it |
| Auth.handle | Username / اسم المستخدم | R | رابط صفحتك | Your page link |
| Auth.handleHint | Your page link will look like this: sawwiq.org/a/{handle} | R (show `sawwiq.org/a/` as a fixed prefix inside the field, LTR) | أحرف إنجليزية صغيرة وأرقام. يمكنك تغييره لاحقاً. | Lowercase English letters and numbers. You can change it later. |
| Auth.country | Country / الدولة | R (show as text with a link) | الأردن · غيّر | Jordan · Change |
| Auth.city | City / المدينة | K | المدينة | City |
| Auth.next | Continue / متابعة | K | متابعة | Continue |
| Partners.form.teamQuestion, gapHint, "Add another specialty" + helper | Who do you have in your team? … | M (to My page → فريقك, later) | — | — |
| Auth.joinServices / joinServicesHint | What do you offer? / Pick what applies… | M (asked once, wizard W1) | — | — |
| Auth.whatsapp | WhatsApp number / رقم واتساب | R (add why) | رقم واتساب — يتواصل معك العملاء عليه | WhatsApp number — clients contact you here |
| Auth.phoneCountry | Country code | K | رمز الدولة | Country code |
| Auth.refCode / refCodePlaceholder | Agent code (optional) / If a Sawwiq agent introduced you | M (behind a link; prefill from ?ref) | عندي رمز مندوب | I have an agent code |
| Auth.email | Email | K + hint | البريد الإلكتروني — لتسجيل الدخول واستعادة كلمة المرور | Email — for signing in and password reset |
| Auth.password | Password | K + visible hint | كلمة المرور — ٨ أحرف على الأقل | Password — at least 8 characters |
| Auth.consent | (legal) | K text, flag | — | — |
| Auth.adult | (legal) | K | — | — |
| Auth.joinButton | Create page / إنشاء الصفحة | R | أنشئ صفحتي | Create my page |
| (new) under button | — | add | تبقى صفحتك خاصة حتى تقرر نشرها. | Your page stays private until you decide to publish it. |
| Registration.joinNotice (yellow box) | You are joining the early registration phase… | C on join (the line under the button replaces it; the phase story belongs on the landing page) | — | — |
| Registration.exampleCta inside the notice | See an example profile | C on join | — | — |
| BehanceImport.shortcut.join | Already have a Behance portfolio? … | C on join (offered in W2) | — | — |
| Auth.haveAccount + loginLink | Already have an account? Sign in | K | لديك حساب؟ سجّل الدخول | Already have an account? Sign in |

### 4.3 Join errors (replace native bubbles; show under the field, in the page language)

| New key (suggested `Auth.errors.*`) | AR | EN |
|---|---|---|
| nameRequired | اكتب اسم الوكالة. (freelancer: اكتب اسمك.) | Enter your agency name. (freelancer: Enter your name.) |
| handleRequired | اختر رابطاً لصفحتك. | Choose a link for your page. |
| handleInvalid (current: "Use 3 to 30 lowercase letters…") | R: من ٣ إلى ٣٠ حرفاً إنجليزياً صغيراً أو رقماً، ويمكن استخدام . و _ | 3–30 lowercase English letters or numbers; . and _ allowed. |
| handleTaken | K: هذا الرابط مستخدم. جرّب {suggestion}. | That link is taken. Try {suggestion}. |
| cityRequired | اختر مدينتك. | Choose your city. |
| whatsappRequired | اكتب رقم واتساب. | Enter your WhatsApp number. |
| invalidPhone | K: أدخل رقم هاتف صحيحاً. | Enter a valid phone number. |
| emailRequired / invalidEmail | اكتب بريدك الإلكتروني. / K | Enter your email. / K |
| emailTaken | R: هذا البريد مسجّل. سجّل الدخول بدلاً من ذلك. (link) | This email already has an account. Sign in instead. |
| passwordShort | R: كلمة المرور قصيرة: ٨ أحرف على الأقل. | Too short: use at least 8 characters. |
| consentRequired | K (legal wording unchanged) | K |
| adultRequired | K | K |
| (summary near button) | راجع الحقول المحددة بالأحمر. | Check the fields marked in red. |

Behaviour: focus and scroll to the first error. Do not use English browser bubbles on an Arabic page.

### 4.4 Wizard (`Setup.*`), target 3 steps

| Key | Current EN / AR | V | Proposed AR | Proposed EN |
|---|---|---|---|---|
| Setup.pageTitle | Set up your portfolio / جهّز معرض أعمالك | R | جهّز صفحتك | Set up your page |
| Setup.steps.* | Profile / Source / Client / Project / Preview (الملف/المصدر/العميل/المشروع/المعاينة) | R (3) | عنك · عملك · النشر | About you · Your work · Publish |
| Setup.stepOf | Step n of 5 | K (n of 3) | الخطوة {n} من {total} | Step {n} of {total} |
| Setup.finishLater | Finish later / أكمل لاحقاً | K | أكمل لاحقاً | Finish later |
| Setup.saveContinue | Save and continue / احفظ وتابع | R | التالي | Next |
| Setup.later | Do this later / لاحقاً | R | تخطَّ | Skip |
| Setup.continue | Continue / تابع | K | تابع | Continue |
| Setup.back | Back | K | رجوع | Back |
| Setup.profile.title | Let's set up your portfolio. / دعنا نجهّز معرض أعمالك. | R | عرّف العملاء بك | Introduce yourself to clients |
| Setup.profile.body | Add your logo or photo and tell us what you do. | R | شعارك، وجملة عن عملك، وخدماتك. | Your logo, one line about your work, and your services. |
| Setup.profile.addPhoto / changePhoto | Add logo or photo / Change picture | K / K | أضف شعاراً أو صورة / غيّر الصورة | Add logo or photo / Change picture |
| Setup.profile.photoHint | Optional. An agency can use its logo… | R | اختياري. | Optional. |
| Setup.profile.name | Name | K (prefilled) | الاسم | Name |
| Setup.profile.bio | Short introduction / تعريف قصير | R | نبذة قصيرة | Short intro |
| Setup.profile.bioPlaceholder | What do you do, and for whom? | R (concrete) | مثلاً: نصمم هويات وحملات للمطاعم في عمّان. | e.g. We design brands and campaigns for restaurants in Amman. |
| Setup.profile.langNote | Written in your page's content language… | C (show only when the content language ≠ interface language) | تكتب هنا بلغة صفحتك ({lang}). | You're writing in your page's language ({lang}). |
| Setup.profile.services | Services you offer / الخدمات التي تقدمها | R | ماذا تقدّم؟ اختر خدماتك | What do you offer? Pick your services |
| Setup.error.noServices | Choose at least one service / اختر خدمة وحدة على الأقل | R (fix dialect) | اختر خدمة واحدة على الأقل. | Choose at least one service. |
| Setup.source.* (title, upload, import, social…) | Where is your work? + 3 cards | C as a step. Upload is the default on W2; import becomes a link; social is hidden while every platform is blocked | — | — |
| (new) W2 import link | — | add | عندك أعمال في ملف PDF أو على Behance؟ استوردها | Work in a PDF or on Behance? Import it |
| Setup.source.staged | Selected: {title}. It stays private until you publish. | R | اخترت: {title} | Selected: {title} |
| Setup.import.pdf / behance / read / useProject / useSelected | PDF portfolio / Behance project / Read / Use this project | R small | ملف PDF / رابط Behance / اقرأ الرابط / استخدم هذا العمل / استخدم الصور المختارة | PDF file / Behance link / Read link / Use this work / Use selected images |
| Setup.import.reading | Reading the PDF on your device… / نقرأ الملف على جهازك… | K | نقرأ الملف على جهازك… | Reading the file on your device… |
| Setup.project.title | Show one piece of work. / اعرض عملاً واحداً. | R | أضف أول عمل لك | Add your first work |
| Setup.project.body | Add the images first, then a name and your part. | R | صورة واحدة تكفي للبداية. | One image is enough to start. |
| Setup.project.media | Images (the first one is the cover) | R | الصور — الأولى هي الغلاف | Images — the first is the cover |
| Setup.project.addImages | Add images / أضف صوراً | K | أضف صوراً | Add images |
| Setup.project.mediaHint | 1–10 related images… saved privately until you publish | R | حتى ١٠ صور من العمل نفسه. | Up to 10 images from the same work. |
| Setup.project.uploading | Uploading… not saved yet. | K | جارٍ الرفع… | Uploading… |
| Setup.project.makeCover / moveEarlier / moveLater / remove | | K | اجعلها الغلاف / قدّمها / أخّرها / احذف | Make cover / Move earlier / Move later / Remove |
| Setup.project.label | Project name / اسم المشروع | R | اسم العمل | Name of the work |
| Setup.project.labelPlaceholder | e.g. Menu-launch campaign | K | مثلاً: حملة إطلاق قائمة | e.g. Menu-launch campaign |
| Setup.project.contribution | Your part, in one or two sentences / دورك، بجملة أو جملتين | R | ماذا عملت أنت فيه؟ | What did you do on it? |
| Setup.project.contributionPlaceholder | e.g. I shot the photos and designed the posts. | K | مثلاً: صوّرت المنتجات وصمّمت المنشورات. | e.g. I shot the photos and designed the posts. |
| Setup.client.title (now a field on W2) | Who did you make this for? / لمين عملت هذا الشغل؟ | R (register) | لمن كان هذا العمل؟ | Who was it for? |
| Setup.client.mode.new / personal / private (chips) | Add a client or brand / Personal or practice work / Keep the client private | R | اسم العميل · عمل شخصي · عميل سري | Client name · Personal work · Confidential client |
| Setup.client.mode.existing | One of my clients / واحد من عملائي | K (when clients exist) | من عملائي | One of my clients |
| Setup.client.name | Client or brand name | R | اسم العميل | Client name |
| Setup.client.publicNote | The client name shows on your public page… | R | يظهر اسم العميل على صفحتك. إن كان العمل سرياً، اختر «عميل سري». | The client's name shows on your page. If it's confidential, choose "Confidential client". |
| Setup.client.modeHint.private | No client is shown. Don't name them in the text either. | K (shorter) | لن يظهر اسم العميل. لا تذكره في الوصف أيضاً. | The client won't be shown. Don't name them in the text either. |
| Setup.client.modeHint.new / personal | Only a name is needed… / Labelled as personal… | C (chip labels say it) | — | — |
| Setup.client.example | Example only: Example café → … | C (it repeats the placeholder) | — | — |
| Setup.client.suggested | The import mentions "{name}"… / الاستيراد **بذكر** | R (typo) | ورد اسم «{name}» في الملف. أضفه فقط إن كان هو العميل. | The import mentions "{name}". Add it only if that's the client. |
| Setup.project.services / otherServices | Services this work shows / Other services | R / K | الخدمات في هذا العمل / خدمات أخرى | Services in this work / Other services |
| Setup.examples.title | See a real example / شاهد مثالاً حقيقياً | R (they are demo agencies; "real" is misleading) | شاهد مثالاً | See an example |
| Setup.project.preview | Preview / معاينة | R | التالي: النشر | Next: Publish |
| Setup.preview.title | This is how your portfolio will look. | R | هكذا ستظهر صفحتك | This is how your page will look |
| Setup.preview.editProfile/Client/Project | Edit profile / Edit client / Edit project | R (one pencil per card area) | عدّل | Edit |
| Setup.preview.visibility_private | Your page is private during registration… | M (replaced by the choice block below) | — | — |
| (new) W3 choice heading | — | add | من يرى صفحتك؟ | Who can see your page? |
| (new) W3 options (short titles; full descriptions = legal, see 9) | Private preview / Anyone with the link / Allow public publication | R titles | أنا فقط (خاصة) · من معه الرابط · الجميع | Only me (private) · Anyone with the link · Everyone |
| (new) one-line summaries | — | add (legal review) | لا يفتحها غيرك. · يفتحها من ترسل له الرابط، ولا تظهر في البحث. · تُفتح الآن، وتظهر في البحث عندما نفتحه. | Nobody else can open it. · Anyone you send the link to can open it; it isn't listed. · Anyone can open it now, and it can be listed when search opens. |
| Registration.publication.acknowledge | (legal) | K, shown under the options | — | — |
| Setup.preview.rights | (legal) / من حقي أعرض هذا العمل | K meaning; flag the Arabic grammar (section 9) | — | — |
| Setup.preview.save | Save my portfolio / احفظ معرض أعمالي | R (label follows the choice) | private: احفظ صفحتي · link/public: انشر صفحتي | private: Save my page · link/public: Publish my page |
| Setup.preview.publish | Publish this project | K for the launch phase | انشر العمل | Publish this work |
| Setup.preview.chooseAudience, Setup.finished.chooseAudience | Choose who can see my page | C (the choice is now on W3) | — | — |
| Setup.finished.titleSaved | Your first project is saved / حُفظ مشروعك الأول | R | صفحتك جاهزة، وهي خاصة | Your page is ready, and it's private |
| Setup.finished.title | Your first project is published | R | صفحتك منشورة | Your page is live |
| Setup.finished.bodySaved | It's on your page, which stays private… | R | لا يراها أحد غيرك. يمكنك نشرها متى شئت من «صفحتي». | Only you can see it. Publish it any time from "My page". |
| Setup.finished.body | You can add more projects and clients… | R | أرسل الرابط لعملائك، أو أضف عملاً آخر. | Send the link to clients, or add another work. |
| Setup.finished.viewPortfolio | View my portfolio | R (primary) | شاهد صفحتي | See my page |
| Setup.finished.another | Add another project | R | أضف عملاً آخر | Add another work |
| Setup.finished.viewProject, anotherClient | View the project / Add another client | C | — | — |
| (new) | — | add | اذهب إلى الاستوديو | Go to Studio |
| (new, when published) | — | add | انسخ رابط صفحتك | Copy your page link |

### 4.5 Wizard errors

| Key | Current | V | Proposed AR | Proposed EN |
|---|---|---|---|---|
| Setup.error.invalid (generic banner) | Something in this step isn't valid… | R; use field-specific messages below, keep this only as a fallback | راجع الحقل المحدد بالأحمر. | Check the field marked in red. |
| (new) clientName | — | add | اكتب اسم العميل، أو اختر «عمل شخصي» أو «عميل سري». | Enter the client's name, or choose Personal work or Confidential client. |
| Setup.error.noProject | Add a project name and one sentence about your part. | R (split per field; show near the button too) | اكتب اسم العمل. / اكتب جملة عن دورك. | Enter a name for the work. / Write one sentence about your part. |
| Setup.error.noMedia | Add at least one image. One is enough. | K | أضف صورة واحدة على الأقل. | Add at least one image. |
| Setup.error.media / avatar | تعذر علينا نستخدم هذه الصورة… | R (dialect) | تعذّر استخدام هذه الصورة. جرّب JPEG أو PNG أو WebP حتى ١٠ ميغابايت. | We couldn't use that image. Try JPEG, PNG or WebP up to 10 MB. |
| Setup.error.behance / pdf | تعذر علينا نقرأ… | R (dialect) | تعذّرت قراءة الرابط. تأكّد منه أو ارفع صورك. / تعذّرت قراءة الملف. جرّب ملفاً آخر أو ارفع صورك. | We couldn't read that link. Check it or upload your images. / We couldn't read that file. Try another or upload your images. |
| Setup.error.item | هذا العنصر ما عاد متاح… | R (dialect) | هذا العنصر لم يعد متاحاً. اختر غيره أو ارفع صورك. | That item is no longer available. Choose another or upload your images. |
| Setup.error.unavailable / source.manualAlternative | يمكنك ترفع صورك… | R (grammar) | يمكنك أن ترفع صورك بدلاً من ذلك. | You can upload your images instead. |
| Setup.error.stale, generic, done, tooMany, duplicate, limit | | K | — | — |

### 4.6 Studio home (`Registration.studio.*`, `CreatorSetup.nudge*`)

| Key | Current EN / AR | V | Proposed AR | Proposed EN |
|---|---|---|---|---|
| Studio.overview (tab) | Insights / الإحصاءات | R | الرئيسية | Home |
| Registration.studio.notice (header box, every Studio page) | This is the profile-preparation phase… | C on every page; show once on Home as one dismissible line | نحن في مرحلة تجهيز الصفحات. حسابك وأعمالك تبقى معك عند الإطلاق. | We're in the page-preparation phase. Your account and work carry over at launch. |
| Registration.studio.eyebrow / title / intro | Your early-access account / Get your profile ready. / Describe your services… | R (status-driven) | before work: «أضف أول عمل لتكتمل صفحتك.» · after: «صفحتك: {status}» | before work: "Add your first work to finish your page." · after: "Your page: {status}" |
| (new) status pill values | — | add | خاصة · بالرابط فقط · منشورة | Private · Link only · Published |
| (new) next-step button | — | add | الخطوة التالية: {action} | Next: {action} |
| Registration.studio.stepsTitle | Start with these steps | R | لتكتمل صفحتك | To finish your page |
| steps.profile.title / body | Introduce your services / A clear introduction… (AR grammar «الأسواق الذي») | R | أضف نبذة وخدماتك | Add your intro and services |
| steps.work.title / body | Add work or a package | R | أضف أول عمل | Add your first work |
| steps.visibility.title / body | Choose your profile visibility / Keeping a profile private is a valid choice… | R; never ticked by default, shows the current state | من يرى صفحتك؟ الآن: {status} · غيّر | Who can see your page? Now: {status} · Change |
| Registration.studio.ownersSoFar / ownersNote | No business owners have registered yet… | K but move under a "What's happening" fold; "none yet" reads as discouraging on day one | — | — |
| Registration.studio.visibilityTitle / preview / visibilityLink | Who can see your profile? / Preview your profile / Publication settings | C (folded into the status pill and "My page") | — | — |
| Pioneer status panel | (legal-ish disclaimers) | M into a collapsed "برنامج الروّاد / Pioneer programme" card; text unchanged | — | — |
| Registration.studio.addWork | Add your work / أضف أعمالك | R | + أضف عملاً | + Add work |
| Registration.studio.addPackage | Services and packages | M (inside My page) | — | — |
| Registration.studio.help | Need help? / تحتاج مساعدة؟ | K (one help entry; remove the floating button overlap on phone) | تحتاج مساعدة؟ | Need help? |
| Registration.studio.archiveTitle (Previous activity) | | Show only if the account has old items | — | — |
| Behance card on Home | Have a portfolio on Behance? … (long) | C after first work; before first work, one line | عندك أعمال على Behance أو في PDF؟ استوردها | Work on Behance or in a PDF? Import it |
| CreatorSetup.nudgeTitle / nudgeBody / openGuide | Not sure what to add first? / ورّيني كيف | R (dialect; shorten) | لا تعرف ماذا تضيف؟ / عملك = صور من مشروع واحد + اسمه + دورك فيه. / أرني مثالاً | Not sure what to add? / A work = images from one job + its name + your part. / Show me an example |
| CreatorSetup.addWork | Add my first work sample / أضيف أول عمل **إلي** | R (broken Arabic) | أضف أول عمل | Add my first work |
| CreatorSetup.editProfile | Complete my profile / أكمّل ملفي | R | أكمل صفحتي | Complete my page |

### 4.7 Publication (if the page stays; it becomes a section in "My page")

| Key | Current | V | Proposed AR | Proposed EN |
|---|---|---|---|---|
| Registration.publication.title | Profile and portfolio visibility / ظهور صفحتك وأعمالك | R | من يرى صفحتك؟ | Who can see your page? |
| .intro | This choice is independent of the launch phase… | R | لن نغيّر اختيارك تلقائياً عند الإطلاق. | We won't change your choice automatically at launch. |
| .choose | Choose who can access your page | C (the title says it) | — | — |
| states.*.title | Private preview / Anyone with the link / Allow public publication | R (as in W3) | أنا فقط (خاصة) / من معه الرابط / الجميع | Only me (private) / Anyone with the link / Everyone |
| states.*.body, acknowledge, mediaNote | (legal) | flag | — | — |
| .save | Save publication choice / احفظ اختيار الظهور | R | احفظ | Save |
| .saved | Your publication choice has been saved. | R | حُفظ. صفحتك الآن: {status} | Saved. Your page is now: {status} |
| .consentError | Choose a visibility setting and acknowledge its effect before saving. | R (inline, not a native bubble) | ضع علامة على مربع الموافقة للحفظ. | Tick the acknowledgement box to save. |

### 4.8 Add work outside the wizard (`/studio/new`, `Studio.form`, `CreatorSetup.*`)

- Rename the tab and title **"منشور جديد / New post" → "أضف عملاً / Add work"** and use the same three fields as the wizard (images, name of the work, your part, client), in the same order and with the same labels. Today the two forms describe the same object with different names and different fields.
- Fold the 11 platform checkboxes, client industry, result, the English version, "This post features an agency's work" and the account picker into one closed group: **"تفاصيل إضافية (اختياري) / More details (optional)"**.
- Guide strip `CreatorSetup.steps.*` ("1. Choose images 2. Explain your work 3. Select a client 4. Choose services"): **keep**, but say "عمل" not "منشور".
- `CreatorSetup.postTitle` «ماذا أحط بهذا المنشور؟» → **«ماذا أضع في هذا العمل؟» / "What goes in this work?"**. Body: **«صور من مشروع واحد لعميل واحد، حتى ١٠ صور. لا فيديو هنا.» / "Images from one job for one client, up to 10. No video here."**
- `CreatorSetup.useStructure` "Use a blank description outline" → **«اكتب لي هيكل الوصف» / "Give me a description template"**.
- `Studio.posts` "My posts / منشوراتي" → **«أعمالي» / "My work"**, and give the page a heading (today it has none).
- `Studio.empty` → **«لم تضف أي عمل بعد.» / "You haven't added any work yet."**. `Studio.firstPost` → **«أضف أول عمل» / "Add your first work"**.
- `Studio.confirmDelete` → **«حذف هذا العمل نهائياً؟» / "Delete this work for good?"**.

### 4.9 Studio "Page" form (`/studio/profile`, about 45 inputs, 7,900 px tall on a phone)

- Rename the tab "الصفحة / Page" → **«صفحتي» / "My page"**, and the save button "حفظ الصفحة / Save page" → **«احفظ التغييرات» / "Save changes"**, made sticky at the bottom.
- Split it into sections, with only the first open: **الأساسيات / Basics** (logo, name, link, intro, city, services) · **من يرى صفحتك؟ / Who can see your page** (moved here) · **خدماتك وباقاتك / Services and packages** (link) · **فريقك / Your team** (kind, team roles, roles you want partners for) · **تفاصيل أكثر / More details** (about, strengths, starting price, countries served, social links, Google rating) · **النسخة الإنجليزية / English version** (4 fields).
- Bug: the translation fields expose raw keys `tr_name`, `tr_bio`, `tr_about`, `tr_strengths` as accessible names. Give them real labels: **الاسم بالإنجليزية / Name in English**, and so on.

### 4.10 Import pages

- `/studio/import` title "Import your PDF portfolio": **«استورد أعمالك من ملف PDF» / "Import work from a PDF"**. Result-screen headings (All images found / Choose from the images / Add logos from the images / Review the posts / Make posts from the images) become 2 steps: **«اختر الصور» / "Choose images"**, then **«راجع الأعمال وانشرها» / "Review and save your work"**.
- `/studio/import/behance`: keep "Read my Behance" → **«اقرأ حسابي على Behance» / "Read my Behance"**. **Hide the bookmarklet section on phones.** On desktop, put it behind **«Behance لا يستجيب؟» / "Behance not responding?"**.
- Behance entry points: 6 → 2. Keep the link on W2 and one link in the "My work" empty state. Cut the join aside, the Studio home card after the first work, the `/studio/new` box (replace with a one-line link) and the setup guide button.

### 4.11 Setup guide (`/studio/setup`, `CreatorSetup.*`)

Cut it as a tab. Its useful content (what goes into one work, the example cards, "before you publish") moves into the Add-work form as a closed **«كيف أضيف عملاً جيداً؟» / "How do I add good work?"** panel. The "two essentials" progress duplicates the Home checklist: cut it. Long explanations to cut or shorten: `clientTitle` / `clientBody` (a client is not a login…), `connectionsTitle` / `connectionsBody`, `existingBody`. These explain internal distinctions the user never asked about.

---

## 5. Messages that repeat (keep one each)

| Message | Where today | Keep it only at |
|---|---|---|
| "Private until you publish" | join notice, join under-button, wizard media hint, staged note, preview note, finished body, studio notice, studio steps, publication | the line under the join button + the W3 choice + the Home status pill |
| Early-registration phase | landing, join, studio header on every page, studio home, FAQ | landing + one dismissible line on Studio Home |
| Behance / PDF import | 6 places | W2 link + My work empty state |
| Services question | join step 2 + wizard step 1 + profile | wizard W1 (+ profile for edits) |
| Progress model | wizard "Step n of 5" + Home 3-item checklist + Setup guide "2 of 2" | wizard stepper during setup; Home checklist afterwards |

---

## 6. Where am I / what next

- **Always visible in Studio:** the page name + a status pill (**خاصة / بالرابط فقط / منشورة**, Private / Link only / Published) + **«شاهد صفحتي» / "See my page"**. The pill opens the visibility choice.
- **One next step at a time** on Home, in this order: add your first work → choose who can see your page → add a package → complete your team and details. Each is a single button, not a grid of 6.
- **Wizard exit:** the done screen offers 3 actions (see my page / add another work / go to Studio), not 5.
- **The phone bottom bar for a signed-in agency:** **الرئيسية · صفحتي · الاستوديو** (Home · My page · Studio). "Example page" is a visitor's link, not an owner's.
- **The floating "مساعدة / Help" button** overlaps content and the bottom bar on phones. Move it into the header (the lifebuoy icon is already there) or into the Account tab.

---

## 7. Studio information architecture

### Today

- Registration phase (`RegistrationStudioShell`): **9 tabs** in a horizontally scrolling strip: الإحصاءات، دليل البداية، الصفحة، إعدادات الظهور، أضف أعمالك، منشوراتي، خدماتك وباقاتك، العملاء، الأمان (Insights, Setup guide, Page, Publication settings, Add your work, My posts, Services and packages, Clients, Security). There is also a "Previous activity" fold with Messages, Contracts, NDAs and Notifications. On phone and on desktop the strip is cut off at the edge.
- Full shell (`studio/layout.tsx`): up to **21 tabs**: Insights, Setup guide, Connected platforms, Page, Packages, New post, My posts, Followers, Clients, Collaborate, Partners, Opportunities, Chats, Notifications, **Messages** (a second inbox beside **Chats**), Reviews, Contracts, NDAs, Plan & billing, Security.
- Naming clashes: «الباقات» (service packages) next to «الباقة والفواتير» (subscription plan). «الرسائل» (Messages) and «المحادثات» (Chats) are two different tabs. "New post" and "My posts" are two tabs for one object. "Insights" is the label of a page that is mostly onboarding.

### Proposed day-one navigation (both phases)

| Tab AR | Tab EN | Contains |
|---|---|---|
| **الرئيسية** | **Home** | status pill, next step, checklist; stats appear here once there is data |
| **أعمالي** | **My work** | list of works, "+ أضف عملاً / + Add work", import links, Clients as a sub-link «العملاء / Clients» |
| **صفحتي** | **My page** | basics, who can see your page, services and packages, team, details, English version, "See my page" |
| **الحساب** | **Account** | email, password, security, closing the account; plan and billing (when monetization is on) |

Plus a primary **«+ أضف عملاً» / "+ Add work"** button in the Studio header (not a tab). Four tabs fit at 390 px with no scrolling, in both languages.

### Show-when rules (hidden on day one)

| Section | Label AR / EN | Appears when | Where |
|---|---|---|---|
| Messages (merge Chats + Messages/inbox) | الرسائل / Messages | first message received, or launch phase ≥ discovery | own tab, with badge |
| Notifications | — | always, as the bell in the header (already there) | header icon; no tab |
| Opportunities (matched requests) | الفرص / Opportunities | discovery phase on **and** the page is published **and** ≥1 opportunity | own tab, with badge |
| Reviews | التقييمات / Reviews | first review or first review invite sent | My page → section, then a tab once there are ≥3 |
| Followers | المتابعون / Followers | ≥1 follower | Home card |
| Clients | العملاء / Clients | always reachable, but as a sub-link under My work | My work |
| Packages | الباقات / Packages | always, as a section | My page |
| Contracts + NDAs | العقود / Contracts (NDAs inside: «اتفاقيات السرية / NDAs») | first contract or NDA exists (or one is received) | one tab; NDAs as a filter |
| Collaborate + Partners (merge) | التعاون / Collaborate | feature gate on **and** the page has ≥1 work | one tab, with badge |
| Connected platforms | المنصات المرتبطة / Connected accounts | at least one platform is actually connectable | My page → section |
| Setup guide | — | never as a tab | Add-work form help panel |
| Plan & billing | الاشتراك والفواتير / Plan & billing | `MONETIZATION_ENABLED` | Account |
| Security | الأمان / Security | always | Account |
| Previous activity (registration archive) | النشاط السابق / Previous activity | the account has old messages, contracts or NDAs | Account |

The busiest mature account then has 7 tabs: Home, My work, My page, Messages, Opportunities, Contracts, Collaborate (+ Account).

---

## 8. Arabic language fixes (register, grammar, typos)

| Key | Current | Fix |
|---|---|---|
| Setup.client.title | لمين عملت هذا الشغل؟ | لمن كان هذا العمل؟ |
| Setup.client.suggested | الاستيراد **بذكر** «{name}» | ورد اسم «{name}» في الملف… |
| Setup.error.media / avatar / behance / pdf | تعذر علينا **نستخدم / نقرأ** | تعذّر استخدام / تعذّرت قراءة |
| Setup.error.item | ما عاد متاح | لم يعد متاحاً |
| Setup.error.noServices | خدمة **وحدة** | خدمة واحدة |
| Setup.error.unavailable, source.manualAlternative | يمكنك **ترفع** | يمكنك أن ترفع |
| Setup.examples.forWhom | لمين | لمن |
| CreatorSetup.openGuide | ورّيني كيف | أرني مثالاً |
| CreatorSetup.addWork | أضيف أول عمل **إلي** | أضف أول عمل |
| CreatorSetup.profileStep | عرّف عن **حالك** و**اختار** | عرّف بنفسك واختر |
| CreatorSetup.postTitle | ماذا **أحط** بهذا المنشور؟ | ماذا أضع في هذا العمل؟ |
| CreatorSetup.mediaLabel | ماذا الصور التي توضع مع بعض؟ | أي الصور تُعرض معاً؟ |
| CreatorSetup.clientLabel | لمين كان الشغل؟ | لمن كان العمل؟ |
| CreatorSetup.projectLabel | ماذا عملت؟ | ماذا أنجزت؟ |
| CreatorSetup.examples.photo.media | لا **يلزم تخلط** … حتى **توصل** | لا تخلط صور عملاء مختلفين لتصل إلى الحد الأقصى. |
| CreatorSetup.focus.images / client | لا يلزم **تضيف** / عندما يكون **مناسب**. مسموح **تتركها** | لا يلزم أن تضيف / عندما يكون ذلك مناسباً. يمكنك أن تتركه فارغاً. |
| CreatorSetup.examplesNote | ليسوا عملاء… لمحفظة أعمالك | ليست لعملاء حقيقيين… إلى أعمالك |
| CreatorSetup.publishReminder | تأكد **إن** الصور… مسموح لك **تعرضها**. لا **تضيف** | تأكّد أن الصور… مسموح لك بعرضها. لا تُضف |
| Registration.studio.steps.profile.body | الأسواق **الذي** | الأسواق التي |
| Registration.values.partners.body | الشبكة **الذي** نبنيها؛ وكالة تحتاج **مصوّر** | الشبكة التي نبنيها؛ وكالة تحتاج مصوّراً |
| Registration.stages.discovery.title | الناس **المناسبة** | الأشخاص المناسبين |
| Registration.faq.free.answer | وما تحتاج بطاقة دفع | ولا تحتاج إلى بطاقة دفع |
| Registration.publication.legacy | يمكنك **تغيّر** | يمكنك تغيير |
| Registration.studio.ownersSoFar (=0) | ما سجّل أصحاب مشاريع بعد | لم يسجّل أصحاب مشاريع بعد |
| Setup.preview.rights (legal, grammar only) | من حقي **أعرض** | من حقّي أن أعرض… (flag to legal: grammar only, meaning unchanged) |
| Studio.billing | الباقة والفواتير | الاشتراك والفواتير (clash with الباقات) |
| BehanceImport.* | بيهانس (Behance)؟ wraps badly in RTL | write **Behance** alone, isolated with `<bdi>` / `dir="ltr"`; drop «بيهانس» and the brackets |

Other rendering fixes: the native file input shows "No file chosen / Choose File" in English on Arabic pages. Use a styled button labelled **«اختر ملفاً» / "Choose a file"** and the file name. Western digits vs Arabic-Indic: today ٨ appears in one place and 18 in another. Pick one style (I suggest Western digits, matching phone numbers and prices) and apply it everywhere.

---

## 9. Legal and compliance text: flagged, not rewritten

| Key | Flag |
|---|---|
| Auth.consent (+ consent version) | Keep the wording and version capture. Problem: one box bundles terms, privacy **and** "showing my contact details on my public page", and the page is private by default. Ask legal whether the contact-display consent should move to the publish step (W3), where it takes effect. The "↗" link sits alone on a wrapped line: render it inline. |
| Auth.adult | Keep as is. |
| Setup.preview.rights | Keep the meaning. The Arabic grammar fix «من حقّي أن أعرض» needs legal sign-off. |
| Registration.publication.acknowledge | Keep. It moves to W3 with the choice. Ask legal whether one acknowledgement can cover both the rights box and visibility, so the user ticks 1 box instead of 2 on the final screen. |
| Registration.publication.states.*.body, .mediaNote | Too long for a phone. I proposed one-line summaries (section 4.4). Legal should approve them, or keep the full text behind a «التفاصيل / Details» toggle. |
| Registration.pioneersNote, studio.pioneerEligible / Pending / Unavailable | Keep the text. Moved into a collapsed card only. |
| Registration.studio.archiveBody, stages.full.body (funds wording) | Keep. |
| CreatorSetup.connectionsBody, clientBody (authorship / endorsement disclaimers) | Proposed to move out of the main path. Check with legal that they are not required to stay visible on screen. |

---

## 10. Ranked changes (impact · effort · risk)

| # | Change | Impact | Effort | Risk |
|---|---|---|---|---|
| 1 | Visibility choice + acknowledgement on the final wizard step; the button label follows the choice ("احفظ صفحتي" / "انشر صفحتي"); the done screen states the status | Very high (removes the "saved but 404" trap; −4 clicks, −1 page) | M | Medium: docs/51 private default must stay preselected; legal review of the summaries |
| 2 | Day-one Studio nav = 4 tabs + "Add work" button; show-when rules for the rest; merge Chats/Messages and Collab/Partners | Very high (the "where am I" problem) | M | Low–medium: e2e tests that click tabs; deep links keep working since routes do not change |
| 3 | Glossary pass across `Setup`, `CreatorSetup`, `Registration.studio`, `Studio` in both locales (page / work / client / publish) | High | M (copy only) | Low; e2e selectors that match text need updating |
| 4 | Wizard 5 → 3 steps (Source and Client folded into Work; social hidden while blocked) | High | M | Medium: wizard state machine and tests |
| 5 | Join 3 → 2 steps; team and specialty move out; services asked once (W1); agent code behind a link; handle shown as a "page link" with a fixed prefix | High | M | Medium: matching uses team roles; they must be collected later via a "complete your page" prompt |
| 6 | Inline, localized, field-specific validation (join, wizard, publication); no native bubbles; errors next to the button | High | M | Low |
| 7 | Arabic register and typo fixes (section 8) | Medium–high (trust) | S | Very low |
| 8 | Studio Home rewrite: status pill + one next step; honest checklist; early-phase notice once; pioneer panel folded | High | S–M | Low (docs/51 "private counts as done" becomes "show status", not a tick) |
| 9 | Cut repeats: Behance 6 → 2, "private" line 9 → 3, LangOffer bar only on landing for English browsers | Medium | S | Low |
| 10 | `/studio/new` uses the wizard's fields and words; extras folded into "More details" | Medium | M | Low–medium (post-form tests) |
| 11 | `/studio/profile` split into sections with a sticky save; fix the `tr_*` raw accessible names | Medium | M | Low |
| 12 | Landing CTA → "أنشئ صفحتك مجاناً / Create your free page" in both locales; signed-in bottom bar shows "صفحتي" | Medium | S | Low |
| 13 | Setup guide tab removed; its content becomes a help panel in Add work | Low–medium | S | Low |
| 14 | Billing renamed «الاشتراك والفواتير» (no clash with «الباقات») | Low | S | Very low |
| 15 | Localized file inputs; `<bdi>` for Latin brand names in Arabic; one digit style | Low–medium | S | Very low |

Definition-of-done reminder for whoever builds this: every new or changed string goes into both `messages/ar.json` and `messages/en.json`, is checked at 390 px in Arabic first, and lands on staging before `main`.
