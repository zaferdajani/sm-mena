import "server-only";
import { findMatches, marketPrices } from "@/lib/matching";
import { normalizeForSearch } from "@/lib/text";
import { serviceLabel } from "@/lib/labels";
import type { ChatMessage, MatchResponse } from "./types";

// Rule-based matchmaker used when no Anthropic API key is configured or the
// API is unavailable. Keyword lists are normalised with normalizeForSearch.
const SERVICE_KEYWORDS: [string, string[]][] = [
  ["ads_meta", ["اعلانات فيسبوك", "اعلانات انستغرام", "اعلانات انستقرام", "اعلان ممول", "ممول", "meta ads", "facebook ads", "instagram ads", "sponsored"]],
  ["ads_tiktok", ["اعلانات تيك توك", "اعلان تيك توك", "tiktok ads"]],
  ["ads_snapchat", ["اعلانات سناب", "سناب شات", "snapchat"]],
  ["ads_google", ["اعلانات جوجل", "جوجل ادز", "google ads", "adwords"]],
  ["ads_linkedin", ["لينكد", "linkedin"]],
  ["smm_management", ["اداره حساب", "اداره حسابات", "اداره السوشيال", "سوشيال ميديا", "social media", "manage my", "account management", "community manager"]],
  ["smm_content", ["محتوي", "منشورات", "بوستات", "content", "posts"]],
  ["smm_community", ["الرد علي", "الردود", "التعليقات", "community"]],
  ["smm_influencer", ["مؤثر", "مشاهير", "influencer", "ugc"]],
  ["smm_strategy", ["استراتيجيه", "خطه تسويق", "strategy", "marketing plan"]],
  ["video_production", ["فيديو", "ريلز", "ريل", "مونتاج", "video", "reels", "reel"]],
  ["photography", ["تصوير", "صور منتجات", "photo", "photography", "shoot"]],
  ["graphic_design", ["تصميم", "design", "graphic"]],
  ["copywriting", ["كتابه", "كابشن", "copywriting", "captions"]],
  ["brand_identity", ["هويه", "شعار", "لوجو", "logo", "brand identity", "branding"]],
  ["seo", ["seo", "سيو", "محركات البحث"]],
  ["email_marketing", ["ايميل", "بريد", "newsletter", "email marketing", "واتساب بزنس"]],
  ["web_design", ["تصميم موقع", "موقع الكتروني", "موقع ويب", "website", "web design", "landing page"]],
  ["analytics", ["تحليلات", "تقارير", "analytics", "reporting"]],
];
const PLATFORM_KEYWORDS: [string, string[]][] = [
  ["instagram", ["انستغرام", "انستقرام", "انستا", "instagram", "insta"]],
  ["facebook", ["فيسبوك", "فيس بوك", "facebook"]],
  ["tiktok", ["تيك توك", "تيكتوك", "tiktok"]],
  ["snapchat", ["سناب", "snapchat"]],
  ["linkedin", ["لينكد", "linkedin"]],
  ["youtube", ["يوتيوب", "youtube"]],
  ["google", ["جوجل", "google"]],
  ["x", ["تويتر", "twitter"]],
];
const INDUSTRY_KEYWORDS: [string, string[]][] = [
  ["restaurant_cafe", ["مطعم", "مقهي", "كافيه", "كوفي", "restaurant", "cafe", "coffee"]],
  ["clinic_health", ["عياده", "طبي", "اسنان", "صيدليه", "clinic", "dental", "medical", "pharmacy"]],
  ["ecommerce", ["متجر الكتروني", "اونلاين", "online store", "ecommerce", "e-commerce"]],
  ["retail_shop", ["محل", "متجر", "ملابس", "shop", "store", "boutique"]],
  ["real_estate", ["عقار", "شقق", "real estate", "property"]],
  ["education", ["مدرسه", "اكاديميه", "تعليم", "دورات", "school", "academy", "courses", "education"]],
  ["beauty_fitness", ["صالون", "تجميل", "جيم", "نادي رياضي", "salon", "beauty", "gym", "fitness"]],
  ["tourism_hospitality", ["فندق", "سياحه", "سفر", "hotel", "tourism", "travel"]],
  ["manufacturing", ["مصنع", "factory", "manufacturing"]],
  ["ngo", ["جمعيه", "منظمه", "ngo", "charity"]],
];
const CITY_KEYWORDS: [string, string[]][] = [
  ["amman", ["عمان", "amman"]], ["zarqa", ["الزرقاء", "زرقاء", "zarqa"]], ["irbid", ["اربد", "irbid"]], ["aqaba", ["العقبه", "aqaba"]],
  ["salt", ["السلط", "salt"]], ["madaba", ["مادبا", "madaba"]], ["karak", ["الكرك", "karak"]], ["mafraq", ["المفرق", "mafraq"]],
  ["jerash", ["جرش", "jerash"]], ["ajloun", ["عجلون", "ajloun"]], ["tafilah", ["الطفيله", "tafilah"]], ["maan", ["معان", "maan"]],
];

const find = (text: string, table: [string, string[]][]) => table.filter(([, words]) => words.some((w) => text.includes(normalizeForSearch(w)))).map(([key]) => key);

export function extractNeed(text: string) {
  const t = ` ${normalizeForSearch(text)} `;
  const services = find(t, SERVICE_KEYWORDS);
  const platforms = find(t, PLATFORM_KEYWORDS);
  const industries = find(t, INDUSTRY_KEYWORDS);
  const cities = find(t, CITY_KEYWORDS);
  // Plain "ads" plus a platform means that platform's ads.
  if (/(اعلان|ads|advert)/.test(t)) {
    const map: Record<string, string> = { instagram: "ads_meta", facebook: "ads_meta", tiktok: "ads_tiktok", snapchat: "ads_snapchat", google: "ads_google", linkedin: "ads_linkedin" };
    for (const p of platforms) if (map[p] && !services.includes(map[p])) services.push(map[p]);
  }
  if (!services.length && platforms.length) services.push("smm_management");
  // Budget: a number next to a currency or budget word.
  let budget: number | null = null;
  const re = /(\d[\d,.]*)\s*(k)?\s*(دينار|د\.?ا|jod|jd|dinar)|(?:ميزانيه|ميزانيتي|budget)\D{0,12}(\d[\d,.]*)\s*(k)?/g;
  for (const m of t.matchAll(re)) {
    const raw = (m[1] ?? m[4] ?? "").replace(/,/g, "");
    let n = Number.parseFloat(raw);
    if (m[2] || m[5]) n *= 1000;
    if (Number.isFinite(n) && n >= 30 && n <= 1_000_000) budget = Math.round(n);
  }
  return { services: [...new Set(services)].slice(0, 4), platforms, industry: industries[0] ?? null, city: cities[0] ?? null, budget };
}

const isArabic = (text: string) => /[؀-ۿ]/.test(text);

export async function basicMatchmaker(history: ChatMessage[], locale: string): Promise<MatchResponse> {
  const userText = history.filter((m) => m.role === "user").map((m) => m.content).join(" \n ");
  const last = history.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const ar = last ? isArabic(last) : locale === "ar";
  const need = extractNeed(userText);

  if (!need.services.length) {
    return {
      mode: "basic",
      recommendation: null,
      reply: ar
        ? "أهلاً! أخبرني عن نشاطك وما تحتاجه: إدارة حسابات، إعلانات ممولة، تصوير وفيديو، أو هوية بصرية؟ ويفيدني أن أعرف مدينتك وميزانيتك الشهرية."
        : "Hi! Tell me about your business and what you need: account management, paid ads, photo and video, or branding? Your city and monthly budget help too.",
      suggestions: ar
        ? ["أحتاج إدارة حساب إنستغرام لمطعم في عمّان", "إعلانات فيسبوك وإنستغرام لمتجر إلكتروني بميزانية ٥٠٠ دينار", "تصوير منتجات وريلز", "هوية بصرية لشركة ناشئة"]
        : ["Instagram management for a restaurant in Amman", "Meta ads for an online store, 500 JOD budget", "Product photos and Reels", "Brand identity for a startup"],
    };
  }

  const matches = await findMatches({ services: need.services, city: need.city, budgetMaxJod: need.budget, platforms: need.platforms, industry: need.industry }, 5);
  const prices = await marketPrices(need.services[0], null);
  const range = prices.suggested;
  const budgetMin = need.budget ? Math.min(need.budget, range?.min ?? need.budget) : range?.min ?? null;
  const budgetMax = need.budget ?? range?.max ?? null;
  const serviceNames = need.services.map((s) => serviceLabel(s, ar ? "ar" : "en")).join(ar ? "، " : ", ");
  const note = range
    ? ar
      ? `حسب أسعار ${prices.agencies} وكالة على سوّق، تتراوح الباقات الشهرية غالباً بين ${range.min} و${range.max} دينار (الوسيط ${range.median}).`
      : `Based on ${prices.agencies} agencies on Sawwiq, monthly packages usually range from ${range.min} to ${range.max} JOD (median ${range.median}).`
    : ar
      ? "لا تتوفر أسعار كافية لهذه الخدمة بعد."
      : "Not enough price data for this service yet.";

  if (!matches.length) {
    return {
      mode: "basic",
      recommendation: null,
      reply: ar ? `لم أجد وكالات لـ ${serviceNames} بهذه الشروط. جرّب مدينة أخرى أو ميزانية أوسع.` : `I couldn't find agencies for ${serviceNames} with these filters. Try another city or a wider budget.`,
      suggestions: ar ? ["في أي مدينة", "ميزانية أعلى"] : ["Any city", "Higher budget"],
    };
  }

  const summary = ar
    ? `نبحث عن ${serviceNames}${need.city ? ` في ${need.city}` : ""}${need.budget ? ` بميزانية حوالي ${need.budget} دينار شهرياً` : ""}. ${last}`
    : `Looking for ${serviceNames}${need.city ? ` in ${need.city}` : ""}${need.budget ? ` with a budget around ${need.budget} JOD per month` : ""}. ${last}`;

  return {
    mode: "basic",
    reply: ar
      ? `وجدت ${matches.length} وكالات مناسبة لـ ${serviceNames}. رتّبتها حسب ملاءمة الخدمات وأعمالها السابقة والتقييمات والسعر والموقع. تواصل معها عبر واتساب، أو أرسل مشروعك لتصلك عروض أسعار.`
      : `I found ${matches.length} agencies that fit ${serviceNames}, ranked by service fit, past work, reviews, price and location. Contact them on WhatsApp, or send your project to receive quotes.`,
    recommendation: {
      agencies: matches,
      services: need.services,
      city: need.city,
      platforms: need.platforms,
      budgetMinJod: budgetMin,
      budgetMaxJod: budgetMax,
      budgetNote: note,
      summary: summary.slice(0, 1500),
    },
    suggestions: ar ? ["أرسل مشروعي لهذه الوكالات", "أحتاج أيضاً تصوير", "في مدينة أخرى"] : ["Send my project to these agencies", "I also need photography", "Another city"],
  };
}
