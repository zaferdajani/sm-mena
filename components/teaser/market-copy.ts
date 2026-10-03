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

const ar: FounderCopy = {
  eyebrow: "قبل الإطلاق · التسجيل مفتوح",
  title: "قبل وصول أصحاب المشاريع، نريد أن يكون مزودو الخدمات جاهزين.",
  intro: "إذا كنت وكالة، أو مستقلاً، أو مصوراً، أو مصمماً، أو صانع محتوى، فاعرض أعمالك وكن موجوداً منذ البداية. صُممت سوّق لتقريب أصحاب المشاريع من مزودي الخدمات المناسبين.",
  cta: "سجّل قبل الإطلاق",
  ctaNote: "مجاني · نحو دقيقتين · من دون بطاقة دفع",
  advantage: "من ينضم منذ البداية يحصل على مزايا خاصة عند الإطلاق.",
  valueTitle: "ماذا تضيف لك سوّق؟",
  valueIntro: "مكان واحد يجمع أعمالك وخدماتك، ويسهّل على العملاء والشركاء الوصول إليك.",
  value: {
    clientsTitle: "ساعد العملاء المناسبين على الوصول إليك",
    clientsBody: "يحدد صاحب المشروع ما يحتاج إليه، وتساعده سوّق على الوصول إلى مزودي الخدمات الأقرب إلى طلبه بدلاً من البحث العشوائي.",
    partnersTitle: "أكمل فريق المشروع",
    partnersBody: "إذا احتجت إلى مصور أو مصمم أو مختص إعلانات لإكمال مشروع، يمكنك العثور على شركاء مناسبين داخل الشبكة.",
    proofTitle: "دع أعمالك تتحدث عنك",
    proofBody: "اعرض مشاريعك وخدماتك وباقاتك في صفحة واضحة، ليطّلع العميل على أعمالك قبل التواصل.",
  },
  founderTitle: "وهناك سبب للانضمام قبل الإطلاق.",
  founderIntro: "يحصل المؤهلون من الدفعة المبكرة على مزايا مرتبطة بالفرص والأدوات والتكلفة. نعلن التفاصيل تدريجياً قبل الإطلاق.",
  founderKnown: "الميزة المعلنة",
  founderKnownBody: "أول مشروع مكتمل يأتيك عبر سوّق: 0% عمولة لسوّق. وبعده يحصل المؤهلون على سعر مؤسسين 7% لأول سنة من تشغيل الدفعات المحمية.",
  founderLocked: ["الاطلاع على الفرص المناسبة قبل فتحها لبقية المزوّدين", "ستة أشهر من أدوات Pro من يوم إطلاقها", "شروط مؤسسين لمسارات العملاء الحاليين وفرص شركاء المشاريع"],
  founderNote: "نكشف التفاصيل تدريجياً قبل الإطلاق، ونلتزم بأي ميزة نعلنها للمؤسسين المؤهلين.",
  whoTitle: "لمن صُممت سوّق؟",
  whoIntro: "لكل شخص أو فريق يساعد المشاريع في التسويق أو المحتوى أو الإعلان أو الإنتاج.",
  socialTitle: "الشبكة تبدأ الآن",
  socialBody: "هذه أعداد صفحات حقيقية مسجّلة على سوّق. لا نضخّم الأرقام، والتسجيل وحده ليس شهادة جودة.",
  finalTitle: "جهّز صفحتك قبل فتح المنصة لأصحاب المشاريع.",
  finalBody: "أضف أعمالك وخدماتك وكن جاهزاً. عند بدء دخول أصحاب المشاريع، ستكون صفحتك موجودة بدلاً من أن تبدأ من الصفر.",
  share: "أرسلها إلى شخص يستحق عمله أن يُعرض",
};

const byCountry: Record<CountryCode, FounderCopy> = {
  jo: ar, sa: ar, ae: ar, kw: ar, qa: ar, bh: ar, om: ar, eg: ar,
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
