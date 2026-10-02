import type { CountryCode } from "@/lib/countries";

export type FounderCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  cta: string;
  ctaNote: string;
  advantage: string;
  valueTitle: string;
  valueIntro: string;
  value: {
    clientsTitle: string; clientsBody: string;
    partnersTitle: string; partnersBody: string;
    proofTitle: string; proofBody: string;
  };
  founderTitle: string;
  founderIntro: string;
  founderKnown: string;
  founderKnownBody: string;
  founderLocked: string[];
  founderNote: string;
  whoTitle: string;
  whoIntro: string;
  socialTitle: string;
  socialBody: string;
  finalTitle: string;
  finalBody: string;
  share: string;
};

const jo: FounderCopy = {
  eyebrow: "قبل الإطلاق · التسجيل مفتوح",
  title: "قبل ما ييجوا أصحاب الشغل، بدنا الناس اللي بتعرف تعمله.",
  intro: "إذا كنت وكالة، فريلانسر، مصوّر، مصمم، صانع محتوى أو بتشتغل بأي مجال من مجالات التسويق — خلّي شغلك يبين وكون موجود من البداية.",
  cta: "سجّلني قبل الإطلاق",
  ctaNote: "مجاني · دقيقتين · بدون بطاقة",
  advantage: "اللي معنا من البداية، إلهم أفضلية من البداية.",
  valueTitle: "ليش أصلاً تكون على سوّق؟",
  valueIntro: "لأن الشغل ما لازم يضل موزّع بين إنستغرام، واتساب وملفات PDF.",
  value: {
    clientsTitle: "خلّي الشغل يوصلك",
    clientsBody: "صاحب المشروع يحكي شو محتاج. سوّق يساعده يوصل للناس المناسبين بدل ما يضل يسأل ويدوّر.",
    partnersTitle: "كمّل فريقك وقت تحتاج",
    partnersBody: "أخذت مشروع وناقصك مصوّر، مصمم أو ميديا باير؟ دور داخل الشبكة واشتغلوا سوا.",
    proofTitle: "خلّي شغلك هو اللي يحكي",
    proofBody: "صور، فيديو، حملات، تصاميم ومواقع. بدل ما تحكي إنك شاطر، خلّي العميل يشوف شو عملت.",
  },
  founderTitle: "وفي سبب يخليك تسجّل من اليوم.",
  founderIntro: "الموجودين معنا قبل الإطلاق إلهم مزايا مؤسسين مرتبطة بالمصاري والفرص والأدوات. أول ميزة حسمناها، والباقي بنكشفه قبل الإطلاق.",
  founderKnown: "أول ميزة واضحة",
  founderKnownBody: "أول مشروع مكتمل يجيك من سوّق: 0% عمولة سوّق. وبعده إلك سعر مؤسسين خاص 7% لأول سنة من تشغيل الدفعات المحمية.",
  founderLocked: ["تشوف الفرص المناسبة قبل فتحها لباقي المزوّدين", "6 أشهر من أدوات Pro من يوم إطلاقها", "أفضلية بعقود عملائك الحاليين وبشبكة شركاء المشاريع"],
  founderNote: "التفاصيل بتنزل تدريجياً قبل الإطلاق. أي ميزة نعلنها هون بنلتزم فيها للمؤسسين المؤهلين.",
  whoTitle: "مين مكانه هون؟",
  whoIntro: "أي شخص أو فريق شغله بيساعد مشروع يتسوّق أحسن.",
  socialTitle: "الشبكة عم تبدأ",
  socialBody: "هاي أعداد صفحات حقيقية مسجّلة على سوّق. ما بننفخ الأرقام، وما بنعتبر التسجيل لحاله إثبات جودة.",
  finalTitle: "جهّز مكانك قبل ما نفتح الباب للعملاء.",
  finalBody: "سجّل، حط شغلك وخدماتك، وخليك جاهز. لما يبدأ أصحاب المشاريع يدخلوا، ما تكون لسه عم تبدأ من الصفر.",
  share: "ابعثها لحدا شغله لازم يبين",
};

const sa: FounderCopy = {
  ...jo,
  title: "قبل ما يدخل أصحاب المشاريع، نبي أهل الشغل يكونون جاهزين.",
  intro: "وكالة، مستقل، مصوّر، مصمم أو صانع محتوى؟ ورّنا شغلك وخلك موجود من البداية. سوّق مبني عشان يوصل أصحاب المشاريع بالناس المناسبة للشغل.",
  cta: "سجّلني من البداية",
  advantage: "اللي يبدأ معنا، له مزايا خاصة وقت الإطلاق.",
  valueTitle: "وش بيضيف لك سوّق؟",
  valueIntro: "مكان واحد يخلي شغلك واضح، ويسهّل على العميل وعلى الشركاء يوصلون لك.",
  value: {
    clientsTitle: "خلّ شغلك يوصل للعميل الصح",
    clientsBody: "صاحب المشروع يقول وش يحتاج، وسوّق يساعده يوصل لمزوّدين يناسبون طلبه بدل البحث العشوائي.",
    partnersTitle: "كمّل فريق المشروع",
    partnersBody: "فزت بمشروع وتحتاج مصوّر، مصمم أو مختص إعلانات؟ تلقى شركاء من داخل الشبكة.",
    proofTitle: "ورّهم شغلك، لا توصفه",
    proofBody: "أعمالك، خدماتك وباقاتك في صفحة واضحة. العميل يشوف بنفسه قبل ما يتواصل.",
  },
  founderTitle: "وفي سبب يخليك تدخل من الحين.",
  founderIntro: "الموجودون معنا قبل الإطلاق لهم مزايا مؤسسين مرتبطة بالتكلفة والفرص والأدوات. أول ميزة حسمناها، والباقي نكشفه قبل الإطلاق.",
  founderKnownBody: "أول مشروع مكتمل يجيك من سوّق: 0% عمولة سوّق. وبعده لك سعر مؤسسين 7% لأول سنة من تشغيل الدفعات المحمية.",
  founderNote: "نكشف التفاصيل بالتدريج قبل الإطلاق. أي ميزة نعلنها هنا نلتزم بها للمؤسسين المؤهلين.",
  whoTitle: "مين مكانه في سوّق؟",
  whoIntro: "أي شخص أو فريق يساعد المشاريع في التسويق، المحتوى، الإعلان أو الإنتاج.",
  socialTitle: "الشبكة بدأت",
  socialBody: "هذه أعداد صفحات حقيقية مسجّلة على سوّق. ما نضخّم الأرقام، والتسجيل وحده مو شهادة جودة.",
  finalTitle: "جهّز مكانك قبل ما نفتح للعملاء.",
  finalBody: "حط أعمالك وخدماتك وخلك جاهز. يوم يبدأ أصحاب المشاريع يدخلون، تكون موجود من البداية.",
  share: "أرسلها لشخص شغله يستاهل يبان",
};

const eg: FounderCopy = {
  ...jo,
  title: "قبل ما نجيب أصحاب البيزنس، عايزين الناس اللي بتعرف تعمل الشغل صح.",
  intro: "إيجنسي، فريلانسر، مصوّر، ديزاينر أو صانع محتوى؟ ورّينا شغلك وخليك موجود من البداية. سوّق معمول عشان أصحاب المشاريع يلاقوا الناس المناسبة أسرع.",
  cta: "سجّلني قبل الإطلاق",
  advantage: "الناس اللي تبدأ معانا هيبقى ليها مزايا خاصة وقت الإطلاق.",
  valueTitle: "سوّق هيفيدك في إيه؟",
  valueIntro: "بدل ما شغلك يفضل متوزع بين إنستجرام وواتساب وPDF، خليه في مكان الناس تقدر توصله.",
  value: {
    clientsTitle: "خلّي الشغل يوصلك",
    clientsBody: "صاحب المشروع يقول هو محتاج إيه، وسوّق يساعده يوصل للناس المناسبة بدل ما يفضل يسأل ويدوّر.",
    partnersTitle: "كمّل فريقك للمشروع",
    partnersBody: "خدت شغل ومحتاج مصوّر، ديزاينر أو ميديا باير؟ دور جوه الشبكة واشتغلوا سوا.",
    proofTitle: "خلّي شغلك يتكلم عنك",
    proofBody: "صور، فيديو، حملات، تصميمات ومواقع. العميل يشوف اللي عملته بدل ما يسمع كلام عنه.",
  },
  founderTitle: "وفي سبب يخليك تسجّل دلوقتي.",
  founderIntro: "اللي موجودين معانا قبل الإطلاق ليهم مزايا مؤسسين مرتبطة بالفلوس والفرص والأدوات. أول ميزة حسمناها، والباقي هنكشفه قبل الإطلاق.",
  founderKnownBody: "أول مشروع مكتمل يجي لك من سوّق: 0% عمولة سوّق. وبعده لك سعر مؤسسين 7% لأول سنة من تشغيل الدفعات المحمية.",
  founderNote: "هنكشف التفاصيل واحدة واحدة قبل الإطلاق. أي ميزة نعلنها هنا هنلتزم بيها للمؤسسين المؤهلين.",
  whoTitle: "مين مكانه هنا؟",
  whoIntro: "أي شخص أو فريق شغله بيساعد مشروع يسوّق أحسن.",
  socialTitle: "الشبكة بدأت",
  socialBody: "دي أعداد صفحات حقيقية مسجّلة على سوّق. مش بنزوّد الأرقام، والتسجيل لوحده مش شهادة جودة.",
  finalTitle: "جهّز مكانك قبل ما نفتح لأصحاب المشاريع.",
  finalBody: "سجّل، حط شغلك وخدماتك وخليك جاهز. لما العملاء يبدأوا يدخلوا، متكونش لسه بتبدأ من الصفر.",
  share: "ابعتها لحد شغله لازم يتشاف",
};

const gulf = (countryWord: string): FounderCopy => ({
  ...sa,
  title: "قبل ما يدخل أصحاب المشاريع، نبي الناس اللي تعرف الشغل تكون جاهزة.",
  intro: `إذا كنت وكالة، مستقل، مصوّر، مصمم أو صانع محتوى في ${countryWord} — خلّ شغلك يبان وخلك موجود من البداية.`,
  valueTitle: "شنو يضيف لك سوّق؟",
  founderTitle: "وفي سبب يخليك تدخل من الحين.",
});

const byCountry: Record<CountryCode, FounderCopy> = {
  jo,
  sa,
  ae: { ...gulf("الإمارات"), valueTitle: "شو بيضيف لك سوّق؟", intro: "إذا كنت وكالة، فريلانسر، مصوّر، مصمم أو صانع محتوى في الإمارات — خلّ شغلك يبين وكون موجود من البداية." },
  kw: gulf("الكويت"),
  qa: { ...gulf("قطر"), valueTitle: "وش يضيف لك سوّق؟" },
  bh: gulf("البحرين"),
  om: { ...gulf("عُمان"), valueTitle: "وش يضيف لك سوّق؟" },
  eg,
};

const en: FounderCopy = {
  eyebrow: "Pre-launch · Providers first",
  title: "Before the clients arrive, we want the people who know how to do the work.",
  intro: "Agency, freelancer, photographer, designer or creator? Put your work where future clients and collaborators can actually find it — and join before Sawwiq opens to buyers.",
  cta: "Join before launch",
  ctaNote: "Free · About two minutes · No card",
  advantage: "People who help build the network early will launch with founder advantages.",
  valueTitle: "What does Sawwiq actually do for you?",
  valueIntro: "It turns scattered portfolios, referrals and supplier searches into one working network.",
  value: {
    clientsTitle: "Let the right work find you",
    clientsBody: "A business explains what it needs. Sawwiq helps it reach relevant providers instead of searching blindly.",
    partnersTitle: "Build the team a project needs",
    partnersBody: "Won a project but need a photographer, designer or media buyer? Find collaborators inside the network.",
    proofTitle: "Let the work do the talking",
    proofBody: "Show real projects, services and packages in one place instead of repeatedly sending the same PDF and Instagram links.",
  },
  founderTitle: "There is a reason to join before launch.",
  founderIntro: "Early providers get founder advantages tied to money, opportunities and tools. The first one is locked in; the rest are revealed before launch.",
  founderKnown: "Already clear",
  founderKnownBody: "Your first completed Sawwiq-acquired project carries 0% Sawwiq commission. After that, founders get a 7% platform rate for the first year of live protected payments.",
  founderLocked: ["See qualified opportunities before the wider provider pool", "Six months of Pro tools from the day Pro launches", "Founder terms for existing-client workflows and project-partner opportunities"],
  founderNote: "Details will be revealed before launch. Once a benefit is publicly announced here, Sawwiq will honor it for eligible founders.",
  whoTitle: "Who belongs here?",
  whoIntro: "Anyone whose work helps a business market, advertise, create or grow.",
  socialTitle: "The network is starting",
  socialBody: "These are real registered provider pages. We do not pad the numbers, and registration alone is not a quality badge.",
  finalTitle: "Get ready before Sawwiq opens to clients.",
  finalBody: "Add your work and services now. When businesses arrive, you should already be ready — not starting from zero.",
  share: "Send this to someone whose work should be seen",
};

export function founderCopy(locale: string, country: CountryCode): FounderCopy {
  return locale === "ar" ? byCountry[country] : en;
}
