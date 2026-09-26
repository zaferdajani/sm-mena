/* Bilingual copy for the landing page (the front page at /ar and /en), per country. */
import { countryOf, type Country, type CountryCode } from "@/lib/countries";

export type Lang = "ar" | "en";

// Links go straight into the app (same site): /ar/explore, /en/match, …
export const appUrl = (lang: Lang, path: string) => `/${lang}/${path}`;

export type IconName =
  | "social" | "ads" | "video" | "photo" | "design" | "web"
  | "seo" | "onsite" | "ai" | "shield" | "contract" | "review";

export interface Chapter { id: string; label: string; title: string; body: string; tags?: string[] }
export interface Milestone { name: string; date: string; amount: number; items: string[] }

export interface WhoItem { slug: string; photo: string; title: string; example: string; service: string; serviceLabel: string }

export interface SiteCopy {
  dir: "rtl" | "ltr";
  brand: string;
  otherLangHref: string;
  otherLangName: string;
  nav: { href: string; label: string }[];
  country: { label: string; locate: string };
  cta: { match: string; browse: string; join: string; reviews: string };
  chapters: Chapter[];
  payments: {
    eyebrow: string; eyebrowSoon: string; soon: string; title: string; body: string; direct: string;
    points: { icon: IconName; title: string; body: string }[];
    ledger: {
      project: string; ref: string; hint: string; reset: string;
      held: string; released: string; locked: string;
      totalHeld: string; totalReleased: string; money: (n: number) => string;
      milestones: Milestone[];
    };
  };
who: {
    title: string; sub: string; healthTitle: string; healthNote: string; generalTitle: string;
    health: WhoItem[]; items: WhoItem[];
  };
  services: { title: string; sub: string; rows: { slug: string; icon: IconName; photo: string; title: string; items: string }[] };
  trust: {
    title: string; example: string;
    review: { quote: string; name: string; badge: string; note: string };
    rating: { label: string; caption: string };
    contract: { title: string; body: string };
    team: { title: string; body: string };
  };
  agencies: { title: string; body: string; features: { icon: IconName; text: string }[]; handle: string };
  cities: { title: string; list: { slug: string; name: string; alt: string }[]; bandSub: string };
  footer: { tagline: string; rights: string; links: { label: string; href: string }[] };
}

const ar: SiteCopy = {
  dir: "rtl",
  brand: "سوّق",
  otherLangHref: "/en",
  otherLangName: "English",
  nav: [
    { href: "#how", label: "كيف يعمل" },
    { href: "#payments", label: "الدفع المحمي" },
    { href: "#services", label: "الخدمات" },
    { href: "#agencies", label: "للوكالات" },
  ],
  country: { label: "الدولة", locate: "حدّد دولتي من موقعي" },
  cta: { match: "اسأل المطابق الذكي", browse: "تصفّح الوكالات", join: "أنشئ صفحتك مجاناً", reviews: "اقرأ المراجعات" },
  chapters: [
    { id: "start", label: "البداية", title: "اعثر على وكالة التسويق المناسبة في الأردن", body: "لعيادتك الطبية، عيادة الأسنان، صيدليتك، مطعمك، متجرك ومكتبك العقاري. شاهد أعمالاً حقيقية، واسأل المطابق الذكي، وادفع على مراحل وأنت مطمئن." },
    { id: "how", label: "أعمال حقيقية", title: "شاهد الشغل قبل الكلام", body: "منشورات وحملات حقيقية نفّذتها الوكالات لمطاعم وعيادات ومتاجر في الأردن، ومعها تقييمات \u2068Google\u2069 ومراجعات موثّقة.", tags: ["منشورات حقيقية", "تقييمات \u2068Google\u2069"] },
    { id: "ask", label: "اسأل", title: "اسأل الذكاء الاصطناعي أو تصفّح بنفسك", body: "اكتب ما تحتاجه بالعربي أو الإنجليزي، فيرتّب لك المطابق الوكالات الأنسب ويشرح السبب ويقترح ميزانية واقعية.", tags: ["عربي أو إنجليزي", "ميزانية واقعية"] },
    { id: "quotes", label: "العروض", title: "استلم عروضاً وقارن بهدوء", body: "أرسل مشروعك لأفضل الوكالات المطابقة، واستلم عروض أسعار واضحة تقارنها جنباً إلى جنب.", tags: ["دعوة أفضل المطابقين", "مقارنة العروض"] },
    { id: "sign", label: "العقد والدفع", title: "وقّع وادفع على مراحل", body: "عقد فيه مراحل وتواريخ ومبالغ وقوائم تسليم، يُوقَّع برابط خاص. وتُدفع كل مرحلة عبر شريك دفع مرخّص ولا تصل للوكالة إلا بعد أن تؤكد العمل.", tags: ["اتفاقية عدم إفصاح اختيارية", "دفعات محمية"] },
  ],
  payments: {
    eyebrow: "الدفع المحمي",
    eyebrowSoon: "الدفع المحمي · قريباً",
    soon: "قريباً: يُفعَّل الدفع المحمي عند ربط شريك الدفع المرخّص واكتمال المراجعة القانونية. حتى ذلك الحين لا تمر أي أموال حقيقية عبر سوّق؛ جرّب الخطوات هنا كعرض توضيحي.",
    title: "المال ينتظر حتى تؤكد العمل",
    body: "تدفع كل مرحلة إلى شريك الدفع المرخّص لدى سوّق، لا إلى حسابات سوّق، ولا تصل الدفعة إلى الوكالة إلا بعد أن تؤكد كل بند في قائمة التسليم.",
    direct: "تفضّل الدفع المباشر للوكالة؟ متاح أيضاً، ويبقى العقد وقوائم التسليم على سوّق، لكن الدفعة لا تكون محمية.",
    points: [
      { icon: "contract", title: "مراحل واضحة", body: "كل دفعة مربوطة بتسليمات وتاريخ ومبلغ متفق عليه." },
      { icon: "shield", title: "محفوظة لدى شريك مرخّص", body: "المبلغ لا يتحرك قبل موافقتك على كل البنود." },
      { icon: "review", title: "فريق للنزاعات", body: "إذا اختلفتما، يراجع فريقنا أدلة الطرفين ويقرّر، مع حق استئناف واحد." },
    ],
    ledger: {
      project: "حملة إطلاق مطعم، عمّان",
      ref: "SWQ-2410",
      hint: "جرّب بنفسك: أكّد بنود المرحلة الثانية",
      reset: "إعادة التجربة",
      held: "لدى شريك الدفع",
      released: "وصلت للوكالة",
      locked: "لم تبدأ بعد",
      totalHeld: "لدى شريك الدفع",
      totalReleased: "وصل للوكالة",
      money: (n) => `${n} د.أ`,
      milestones: [
        { name: "الانطلاق", date: "2026-10-05", amount: 350, items: ["خطة محتوى لشهر كامل", "قوالب التصميم", "جلسة تصوير في المطعم"] },
        { name: "الشهر الأول", date: "2026-11-05", amount: 450, items: ["12 منشوراً و4 ريلز", "حملة ممولة على ميتا", "تقرير الأداء الشهري"] },
        { name: "الافتتاح", date: "2026-12-05", amount: 450, items: ["تغطية ميدانية للافتتاح", "فيديو ملخّص", "تسليم كل الملفات"] },
      ],
    },
  },
  who: {
    title: "نساعد كل أنواع الأعمال",
    sub: "من العيادة ومقهى الحي إلى فندق في العقبة: اعثر على وكالات اشتغلت في مجالك من قبل.",
    healthTitle: "الرعاية الصحية",
    healthNote: "يلتزم الإعلان الطبي في الأردن بتعليمات وزارة الصحة والنقابات، ووكالات سوّق تعرفها.",
    generalTitle: "وكل الأعمال الأخرى",
    health: [
      { slug: "medical-clinics", photo: "biz-doctor", title: "عيادات طبية", example: "حجوزات وثقة عبر إعلانات جوجل وميتا وفيديوهات الأطباء", service: "ads_google", serviceLabel: "إعلانات جوجل" },
      { slug: "dental", photo: "biz-dental", title: "عيادات الأسنان", example: "محتوى قبل وبعد للابتسامة بموافقة المريض، ومراجعات خرائط جوجل", service: "seo", serviceLabel: "الظهور في البحث والخرائط" },
      { slug: "pharmacies", photo: "biz-pharmacy", title: "صيدليات", example: "حملات توصيل وطلبات عبر واتساب", service: "ads_meta", serviceLabel: "إعلانات ميتا" },
      { slug: "physiotherapy", photo: "biz-physio", title: "مراكز العلاج الطبيعي", example: "فيديوهات تشرح الخدمات ومسارات حجز واضحة", service: "video_production", serviceLabel: "إنتاج الفيديو" },
    ],
    items: [
      { slug: "restaurants", photo: "biz-restaurant", title: "مطاعم ومقاهي", example: "ريلز إنستغرام وتصوير المنيو", service: "smm_content", serviceLabel: "محتوى السوشال" },
      { slug: "boutiques", photo: "biz-boutique", title: "بوتيكات ومحلات", example: "صور منتجات ومحتوى تيك توك", service: "photography", serviceLabel: "تصوير المنتجات" },
      { slug: "online-stores", photo: "biz-store", title: "متاجر إلكترونية", example: "تجهيز المتجر وإعلانات البيع", service: "ecommerce_setup", serviceLabel: "تجهيز المتاجر" },
      { slug: "real-estate", photo: "biz-realestate", title: "مكاتب عقارية", example: "فيديوهات للعقارات وإعلانات لجمع العملاء", service: "ads_meta", serviceLabel: "إعلانات ميتا" },
      { slug: "gyms-salons", photo: "biz-gym", title: "نوادٍ رياضية وصالونات تجميل", example: "محتوى قبل وبعد وتعاون مع المؤثرين", service: "smm_influencer", serviceLabel: "المؤثرون" },
      { slug: "schools", photo: "biz-school", title: "مدارس ومراكز تدريب", example: "حملات تسجيل لكل فصل جديد", service: "ads_snapchat", serviceLabel: "إعلانات سناب شات" },
      { slug: "hotels", photo: "biz-hotel", title: "فنادق وسياحة في العقبة والبحر الميت", example: "إعلانات حجز وفيديو بالدرون", service: "video_production", serviceLabel: "إنتاج الفيديو" },
    ],
  },
  services: {
    title: "ماذا يمكنك أن توظّف؟",
    sub: "من إدارة حساباتك إلى تغطية افتتاحك على أرض الواقع. ولكل خدمة ومدينة صفحة توظيف فيها دليل أسعار.",
    rows: [
      { slug: "smm_management", icon: "social", photo: "social", title: "السوشال ميديا", items: "إدارة الحسابات، المحتوى، إدارة المجتمع، الاستراتيجية، المؤثرون" },
      { slug: "ads_meta", icon: "ads", photo: "ads", title: "الإعلانات الممولة", items: "ميتا، تيك توك، سناب شات، جوجل، لينكدإن" },
      { slug: "video_production", icon: "video", photo: "video", title: "الإنتاج الإبداعي", items: "فيديو، تصوير، تصميم جرافيك، موشن جرافيك، كتابة إعلانية" },
      { slug: "brand_identity", icon: "design", photo: "brand", title: "العلامة التجارية", items: "هوية بصرية، استراتيجية العلامة، تصميم التغليف" },
      { slug: "web_design", icon: "web", photo: "web", title: "الرقمي والنمو", items: "\u2068SEO\u2069، تسويق بالإيميل وواتساب، مواقع ومتاجر إلكترونية، صيانة المواقع، التحليلات" },
      { slug: "event_coverage", icon: "onsite", photo: "onsite", title: "على أرض الواقع", items: "تغطية الفعاليات، المطبوعات، الإعلانات الخارجية، التفعيلات" },
    ],
  },
  trust: {
    title: "الثقة تُبنى بالدليل",
    example: "مثال",
    review: { quote: "كنّا نختار الوكالات من إعلاناتها. هنا شفنا شغلهم الحقيقي مع عيادات مثلنا، ودفعنا كل مرحلة بعد ما تأكدنا منها.", name: "د. لينا، عيادة أسنان في إربد", badge: "مراجعة موثّقة", note: "يكتب المراجعة فقط عميل أنهى مشروعاً مع الوكالة." },
    rating: { label: "تقييم \u2068Google\u2069", caption: "يظهر تقييم \u2068Google\u2069 لكل وكالة على صفحتها كما هو." },
    contract: { title: "عقود بمراحل واتفاقية عدم إفصاح", body: "طلبات خاصة وقوائم تسليم وتوقيع برابط خاص." },
    team: { title: "فريق حقيقي للنزاعات", body: "إذا تعثّر مشروع، نراجع التسليمات مع الطرفين ونحسم." },
  },
  agencies: {
    title: "شغلك يستحق واجهة تليق به",
    body: "للوكالات والمستقلين في عمّان وإربد والزرقاء والعقبة والسلط ومادبا. صفحتك على سوّق مجانية.",
    features: [
      { icon: "photo", text: "صفحة أعمال مجانية مع واتساب واتصال ورسائل" },
      { icon: "design", text: "باقات بأسعار: منشورات، ريلز، ستوريز، إعلانات، مواقع، تصوير" },
      { icon: "ai", text: "طلبات مشاريع وفرص وعروض أسعار من عملاء جادّين" },
      { icon: "seo", text: "إحصاءات وصندوق رسائل ودعوات للتقييم" },
      { icon: "contract", text: "عقود جاهزة بمراحل وقوائم تسليم" },
      { icon: "shield", text: "دفعات محمية وفواتير وتحقق بخطوتين" },
    ],
    handle: "@وكالتك",
  },
  cities: {
    title: "في كل مدن الأردن",
    list: [
      { slug: "amman", name: "عمّان", alt: "AMMAN" },
      { slug: "irbid", name: "إربد", alt: "IRBID" },
      { slug: "zarqa", name: "الزرقاء", alt: "ZARQA" },
      { slug: "aqaba", name: "العقبة", alt: "AQABA" },
      { slug: "salt", name: "السلط", alt: "SALT" },
      { slug: "madaba", name: "مادبا", alt: "MADABA" },
    ],
    bandSub: "اكتب ما تحتاجه، والمطابق يرشّح لك الوكالات الأنسب.",
  },
  footer: {
    tagline: "أول منصة عربية لوكالات التسويق · الأردن",
    rights: "© 2026 سوّق",
    links: [
      { label: "تصفّح الوكالات", href: "explore" },
      { label: "المطابق الذكي", href: "match" },
      { label: "انضم كوكالة", href: "join" },
    ],
  },
};

const en: SiteCopy = {
  dir: "ltr",
  brand: "Sawwiq",
  otherLangHref: "/ar",
  otherLangName: "العربية",
  nav: [
    { href: "#how", label: "How it works" },
    { href: "#payments", label: "Protected payments" },
    { href: "#services", label: "Services" },
    { href: "#agencies", label: "For agencies" },
  ],
  country: { label: "Country", locate: "Use my location" },
  cta: { match: "Ask the matchmaker", browse: "Browse agencies", join: "Create your free page", reviews: "Read reviews" },
  chapters: [
    { id: "start", label: "Start", title: "Find the right marketing agency in Jordan", body: "For your clinic, dental practice, pharmacy, restaurant, shop or real estate office. See real work, ask the AI matchmaker, and pay by milestone." },
    { id: "how", label: "Real work", title: "See the work before the pitch", body: "Real posts and campaigns agencies made for restaurants, clinics and shops across Jordan, with Google ratings and verified reviews.", tags: ["Real posts", "Google ratings"] },
    { id: "ask", label: "Ask", title: "Ask the AI, or browse yourself", body: "Describe your project in Arabic or English. The matchmaker ranks agencies, explains why, and suggests a realistic budget.", tags: ["Arabic or English", "Realistic budgets"] },
    { id: "quotes", label: "Quotes", title: "Get quotes, compare calmly", body: "Send your project to your top matches and compare clear quotes side by side.", tags: ["Top matches invited", "Side-by-side quotes"] },
    { id: "sign", label: "Sign & pay", title: "Sign, then pay by milestone", body: "A contract with milestones, dates, amounts and checklists, signed by private link. Each milestone is paid through a licensed payment partner and reaches the agency only after you confirm the work.", tags: ["Optional NDA", "Protected payments"] },
  ],
  payments: {
    eyebrow: "Protected payments",
    eyebrowSoon: "Protected payments · coming soon",
    soon: "Coming soon: protected payments go live once our licensed payment partner is connected and the legal review is complete. Until then no real money moves through Sawwiq; try the steps here as a demo.",
    title: "The money waits until you confirm the work",
    body: "You pay each milestone to Sawwiq's licensed payment partner, never into Sawwiq's own accounts. It reaches the agency only after you confirm every item on the checklist.",
    direct: "Prefer paying the agency directly? You can; Sawwiq still keeps the contract and checklists, but the payment isn't protected.",
    points: [
      { icon: "contract", title: "Clear milestones", body: "Every payment is tied to deliverables, a date and an agreed amount." },
      { icon: "shield", title: "Held by a licensed partner", body: "The amount does not move until you approve every item." },
      { icon: "review", title: "A team for disputes", body: "If you disagree, our team reviews the evidence from both sides and decides, with one appeal." },
    ],
    ledger: {
      project: "Restaurant launch campaign, Amman",
      ref: "SWQ-2410",
      hint: "Try it: confirm the second milestone",
      reset: "Reset the demo",
      held: "With payment partner",
      released: "Paid to agency",
      locked: "Not started",
      totalHeld: "With payment partner",
      totalReleased: "Paid to agency",
      money: (n) => `JOD ${n}`,
      milestones: [
        { name: "Kick-off", date: "2026-10-05", amount: 350, items: ["One-month content plan", "Design templates", "On-site photo shoot"] },
        { name: "Month one", date: "2026-11-05", amount: 450, items: ["12 posts and 4 reels", "Meta ad campaign", "Monthly performance report"] },
        { name: "Opening", date: "2026-12-05", amount: 450, items: ["On-site opening coverage", "Recap video", "Hand over all files"] },
      ],
    },
  },
  who: {
    title: "Who we help",
    sub: "From the clinic and the corner café to a hotel in Aqaba, find agencies that have already worked in your field.",
    healthTitle: "Healthcare",
    healthNote: "Medical advertising in Jordan follows the Ministry of Health and syndicate rules; agencies on Sawwiq know them.",
    generalTitle: "And every other business",
    health: [
      { slug: "medical-clinics", photo: "biz-doctor", title: "Medical clinics", example: "Bookings and trust from Google and Meta ads, doctor videos", service: "ads_google", serviceLabel: "Google ads" },
      { slug: "dental", photo: "biz-dental", title: "Dental clinics", example: "Before and after smile content (with consent), Google Maps reviews", service: "seo", serviceLabel: "Search and Maps" },
      { slug: "pharmacies", photo: "biz-pharmacy", title: "Pharmacies", example: "Delivery campaigns and WhatsApp orders", service: "ads_meta", serviceLabel: "Meta ads" },
      { slug: "physiotherapy", photo: "biz-physio", title: "Physiotherapy centres", example: "Service explainer videos and booking funnels", service: "video_production", serviceLabel: "Video production" },
    ],
    items: [
      { slug: "restaurants", photo: "biz-restaurant", title: "Restaurants and cafés", example: "Instagram reels and menu shoots", service: "smm_content", serviceLabel: "Social content" },
      { slug: "boutiques", photo: "biz-boutique", title: "Boutiques and shops", example: "Product photos and TikTok content", service: "photography", serviceLabel: "Product photography" },
      { slug: "online-stores", photo: "biz-store", title: "Online stores", example: "Store setup and e-commerce ads", service: "ecommerce_setup", serviceLabel: "Store setup" },
      { slug: "real-estate", photo: "biz-realestate", title: "Real estate offices", example: "Property videos and lead ads", service: "ads_meta", serviceLabel: "Meta ads" },
      { slug: "gyms-salons", photo: "biz-gym", title: "Gyms and beauty salons", example: "Before and after content with influencers", service: "smm_influencer", serviceLabel: "Influencers" },
      { slug: "schools", photo: "biz-school", title: "Schools and training centres", example: "Enrolment campaigns every term", service: "ads_snapchat", serviceLabel: "Snapchat ads" },
      { slug: "hotels", photo: "biz-hotel", title: "Hotels in Aqaba and the Dead Sea", example: "Booking ads and drone video", service: "video_production", serviceLabel: "Video production" },
    ],
  },
  services: {
    title: "What you can hire",
    sub: "From running your accounts to covering your opening on the ground. Every service and city has a hire page with a price guide.",
    rows: [
      { slug: "smm_management", icon: "social", photo: "social", title: "Social media", items: "Account management, content, community, strategy, influencers" },
      { slug: "ads_meta", icon: "ads", photo: "ads", title: "Paid ads", items: "Meta, TikTok, Snapchat, Google, LinkedIn" },
      { slug: "video_production", icon: "video", photo: "video", title: "Creative production", items: "Video, photography, graphic design, motion graphics, copywriting" },
      { slug: "brand_identity", icon: "design", photo: "brand", title: "Brand", items: "Brand identity, brand strategy, packaging" },
      { slug: "web_design", icon: "web", photo: "web", title: "Digital and growth", items: "SEO, email and WhatsApp marketing, websites and online stores, maintenance, analytics" },
      { slug: "event_coverage", icon: "onsite", photo: "onsite", title: "On the ground", items: "Event coverage, print, outdoor ads, activations" },
    ],
  },
  trust: {
    title: "Trust, built on proof",
    example: "Example",
    review: { quote: "We used to pick agencies from their ads. Here we saw their real work for clinics like ours, and paid each stage after checking it.", name: "Dr. Lina, dental clinic in Irbid", badge: "Verified review", note: "Only a client who finished a project with the agency can review it." },
    rating: { label: "Google rating", caption: "Each agency's Google rating is shown on its page, as it is." },
    contract: { title: "Contracts with milestones and an NDA", body: "Special requests, checklists, and signing by private link." },
    team: { title: "A real team for disputes", body: "If a project stalls, we review the deliverables with both sides and decide." },
  },
  agencies: {
    title: "Your work deserves a proper showcase",
    body: "For agencies and freelancers in Amman, Irbid, Zarqa, Aqaba, Salt and Madaba. Your Sawwiq page is free.",
    features: [
      { icon: "photo", text: "A free portfolio page with WhatsApp, call and message" },
      { icon: "design", text: "Packages with prices: posts, reels, stories, ads, websites, shoots" },
      { icon: "ai", text: "Project requests, opportunities and quotes from serious clients" },
      { icon: "seo", text: "Insights, an inbox and review invites" },
      { icon: "contract", text: "Ready contracts with milestones and checklists" },
      { icon: "shield", text: "Protected payouts, billing and two-factor security" },
    ],
    handle: "@your-agency",
  },
  cities: {
    title: "Across Jordan",
    list: [
      { slug: "amman", name: "Amman", alt: "عمّان" },
      { slug: "irbid", name: "Irbid", alt: "إربد" },
      { slug: "zarqa", name: "Zarqa", alt: "الزرقاء" },
      { slug: "aqaba", name: "Aqaba", alt: "العقبة" },
      { slug: "salt", name: "Salt", alt: "السلط" },
      { slug: "madaba", name: "Madaba", alt: "مادبا" },
    ],
    bandSub: "Tell it what you need. It shortlists the right agencies.",
  },
  footer: {
    tagline: "The first Arabic marketplace for marketing agencies · Jordan",
    rights: "© 2026 Sawwiq",
    links: [
      { label: "Browse agencies", href: "explore" },
      { label: "AI matchmaker", href: "match" },
      { label: "Join as an agency", href: "join" },
    ],
  },
};

/** The copy as written, for Jordan. Use landingCopy() for the visitor's country. */
export const siteCopy: Record<Lang, SiteCopy> = { ar, en };

// The six cities the landing page names for Jordan (its original order);
// other countries show their first six cities.
const LANDING_CITIES: Partial<Record<CountryCode, string[]>> = { jo: ["amman", "irbid", "zarqa", "aqaba", "salt", "madaba"] };
// The payments demo is priced in JOD; roughly the same budget in each currency.
const LEDGER_SCALE: Record<CountryCode, number> = { jo: 1, sa: 5, ae: 5, qa: 5, kw: 0.45, bh: 0.55, om: 0.55, eg: 70 };

const landingCities = (country: Country) => {
  const keys = LANDING_CITIES[country.code];
  return keys ? keys.map((k) => country.cities.find((city) => city.key === k)!) : country.cities.slice(0, 6);
};
/** A round amount: tens below a thousand, fifties above. */
const scaleAmount = (n: number, code: CountryCode) => {
  const v = n * LEDGER_SCALE[code];
  const step = v >= 1000 ? 50 : 10;
  return Math.round(v / step) * step;
};
const joinAr = (names: string[]) => names.join(" و");
const joinEn = (names: string[]) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`);
/** "in Jordan", "in the United Arab Emirates". */
const enIn = (country: Country) => (country.code === "ae" ? `the ${country.en}` : country.en);

function build(lang: Lang, code: CountryCode): SiteCopy {
  const base = siteCopy[lang];
  if (code === "jo") return base;
  const country = countryOf(code);
  const cities = landingCities(country);
  const project = country.cities[0];
  const reviewCity = country.cities[Math.min(2, country.cities.length - 1)];
  const isAr = lang === "ar";
  const name = isAr ? country.ar : enIn(country);
  const cityName = (city: { ar: string; en: string }) => (isAr ? city.ar : city.en);
  const format = (n: number) => n.toLocaleString("en");
  const scale = (m: Milestone): Milestone => ({ ...m, amount: scaleAmount(m.amount, code) });

  return {
    ...base,
    chapters: base.chapters.map((ch) =>
      ch.id === "start"
        ? { ...ch, title: isAr ? `اعثر على وكالة التسويق المناسبة في ${name}` : `Find the right marketing agency in ${name}` }
        : ch.id === "how"
          ? {
              ...ch,
              body: isAr
                ? `منشورات وحملات حقيقية نفّذتها الوكالات لمطاعم وعيادات ومتاجر في ${name}، ومعها تقييمات \u2068Google\u2069 ومراجعات موثّقة.`
                : `Real posts and campaigns agencies made for restaurants, clinics and shops across ${name}, with Google ratings and verified reviews.`,
            }
          : ch,
    ),
    payments: {
      ...base.payments,
      ledger: {
        ...base.payments.ledger,
        project: isAr ? `حملة إطلاق مطعم، ${project.ar}` : `Restaurant launch campaign, ${project.en}`,
        money: isAr ? (n) => `${format(n)} ${country.currencyAr}` : (n) => `${country.currency} ${format(n)}`,
        milestones: base.payments.ledger.milestones.map(scale),
      },
    },
    who: {
      ...base.who,
      sub: isAr
        ? "من العيادة ومقهى الحي إلى الفنادق والمنتجعات: اعثر على وكالات اشتغلت في مجالك من قبل."
        : "From the clinic and the corner café to hotels and resorts, find agencies that have already worked in your field.",
      healthNote: isAr
        ? `يلتزم الإعلان الطبي في ${name} بأنظمة الجهات الصحية المختصة، ووكالات سوّق تعرفها.`
        : `Medical advertising in ${name} follows the health authorities' rules; agencies on Sawwiq know them.`,
      items: base.who.items.map((item) => (item.slug === "hotels" ? { ...item, title: isAr ? "فنادق وسياحة" : "Hotels and tourism" } : item)),
    },
    trust: {
      ...base.trust,
      review: { ...base.trust.review, name: isAr ? `د. لينا، عيادة أسنان في ${reviewCity.ar}` : `Dr. Lina, dental clinic in ${reviewCity.en}` },
    },
    agencies: {
      ...base.agencies,
      body: isAr
        ? `للوكالات والمستقلين في ${joinAr(cities.map(cityName))}. صفحتك على سوّق مجانية.`
        : `For agencies and freelancers in ${joinEn(cities.map(cityName))}. Your Sawwiq page is free.`,
    },
    cities: {
      ...base.cities,
      title: isAr ? `في كل مدن ${name}` : `Across ${name}`,
      list: cities.map((city) => ({ slug: city.key, name: cityName(city), alt: isAr ? city.en.toUpperCase() : city.ar })),
    },
    footer: { ...base.footer, tagline: isAr ? `أول منصة عربية لوكالات التسويق · ${name}` : `The first Arabic marketplace for marketing agencies · ${country.en}` },
  };
}

const built = new Map<string, SiteCopy>();

/**
 * The landing copy for a country: its name in the titles, tagline and health
 * note, its currency in the payments demo, and its cities. Jordan gets the copy
 * exactly as written above.
 */
export function landingCopy(lang: Lang, code: CountryCode): SiteCopy {
  const key = `${lang}:${code}`;
  let copy = built.get(key);
  if (!copy) {
    copy = build(lang, code);
    built.set(key, copy);
  }
  return copy;
}
export const THEME_COLOR = "#F2F2ED";
