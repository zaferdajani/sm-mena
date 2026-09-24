/**
 * The general conditions every Sawwiq contract and NDA carries, in Arabic and
 * English, version LEGAL_VERSION (lib/legal/jurisdictions.ts). Written once for
 * all countries; the country-specific parts ({eSignLaw}, {dataLaw}, courts,
 * tax) come from the jurisdiction annex.
 *
 * Wording rules: plain language, no penalty or interest clauses (courts in the
 * region may reduce penalties and interest is not enforceable everywhere),
 * nothing a special condition can use to take away the client's ownership of
 * its accounts, the no-surprise-charges rule or data protection.
 */

export type Bi = { ar: string; en: string };
export type Clause = { id: string; title: Bi; body: Bi[] };

/** Fills {name} placeholders. Unknown names stay as they are. */
export function fill(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export const SERVICE_CLAUSES: Clause[] = [
  {
    id: "relationship",
    title: { ar: "العلاقة بين الطرفين ودور المنصة", en: "Relationship and the platform's role" },
    body: [
      {
        ar: "تقدّم الوكالة الخدمات بصفتها مقاول مستقل، ولا ينشئ هذا العقد شراكة أو وكالة قانونية أو علاقة عمل بين الطرفين. منصة سوّق ليست طرفًا في تقديم الخدمات؛ دورها أن تكون الجسر المضمون بين الطرفين: تحفظ العقد وسجلّ التوقيع وقوائم التسليم، وتضمن للعميل استلام كل مرحلة كما وُقّعت وللوكالة استلام أتعابها عن كل مرحلة مقبولة. يدفع العميل مبلغ كل مرحلة قبل بدء العمل عليها إلى طرف ثالث موثوق (مزوّد دفع أو ضمان مرخّص) يحفظه، ولا يُحرَّر للوكالة إلا بعد تأكيد العميل لبنود المرحلة أو بقرار تسوية الخلاف، ولا تحتفظ سوّق بأموال الطرفين في حساباتها.",
        en: "The agency provides the services as an independent contractor; this contract creates no partnership, legal agency or employment between the parties. Sawwiq does not provide the services; it is the guaranteed bridge between the parties: it keeps the contract, the signature record and the delivery checklists, and guarantees the client receives each milestone as signed and the agency is paid for each accepted milestone. The client pays each milestone, before work on it starts, to a trusted third party (a licensed payment or escrow provider) that holds it; it is released to the agency only when the client confirms the milestone's items or as decided under the disputes clause. Sawwiq never holds the parties' money in its own accounts.",
      },
    ],
  },
  {
    id: "delivery",
    title: { ar: "التسليم والقبول", en: "Delivery and acceptance" },
    body: [
      {
        ar: "تُسلَّم الأعمال على مراحل كما هو مبيّن أعلاه، ولكل مرحلة قائمة بنود. عند انتهاء المرحلة تعلّم الوكالة البنود المنجزة وتسلّمها، ويراجعها العميل خلال مدة معقولة فيؤكد كل بند أو يطلب تعديلات مع ذكر السبب. لا تُعدّ المرحلة مقبولة إلا بتأكيد العميل لكل بنودها.",
        en: "Work is delivered in the milestones above, each with a checklist. When a milestone is done the agency marks its items and submits it; the client reviews it within a reasonable time and confirms each item or asks for changes, giving the reason. A milestone is accepted only when the client confirms all its items.",
      },
    ],
  },
  {
    id: "fees",
    title: { ar: "الأتعاب والضرائب", en: "Fees and taxes" },
    body: [
      {
        ar: "يدفع العميل مبلغ كل مرحلة كما هو محدد أعلاه إلى الطرف الثالث الحافظ. رسوم خدمة الضمان التي تتقاضاها سوّق {fee}٪ من كل مبلغ يُحرَّر، وتُخصم منه قبل تحويله إلى الوكالة، ولا يدفع العميل أكثر من مبلغ العقد. {vat} يتحمّل كل طرف ما يفرضه القانون عليه من ضرائب ورسوم، ولا تُفرض على العميل أي غرامة تأخير أو فائدة بموجب هذا العقد.",
        en: "The client pays each milestone's amount as set above to the third-party holder. Sawwiq's fee for the guarantee is {fee}% of each released payment, deducted before it is paid to the agency; the client never pays more than the contract amount. {vat} Each party bears the taxes and fees the law puts on it; this contract charges the client no late-payment penalty or interest.",
      },
    ],
  },
  {
    id: "ownership",
    title: { ar: "ملكية الحسابات والملفات", en: "Ownership of accounts and files" },
    body: [
      {
        ar: "يملك العميل جميع حساباته وصفحاته وحسابات الإعلانات والبكسل والبيانات والجماهير والملفات المصدرية التي تُنشأ أو تُدار لصالحه، وتعمل الوكالة عليها بصلاحية يمنحها العميل ويستطيع سحبها في أي وقت. لا يجوز للوكالة تسجيل أي حساب أو أصل باسمها بدل العميل، أو حجب الوصول إليه لأي سبب بما في ذلك الخلاف على الدفع.",
        en: "The client owns every account, page, ad account, pixel, data set, audience and source file created or run for it; the agency works on them with access the client grants and may withdraw at any time. The agency may not register any account or asset in its own name instead of the client's, nor withhold access for any reason, including a payment dispute.",
      },
    ],
  },
  {
    id: "ip",
    title: { ar: "الملكية الفكرية", en: "Intellectual property" },
    body: [
      {
        ar: "تنتقل إلى العميل الحقوق المالية على كل عمل يُسلَّم بموجب هذا العقد (التصاميم والنصوص والصور والفيديو وغيرها) بمجرد سداد مبلغ المرحلة التي سُلّم فيها، دون قيد زمني أو جغرافي، وفي الحدود التي يجيزها {copyrightLaw}. تبقى الحقوق الأدبية لمؤلفيها كما يقرّر القانون. تحتفظ الوكالة بأدواتها وقوالبها ومعارفها السابقة، وتمنح العميل ترخيصًا دائمًا لاستخدام ما يدخل منها في الأعمال المسلّمة.",
        en: "The economic rights in everything delivered under this contract (designs, copy, photos, video and the rest) pass to the client once the milestone it was delivered in is paid, without limit of time or place, to the extent {copyrightLaw} allows. Moral rights stay with their authors as the law provides. The agency keeps its own pre-existing tools, templates and know-how and gives the client a permanent licence to use whatever of them is built into the delivered work.",
      },
      {
        ar: "تضمن الوكالة أن ما تسلّمه من عملها الأصلي أو مرخّص لها استخدامه (صور وخطوط وموسيقى وقوالب)، وتسلّم العميل بيانات التراخيص عند الطلب. يجوز للوكالة عرض الأعمال المنشورة علنًا في ملف أعمالها ما لم يطلب العميل غير ذلك أو كانت اتفاقية السرية تمنعه.",
        en: "The agency warrants that what it delivers is its original work or licensed for this use (stock photos, fonts, music, templates) and gives the client the licence details on request. The agency may show publicly published work in its portfolio unless the client asks it not to or the confidentiality terms forbid it.",
      },
    ],
  },
  {
    id: "data",
    title: { ar: "البيانات الشخصية", en: "Personal data" },
    body: [
      {
        ar: "يلتزم الطرفان بأحكام {dataLaw}. فيما يخص بيانات عملاء العميل وجمهوره، تعالجها الوكالة بتعليمات العميل ولأغراض هذا العقد فقط، وتحميها بتدابير أمنية مناسبة، ولا تنقلها لطرف ثالث إلا لتنفيذ العقد (مثل منصات الإعلان)، وتُبلغ العميل بأي اختراق خلال 72 ساعة من علمها به، وتحذفها أو تعيدها عند انتهاء العقد ما لم يُلزمها القانون بحفظها.",
        en: "Both parties comply with {dataLaw}. For the personal data of the client's customers and audience, the agency processes it only on the client's instructions and for this contract, protects it with appropriate security, passes it to third parties only to perform the contract (such as ad platforms), tells the client of any breach within 72 hours of learning of it, and deletes or returns it when the contract ends unless the law requires it to keep it.",
      },
    ],
  },
  {
    id: "advertising",
    title: { ar: "الالتزام بأنظمة الإعلان", en: "Advertising rules" },
    body: [
      {
        ar: "تلتزم الوكالة بسياسات منصات الإعلان وبأنظمة الإعلان في الدولة، وتُفصح عن الإعلانات المدفوعة والشراكات مع صُنّاع المحتوى. يضمن العميل صحة ما يقدّمه عن منتجاته وخدماته وحصوله على أي ترخيص يلزم للإعلان عنها. الأهداف المتفق عليها أهداف يُقاس بها الأداء وليست ضمانًا لنتائج بعينها، ما لم ينص شرط خاص على غير ذلك.",
        en: "The agency follows the ad platforms' policies and the country's advertising rules, and discloses paid ads and creator partnerships. The client warrants that what it says about its products and services is true and that it holds any licence needed to advertise them. The agreed targets measure performance; they are not a guarantee of specific results unless a special condition says so.",
      },
    ],
  },
  {
    id: "changes",
    title: { ar: "التعديلات", en: "Changes" },
    body: [
      {
        ar: "لا يتغيّر نطاق العمل أو السعر أو المواعيد إلا بطلب تعديل مكتوب عبر المنصة يوافق عليه العميل بتوقيعه. لا تستحق الوكالة أي مبلغ إضافي عن عمل لم يُعتمد بهذه الطريقة.",
        en: "Scope, price and dates change only through a written change request on the platform that the client accepts by signing it. The agency is owed nothing extra for work not approved this way.",
      },
    ],
  },
  {
    id: "termination",
    title: { ar: "إنهاء العقد والتسليم", en: "Ending the contract and handover" },
    body: [
      {
        ar: "لكل طرف إنهاء العقد إذا أخلّ الطرف الآخر بالتزام جوهري ولم يعالجه خلال 14 يومًا من إخطاره كتابيًا عبر المنصة. وللعميل إنهاء العقد لأي سبب بإخطار مدته 14 يومًا، على أن يدفع قيمة المراحل المقبولة وحصة عادلة من المرحلة الجارية يتفق عليها الطرفان أو تُحدَّد في تسوية الخلاف.",
        en: "Either party may end the contract if the other breaches a material obligation and does not fix it within 14 days of written notice through the platform. The client may also end it for any reason with 14 days' notice, paying for the accepted milestones and a fair share of the milestone in progress, as the parties agree or as settled under the disputes clause.",
      },
      {
        ar: "عند انتهاء العقد لأي سبب، تسلّم الوكالة خلال 7 أيام: صلاحيات الإدارة على كل حسابات العميل، والملفات المصدرية للأعمال المدفوعة، وآخر تقرير أداء، ثم تزيل صلاحياتها بطلب العميل.",
        en: "When the contract ends for any reason, within 7 days the agency hands over admin access to all the client's accounts, the source files of paid work and a final performance report, then removes its own access when the client asks.",
      },
    ],
  },
  {
    id: "liability",
    title: { ar: "حدود المسؤولية", en: "Liability" },
    body: [
      {
        ar: "لا يُسأل أي طرف عن الأضرار غير المباشرة أو الربح الفائت. لا تتجاوز مسؤولية الوكالة الإجمالية عن هذا العقد المبالغ التي دفعها العميل بموجبه، ولا يسري هذا الحد على الإخلال بالسرية أو بحماية البيانات أو بالملكية الفكرية، ولا على الغش أو الخطأ الجسيم، ولا على ما لا يجيز القانون تحديده.",
        en: "Neither party is liable for indirect loss or lost profit. The agency's total liability under this contract is capped at what the client has paid under it; the cap does not apply to breaches of confidentiality, data protection or intellectual property, to fraud or gross fault, or to anything the law does not allow to be limited.",
      },
    ],
  },
  {
    id: "force_majeure",
    title: { ar: "القوة القاهرة", en: "Force majeure" },
    body: [
      {
        ar: "لا يُعدّ أي طرف مخلًّا إذا منعه من التنفيذ حدث خارج عن إرادته لا يمكن توقعه أو دفعه، بشرط إخطار الطرف الآخر فورًا. تُمدَّد المواعيد بقدر مدة الحدث، وإذا استمر أكثر من 30 يومًا جاز لأي طرف إنهاء العقد مع تسوية ما أُنجز. إيقاف حسابات الإعلان بسبب مخالفة لسياسات المنصات لا يُعدّ قوة قاهرة.",
        en: "Neither party is in breach if an event beyond its control, which it could not foresee or avoid, stops it from performing, provided it tells the other party at once. Dates move by the length of the event; if it lasts more than 30 days either party may end the contract, settling the work done. An ad account suspended for breaking a platform's policies is not force majeure.",
      },
    ],
  },
  {
    id: "precedence",
    title: { ar: "الشروط الخاصة وترتيب الأولوية", en: "Special conditions and order of precedence" },
    body: [
      {
        ar: "الشروط الخاصة التي أضافها العميل أو الوكالة ووقّع عليها الطرفان جزء من هذا العقد، وتُقدَّم على هذه الشروط العامة عند التعارض، إلا أنها لا تنتقص من ملكية العميل لحساباته وملفاته، ولا من قاعدة عدم فرض مبالغ إضافية دون موافقة، ولا من حماية البيانات الشخصية، ولا من أي حق يقرّره القانون بنص آمر.",
        en: "Special conditions added by the client or the agency and signed by both parties are part of this contract and prevail over these general conditions where they conflict; but they cannot reduce the client's ownership of its accounts and files, the rule against extra charges without approval, personal data protection, or any right that mandatory law gives.",
      },
      {
        ar: "يمثّل هذا العقد بملاحقه الاتفاق الكامل بين الطرفين بشأن موضوعه. إذا بطل أي شرط بقيت الشروط الأخرى نافذة، ويُستبدل الشرط الباطل بأقرب شرط صحيح إلى قصد الطرفين.",
        en: "This contract with its annexes is the entire agreement between the parties on its subject. If any term is invalid the rest stays in force, and the invalid term is replaced by the valid term closest to what the parties intended.",
      },
    ],
  },
];

/** Closing clauses shared by contracts and NDAs: who can sign, how, and how records are kept. */
export const COMMON_CLAUSES: Clause[] = [
  {
    id: "capacity",
    title: { ar: "الأهلية والصفة", en: "Capacity and authority" },
    body: [
      {
        ar: "يقرّ كل موقّع بأنه بلغ سن الرشد وفق قانون دولته ويتمتع بالأهلية الكاملة للتعاقد، وأنه مفوّض بالتوقيع عن الطرف الذي يمثله، وأن بيانات الطرف (الاسم القانوني ورقم السجل التجاري أو الهوية) المذكورة صحيحة. يلتزم الطرف بهذا العقد ولو تبيّن لاحقًا أن ممثله تجاوز صلاحياته، متى كان الطرف الآخر حسن النية.",
        en: "Each signer confirms that they have reached the age of majority under their country's law and have full capacity to contract, that they are authorised to sign for the party they represent, and that the party's details stated (legal name and commercial registration or ID number) are correct. A party is bound even if its representative is later found to have exceeded their authority, where the other party acted in good faith.",
      },
    ],
  },
  {
    id: "esign",
    title: { ar: "التوقيع الإلكتروني والسجلات", en: "Electronic signature and records" },
    body: [
      {
        ar: "يتفق الطرفان على إبرام هذا العقد وتعديلاته بالتوقيع الإلكتروني وفق {eSignLaw}. يتكوّن توقيع كل طرف من اسمه الكامل وتوقيعه المرسوم وموافقته الصريحة، ويرتبط ببصمة رقمية (SHA-256) لنص الشروط الموقّعة، مع وقت التوقيع وبصمة عنوان الشبكة. أي تغيير في الشروط يغيّر البصمة فلا يعود التوقيع صالحًا له. يحصل كل طرف على نسخة PDF مطابقة، ويُعدّ سجلّ المنصة دليلًا على الاتفاق وتوقيته.",
        en: "The parties agree to make this contract and its changes by electronic signature under {eSignLaw}. Each party's signature is its full name, its drawn signature and its express consent, bound to a SHA-256 fingerprint of the exact signed terms, with the time of signing and a hash of the network address. Any change to the terms changes the fingerprint, so the signature no longer covers them. Each party gets a matching PDF copy, and the platform's record is evidence of the agreement and its timing.",
      },
    ],
  },
  {
    id: "notices",
    title: { ar: "الإخطارات", en: "Notices" },
    body: [
      {
        ar: "تُرسل الإخطارات عبر صفحة العقد على المنصة، ويجوز إرسالها إلى الهاتف أو البريد الإلكتروني المذكور في العقد. يُعدّ الإخطار مستلمًا في يوم العمل التالي لإرساله.",
        en: "Notices are given through the contract page on the platform and may also be sent to the phone or email in the contract. A notice counts as received on the business day after it is sent.",
      },
    ],
  },
  {
    id: "records",
    title: { ar: "حفظ السجل والنسخ", en: "Record keeping and copies" },
    body: [
      {
        ar: "تحفظ سوّق نص الشروط الموقّعة وسجلّ التوقيع دون تعديل، بطريقة تتيح استرجاعه بالشكل الذي أُنشئ به، لمدة لا تقل عن عشر سنوات من انتهاء العقد أو المدة التي يفرضها القانون أيهما أطول، وتقدّمه لأي طرف أو للجهة القضائية عند الطلب. للطرفين أن يطبعا نسخة PDF ويوقّعاها يدويًا أو بشهادة توقيع معتمدة إضافةً إلى التوقيع الإلكتروني، دون أن يغيّر ذلك مضمون الاتفاق.",
        en: "Sawwiq keeps the signed terms and the signature record unchanged, retrievable in the form in which they were made, for at least ten years after the contract ends or as long as the law requires, whichever is longer, and provides them to either party or to a court on request. The parties may also print the PDF and sign it by hand or with a certified signing certificate in addition to the electronic signature, without changing what was agreed.",
      },
    ],
  },
];

/** The confidentiality terms: the whole standalone NDA, and the NDA part of a contract. */
export const NDA_CLAUSES: Clause[] = [
  {
    id: "definition",
    title: { ar: "المعلومات السرية", en: "Confidential information" },
    body: [
      {
        ar: "المعلومات السرية هي كل ما يفصح عنه الطرف المُفصِح للطرف المتلقي لأجل الغرض المذكور، بأي شكل، ومنها: خطط العمل والتسويق، والأسعار والتكاليف، وبيانات العملاء والجمهور، وبيانات حسابات الإعلان ونتائجها، والمواد الإبداعية قبل نشرها، وكلمات المرور وبيانات الدخول، وكل ما يُفهم من طبيعته أنه سري.",
        en: "Confidential information is anything the disclosing party shares with the receiving party for the stated purpose, in any form, including business and marketing plans, prices and costs, customer and audience data, ad account data and results, creative work before it is published, passwords and login details, and anything that by its nature is clearly confidential.",
      },
    ],
  },
  {
    id: "exclusions",
    title: { ar: "الاستثناءات", en: "What is not confidential" },
    body: [
      {
        ar: "لا تشمل المعلومات السرية ما كان علنيًا أو أصبح كذلك دون خطأ من المتلقي، أو ما كان لدى المتلقي قبل الإفصاح دون التزام بالسرية، أو ما طوّره بنفسه دون الاستعانة بها، أو ما تلقّاه بصورة مشروعة من غير الطرف المُفصِح. إذا ألزم القانون أو جهة مختصة المتلقي بالإفصاح، يُفصح بالقدر اللازم فقط ويُبلغ الطرف المُفصِح مسبقًا متى سمح القانون بذلك.",
        en: "Confidential information does not include what is or becomes public without the receiving party's fault, what the receiving party already had without a duty of confidence, what it develops itself without using it, or what it lawfully receives from someone else. If the law or a competent authority requires disclosure, the receiving party discloses only what is required and tells the disclosing party beforehand where the law allows.",
      },
    ],
  },
  {
    id: "obligations",
    title: { ar: "التزامات المتلقي", en: "The receiving party's obligations" },
    body: [
      {
        ar: "يلتزم المتلقي بأن يستخدم المعلومات السرية للغرض المذكور فقط، وألا يفصح عنها إلا لموظفيه ومقاوليه الذين يحتاجونها لهذا الغرض والملتزمين بسرية مماثلة، وأن يحميها بعناية لا تقل عن عنايته بمعلوماته السرية ولا تقل عن العناية المعقولة، وأن يحفظ بيانات الدخول في مكان آمن ولا يشاركها، وأن يُبلغ المُفصِح فورًا بأي إفصاح غير مصرّح به.",
        en: "The receiving party uses the confidential information only for the stated purpose; shares it only with its staff and contractors who need it for that purpose and are bound by similar confidentiality; protects it with at least the care it gives its own confidential information and never less than reasonable care; keeps login details in a secure place and never shares them; and tells the disclosing party at once of any unauthorised disclosure.",
      },
    ],
  },
  {
    id: "duration",
    title: { ar: "المدة", en: "Duration" },
    body: [
      {
        ar: "تسري هذه الالتزامات من تاريخ التوقيع ولمدة {years} بعد انتهاء العلاقة بين الطرفين أو انتهاء الغرض، أيهما أبعد. أما الأسرار التجارية والبيانات الشخصية فتبقى محمية ما دامت كذلك.",
        en: "These obligations run from signing until {years} after the relationship between the parties or the purpose ends, whichever is later. Trade secrets and personal data stay protected for as long as they remain so.",
      },
    ],
  },
  {
    id: "return",
    title: { ar: "الإعادة والإتلاف", en: "Return and destruction" },
    body: [
      {
        ar: "عند طلب المُفصِح أو انتهاء الغرض، يعيد المتلقي المعلومات السرية أو يتلفها ويؤكد ذلك كتابيًا، ويجوز له الاحتفاظ بنسخة يلزمه القانون بحفظها مع بقاء التزام السرية عليها.",
        en: "When the disclosing party asks or the purpose ends, the receiving party returns or destroys the confidential information and confirms this in writing; it may keep a copy the law requires it to keep, which stays confidential.",
      },
    ],
  },
  {
    id: "no_licence",
    title: { ar: "لا ترخيص ولا التزام بالتعاقد", en: "No licence, no obligation to proceed" },
    body: [
      {
        ar: "لا يمنح الإفصاح أي حق أو ترخيص على المعلومات السرية أو على أي ملكية فكرية، ولا يُلزم أيًّا من الطرفين بإبرام أي تعاقد آخر.",
        en: "Disclosure gives no right or licence over the confidential information or any intellectual property, and does not oblige either party to enter into any further agreement.",
      },
    ],
  },
  {
    id: "remedies",
    title: { ar: "الإخلال", en: "Breach" },
    body: [
      {
        ar: "يقرّ الطرفان بأن الإفصاح غير المصرّح به قد يسبب ضررًا يصعب تداركه، وللطرف المتضرر أن يطلب من المحكمة المختصة الأوامر المستعجلة اللازمة لوقفه، إضافة إلى التعويض عن الضرر الفعلي وفق القانون.",
        en: "The parties accept that unauthorised disclosure can cause harm that is hard to undo; the harmed party may ask the competent court for urgent orders to stop it, as well as compensation for the actual damage under the law.",
      },
    ],
  },
  {
    id: "nda_entire",
    title: { ar: "الشروط الخاصة والاتفاق الكامل", en: "Special conditions and entire agreement" },
    body: [
      {
        ar: "الشروط الخاصة التي أضافها أي طرف ووقّع عليها الطرفان جزء من هذه الاتفاقية وتُقدَّم على شروطها العامة عند التعارض، دون أن تنتقص من حماية البيانات الشخصية أو من أي حق يقرّره القانون بنص آمر. إذا أبرم الطرفان لاحقًا عقد خدمات على سوّق يتضمن شروط سرية، تسري هذه الاتفاقية على ما أُفصح عنه قبله. إذا بطل أي شرط بقيت الشروط الأخرى نافذة.",
        en: "Special conditions added by either party and signed by both are part of this agreement and prevail over its general terms where they conflict, without reducing personal data protection or any right that mandatory law gives. If the parties later sign a Sawwiq service contract with confidentiality terms, this agreement still covers what was disclosed before it. If any term is invalid, the rest stays in force.",
      },
    ],
  },
];

/** The last clause of every document: which law, which courts, which language. */
export const LAW_CLAUSE: Clause = {
  id: "law",
  title: { ar: "القانون الواجب التطبيق وتسوية الخلافات واللغة", en: "Governing law, disputes and language" },
  body: [
    {
      ar: "يخضع هذا العقد لقوانين {country}. يسعى الطرفان أولًا لتسوية أي خلاف وديًا خلال 14 يومًا، ولأيٍّ منهما طلب وساطة فريق سوّق، ويقرر فريق سوّق بناءً على قوائم التسليم وسجلّ العقد مصير المبالغ المحفوظة في الخلاف، دون أن يمنع ذلك أي طرف من اللجوء إلى القضاء. إذا تعذّرت التسوية يختص بالنزاع القضاء المختص في {city}، {country}. لا يحرم هذا البند العميل من أي حماية يقرّرها له قانون دولته بنص آمر.",
      en: "This contract is governed by the laws of {country}. The parties first try to settle any dispute amicably within 14 days, and either may ask Sawwiq's team to mediate; Sawwiq's team decides, from the checklists and the contract record, what happens to the money held during a dispute, which does not stop either party from going to court. If no settlement is reached, the competent courts of {city}, {country} decide the dispute. This clause does not take away any protection the client's own country's mandatory law gives it.",
    },
    {
      ar: "حُرّر هذا العقد باللغتين العربية والإنجليزية، وعند أي اختلاف بينهما يُعتمد النص العربي.",
      en: "This contract is written in Arabic and English; if they differ, the Arabic text prevails.",
    },
  ],
};

export const DISCLAIMER: Bi = {
  ar: "نموذج سوّق الموحّد، الإصدار {version}. أُعدّت الشروط العامة لتتوافق مع القوانين المذكورة، ولا تُعدّ استشارة قانونية؛ لأي طرف أن يعرضها على محامٍ قبل التوقيع.",
  en: "Sawwiq standard form, version {version}. The general conditions are written to comply with the laws cited; they are not legal advice, and either party may have a lawyer review them before signing.",
};
