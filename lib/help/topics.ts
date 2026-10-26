// How-to answers for the help chat (docs/62). Pure and client-safe: the guided
// chat matches a question here with no AI provider; the AI chat gets the same
// list as its only source of product facts. Answers live in messages/*.json
// under Help.topics.<id>; every link is a real page.

export type HelpTopic = { id: string; link: string; keywords: string[] };

export const HELP_TOPICS: HelpTopic[] = [
  { id: "addProject", link: "/studio/new", keywords: ["project", "work", "post", "upload", "image", "photo", "portfolio", "مشروع", "عمل", "أعمال", "نشر", "صورة", "صور", "رفع"] },
  { id: "profile", link: "/studio/profile", keywords: ["profile", "logo", "bio", "about", "name", "whatsapp", "service", "صفحة", "شعار", "نبذة", "اسم", "واتساب", "خدمات", "خدمة", "تعديل"] },
  { id: "packages", link: "/studio/packages", keywords: ["package", "price", "pricing", "offer", "cost", "باقة", "باقات", "سعر", "أسعار", "عرض", "تكلفة"] },
  { id: "clients", link: "/studio/clients", keywords: ["client", "brand", "account", "عميل", "عملاء", "علامة", "حساب العميل"] },
  { id: "visibility", link: "/studio/publication", keywords: ["private", "public", "visible", "hidden", "who can see", "publish", "خاص", "عام", "ظهور", "يرى", "مخفي", "إخفاء"] },
  { id: "password", link: "/forgot", keywords: ["password", "forgot", "reset", "locked", "كلمة المرور", "نسيت", "كلمة السر", "استعادة"] },
  { id: "ownerSignIn", link: "/signin", keywords: ["code", "sign in", "login", "log in", "business owner", "رمز", "دخول", "تسجيل الدخول", "صاحب عمل"] },
  { id: "medal", link: "/studio", keywords: ["medal", "badge", "founding", "letter", "invitation", "وسام", "شارة", "مؤسس", "رسالة", "دعوة"] },
  { id: "share", link: "/studio", keywords: ["share", "link", "send my page", "مشاركة", "رابط", "أرسل صفحتي"] },
  { id: "language", link: "/", keywords: ["language", "english", "arabic", "لغة", "إنجليزي", "عربي", "الإنجليزية", "العربية"] },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "") // Arabic diacritics
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

/** The best-matching topics for a question, most keyword hits first (at most three). */
export function matchTopics(question: string, limit = 3): HelpTopic[] {
  const q = normalize(question);
  return HELP_TOPICS.map((t) => ({ t, hits: t.keywords.filter((k) => q.includes(normalize(k))).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .slice(0, limit)
    .map((x) => x.t);
}

export const HELP_KINDS = ["bug", "complaint", "question", "suggestion"] as const;
export type HelpKind = (typeof HELP_KINDS)[number];

/** The report a guided or AI conversation files: the same fields the bug agent reads (docs/61). */
export type HelpDraft = { kind: HelpKind; what: string; steps?: string; expected?: string };

/** One readable report text from the chat's answers. Labels are English so the bug agent reads one shape. */
export function composeReport(d: HelpDraft): string {
  return [
    d.what.trim(),
    d.steps?.trim() ? `Steps: ${d.steps.trim()}` : "",
    d.expected?.trim() ? `Expected: ${d.expected.trim()}` : "",
    "(sent from the help chat)",
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);
}
