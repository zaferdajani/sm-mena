// Demo texts in both languages (docs/31). A demo agency writes in one language
// (Arabic when its name is Arabic, else English); its posts, packages and
// reviews use that language, and the other one goes into `translation`, so an
// Arabic page never shows English demo copy and the reader's language wins.
// Shared by the seed (lib/db/seed.ts) and by the one-time refresh of existing
// rows (lib/db/demo-text-refresh.ts).
import type { ContentLang } from "@/lib/content-lang";
import type { DemoKind } from "./demo-images";

export type Bi = { ar: string; en: string };

/** A demo agency's language, from its name. */
export const demoLang = (name: string): ContentLang => (/[a-z]/i.test(name) ? "en" : "ar");
export const otherOf = (lang: ContentLang): ContentLang => (lang === "ar" ? "en" : "ar");

/** Short lines drawn into the generated pictures. */
export const DEMO_HEADLINES: Record<DemoKind, Bi[]> = {
  ad: [
    { ar: "خصم 30% اليوم فقط", en: "-30% today only" },
    { ar: "إصدار جديد", en: "New drop" },
    { ar: "اطلب الآن", en: "Order now" },
    { ar: "عرض محدود", en: "Limited offer" },
  ],
  content: [
    { ar: "قائمة الشتاء", en: "Winter menu" },
    { ar: "خلف الكواليس", en: "Behind the scenes" },
    { ar: "نصيحة اليوم", en: "Tip of the day" },
    { ar: "تعرّف على الفريق", en: "Meet the team" },
  ],
  video: [
    { ar: "ريلز · 0:24", en: "Reel · 0:24" },
    { ar: "ريلز جديد", en: "New reel" },
    { ar: "محتوى عملاء · 0:15", en: "UGC · 0:15" },
    { ar: "درون · 0:30", en: "Drone · 0:30" },
  ],
  branding: [
    { ar: "تحديث الهوية", en: "Brand refresh" },
    { ar: "هوية جديدة", en: "New identity" },
    { ar: "نظام الشعار", en: "Logo system" },
    { ar: "الخط واللون", en: "Type & colour" },
  ],
  photo: [
    { ar: "تصوير منتجات", en: "Product shoot" },
    { ar: "جلسة تصوير", en: "Photo session" },
    { ar: "تصوير القائمة", en: "Menu shoot" },
    { ar: "كتالوج الموسم", en: "Lookbook" },
  ],
  results: [
    { ar: "وصول أعلى بنسبة 180%", en: "+180% reach" },
    { ar: "عائد إعلاني 3.2 أضعاف", en: "3.2x ROAS" },
    { ar: "عملاء محتملون أكثر 45%", en: "+45% leads" },
    { ar: "تكلفة اكتساب أقل 38%", en: "-38% CPA" },
  ],
};

/** Captions of the generated posts (the seed picks one at random per post). */
export const DEMO_CAPTIONS: Bi[] = [
  { ar: "حملة إطلاق لمدة ٣٠ يوماً: محتوى يومي وإعلانات موجّهة لسكان عمّان.", en: "A 30-day launch campaign: daily content and ads aimed at people in Amman." },
  { ar: "تقويم محتوى شهري: 12 منشورًا و8 قصص و4 ريلز.", en: "Monthly content calendar: 12 posts, 8 stories and 4 reels." },
  { ar: "إعادة تصميم هوية الحساب بالكامل مع قوالب ثابتة للمنشورات.", en: "A full redesign of the account's look, with fixed post templates." },
  { ar: "حملة رمضان مع صنّاع محتوى وإعلانات ممولة. النتائج في الشريحة الأخيرة.", en: "Ramadan campaign with creators and paid social. Results in the last slide." },
  { ar: "تصوير منتجات بخلفية بيضاء ونمط حياة للموقع والإنستغرام.", en: "Product photography on white and lifestyle shots for the website and Instagram." },
  { ar: "من ألفي متابع إلى 18 ألفًا خلال أربعة أشهر بريلز غير مدفوعة.", en: "From 2k to 18k followers in four months with organic reels." },
];

/** The short result line under a post (null: none). */
export const DEMO_RESULTS: (Bi | null)[] = [
  { ar: "وصول أعلى بنسبة 180% خلال 30 يومًا", en: "+180% reach in 30 days" },
  { ar: "عائد إعلاني 3.2 أضعاف", en: "3.2x return on ad spend" },
  { ar: "عملاء محتملون أكثر بنسبة 45%", en: "+45% leads" },
  { ar: "18 ألف متابع جديد", en: "18k new followers" },
  null,
  null,
];

/** Reviewer name, business and text, each side in its own language. */
export type DemoReview = [name: string, business: string, body: string];
export const DEMO_REVIEWS: { ar: DemoReview; en: DemoReview }[] = [
  {
    ar: ["سارة", "مقهى الورد", "فريق محترف جداً، التزموا بالمواعيد وتضاعف التفاعل على حسابنا خلال شهرين."],
    en: ["Sara", "Al Ward Café", "A very professional team: they kept every deadline and engagement on our account doubled in two months."],
  },
  {
    ar: ["عمر", "ديزرت ثريدز", "تقارير واضحة كل أسبوع، وانخفضت تكلفة كل عملية بيع بمقدار الثلث. سنتعاقد معهم مجددًا."],
    en: ["Omar", "Desert Threads", "Clear reporting every week and our cost per sale dropped by a third. Would hire again."],
  },
  {
    ar: ["لينا", "عيادة بسمة", "التواصل ممتاز والمحتوى مناسب لجمهورنا. نتمنى سرعة أكبر في التعديلات."],
    en: ["Lina", "Basma Clinic", "Excellent communication and content that suits our audience. We would like faster edits."],
  },
  {
    ar: ["خالد", "ليفانت تورز", "أفكار إبداعية ممتازة وتنفيذ متقن للريلز. السعر عادل مقابل الجودة."],
    en: ["Khaled", "Levant Tours", "Great creative ideas and solid execution on our Reels. Pricing was fair for the quality."],
  },
  {
    ar: ["رنا", "متجر رنا", "نتائج جيدة في الإعلانات لكن احتجنا لمتابعة أكثر في البداية."],
    en: ["Rana", "Rana's Store", "Good results from the ads, but we needed closer follow-up at the start."],
  },
  {
    ar: ["يوسف", "عمّان العقارية", "فريق محترف يفهم السوق الأردني. تحسّن عدد العملاء المحتملين بسرعة."],
    en: ["Yousef", "Amman Realty", "Professional team that understood the Jordanian market. Leads improved quickly."],
  },
];

export const DEMO_REVIEW_REPLY: Bi = { ar: "شكراً لثقتكم، سعدنا بالعمل معكم!", en: "Thank you, it was a pleasure working with you!" };

/** The two default packages of a demo agency without its own. */
export const DEMO_PACKAGES: { title: Bi; deliverables: Bi[] }[] = [
  {
    title: { ar: "الباقة الأساسية", en: "Starter" },
    deliverables: [
      { ar: "12 منشورًا", en: "12 posts" },
      { ar: "8 قصص", en: "8 stories" },
      { ar: "تقرير شهري", en: "Monthly report" },
    ],
  },
  {
    title: { ar: "باقة النمو", en: "Growth" },
    deliverables: [
      { ar: "20 منشورًا", en: "20 posts" },
      { ar: "4 ريلز", en: "4 Reels" },
      { ar: "إدارة الإعلانات الممولة", en: "Paid ads management" },
      { ar: "تقرير أسبوعي", en: "Weekly report" },
    ],
  },
];

/** A package's text in one language and its translation in the other. */
export function packageTexts(pkg: (typeof DEMO_PACKAGES)[number], lang: ContentLang) {
  const other = otherOf(lang);
  return { title: pkg.title[lang], deliverables: pkg.deliverables.map((d) => d[lang]), translation: { title: pkg.title[other], deliverables: pkg.deliverables.map((d) => d[other]) } };
}

/** Both sides of every pair, for finding a row that still carries one of the old single-language texts. */
export function sidesOf<T extends { ar: unknown; en: unknown }>(pairs: (T | null)[]): T[] {
  return pairs.filter((p): p is T => p !== null);
}
