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

export type RichPart = { text: string } | { href: string; topic: string | null } | { bold: string };

/**
 * Turns a help reply into display parts (docs/62): an in-site path such as
 * "(/studio/new)" becomes a tappable link named after its help topic, **bold**
 * stays bold, and other Markdown marks the model may add (list bullets, headings,
 * backticks) are dropped. Only paths on this site become links; nothing is HTML.
 */
export function richHelpText(text: string): RichPart[] {
  const clean = text
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "• ")
    .replace(/`([^`]*)`/g, "$1");
  const parts: RichPart[] = [];
  const re = /\(?(\/(?:[a-z]{2}\/)?[a-z0-9][a-z0-9/_-]*)\)?|\*\*([^*\n]+)\*\*/g;
  let last = 0;
  for (const m of clean.matchAll(re)) {
    const start = m.index ?? 0;
    // A path must stand alone (after a space, bracket or line start), never inside a word or URL.
    if (m[1] && start > 0 && !/[\s(«"'،,:]/.test(clean[start - 1]) && clean[start] !== "(") continue;
    if (start > last) parts.push({ text: clean.slice(last, start) });
    if (m[2]) parts.push({ bold: m[2] });
    else {
      const path = m[1].replace(/^\/(ar|en)(?=\/)/, "").replace(/\/$/, "") || "/";
      parts.push({ href: path, topic: HELP_TOPICS.find((t) => t.link === path)?.id ?? null });
    }
    last = start + m[0].length;
  }
  if (last < clean.length) parts.push({ text: clean.slice(last) });
  // Tidy the space a removed "(…)" leaves before punctuation.
  return parts.map((p) => ("text" in p ? { text: p.text.replace(/\s+([،,.])/g, "$1") } : p)).filter((p) => !("text" in p) || p.text);
}
