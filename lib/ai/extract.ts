import { COUNTRIES, countryOf, DEFAULT_COUNTRY, type CountryCode } from "@/lib/countries";
import { normalizeForSearch } from "@/lib/text";

// Keyword rules for the rule-based matchmaker (no AI key). Pure: shared by the
// basic and mock matchmakers and unit tests. Keywords are normalised with
// normalizeForSearch, so "إعلانات" and "اعلانات" match alike.

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

/**
 * Extra spellings for cities (the Arabic and English names in lib/countries.ts
 * always count). Names that are also everyday words ("المدينة" = "the city",
 * "October" the month, "الخبر" = "the news") only count in their full form.
 */
const CITY_ALIASES: Record<string, string[]> = {
  amman: ["عمان"],
  riyadh: ["رياض", "riyad", "ar riyadh"],
  jeddah: ["جده", "jiddah", "jedda"],
  makkah: ["مكه", "mecca", "makka"],
  madinah: ["المدينه المنوره", "medina", "madina"],
  dammam: ["دمام"],
  khobar: ["al khobar", "alkhobar"],
  al_ahsa: ["الاحساء", "الهفوف", "ahsa", "hofuf"],
  abu_dhabi: ["ابو ظبي", "abudhabi"],
  ras_al_khaimah: ["راس الخيمه", "rak"],
  kuwait_city: ["kuwait city"],
  sharm_el_sheikh: ["شرم", "sharm"],
  october: ["6 اكتوبر", "6th of october", "6 october", "october city"],
};
/** City keys whose own English name is too common a word to trust alone. */
const CITY_NAME_SKIP = new Set(["october", "salt", "sur", "hail"]);

/** How people write each currency after (or before) an amount. */
const CURRENCY_WORDS: Record<string, string[]> = {
  JOD: ["دينار", "دنانير", "د.ا", "jod", "jd", "dinar", "dinars"],
  SAR: ["ريال", "ريالات", "ر.س", "رس", "sar", "sr", "riyal", "riyals"],
  AED: ["درهم", "دراهم", "د.ا", "aed", "dhs", "dirham", "dirhams"],
  KWD: ["دينار", "دنانير", "د.ك", "kwd", "kd", "dinar", "dinars"],
  QAR: ["ريال", "ريالات", "ر.ق", "qar", "qr", "riyal", "riyals"],
  BHD: ["دينار", "دنانير", "د.ب", "bhd", "bd", "dinar", "dinars"],
  OMR: ["ريال", "ريالات", "ر.ع", "omr", "ro", "rial", "rials", "riyal"],
  EGP: ["جنيه", "جنيها", "جنيهات", "ج.م", "egp", "le", "pound", "pounds"],
};

const COUNTRY_ALIASES: Record<CountryCode, string[]> = {
  jo: ["الاردن", "jordan"],
  sa: ["السعوديه", "المملكه العربيه السعوديه", "saudi", "saudi arabia", "ksa"],
  ae: ["الامارات", "uae", "emirates", "united arab emirates"],
  kw: ["الكويت", "kuwait"],
  qa: ["قطر", "qatar"],
  bh: ["البحرين", "bahrain"],
  om: ["سلطنه عمان", "oman"],
  eg: ["مصر", "egypt"],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A word on its own, allowing Arabic prefixes glued to it (و، ب، ل، ف، ك): "بالرياض", "وجدة".
const PUNCT = "\\s,.،؛:!?؟()\\-/\"'…";
const wordRe = (alias: string) => new RegExp(`(?:^|[${PUNCT}])(?:[وبلفك]{0,2})${escape(alias)}(?=$|[${PUNCT}])`);

type CityEntry = { key: string; country: CountryCode; re: RegExp; length: number };
const CITY_ENTRIES: CityEntry[] = COUNTRIES.flatMap((country) =>
  country.cities.flatMap((city) => {
    const names = [city.ar, ...(CITY_NAME_SKIP.has(city.key) ? [] : [city.en]), ...(CITY_ALIASES[city.key] ?? [])];
    return [...new Set(names.map(normalizeForSearch))].map((alias) => ({ key: city.key, country: country.code, re: wordRe(alias), length: alias.length }));
  }),
);
const COUNTRY_ENTRIES = (Object.entries(COUNTRY_ALIASES) as [CountryCode, string[]][]).flatMap(([code, names]) =>
  [...new Set([...names, countryOf(code).en].map(normalizeForSearch))].map((alias) => ({ code, re: wordRe(alias) })),
);

const find = (text: string, table: [string, string[]][]) => table.filter(([, words]) => words.some((w) => text.includes(normalizeForSearch(w)))).map(([key]) => key);

/** Cities named in the text: the visitor's country first, then by position (longest name wins a tie). */
function findCities(t: string, country: CountryCode) {
  const hits: { key: string; country: CountryCode; index: number; length: number }[] = [];
  for (const e of CITY_ENTRIES) {
    // In Oman, "عمان" is the country, not Amman.
    if (country === "om" && e.key === "amman") continue;
    const m = e.re.exec(t);
    if (m) hits.push({ key: e.key, country: e.country, index: m.index, length: e.length });
  }
  hits.sort((a, b) => Number(b.country === country) - Number(a.country === country) || a.index - b.index || b.length - a.length);
  return hits;
}

/** Amounts in the visitor's currency: "5000 ريال", "SAR 5,000", "5k SAR", "٣ آلاف ريال", "budget 1500". */
function findBudget(t: string, currency: string): number | null {
  const words = [...new Set((CURRENCY_WORDS[currency] ?? [currency.toLowerCase()]).map(normalizeForSearch))].sort((a, b) => b.length - a.length).map(escape).join("|");
  const num = "(\\d[\\d,.]*)\\s*(k|الف|الاف|thousand)?";
  const cur = `(?<![a-z\\u0621-\\u064a])(?:${words})(?![a-z\\u0621-\\u064a])`;
  const re = new RegExp(`${num}\\s*${cur}|${cur}\\s*${num}|(?:ميزانيه|ميزانيتي|budget)\\D{0,12}${num}`, "g");
  let budget: number | null = null;
  for (const m of t.replace(/٬/g, ",").matchAll(re)) {
    const raw = (m[1] ?? m[3] ?? m[5] ?? "").replace(/,/g, "");
    let n = Number.parseFloat(raw);
    if (m[2] || m[4] || m[6]) n *= 1000;
    if (Number.isFinite(n) && n >= 30 && n <= 10_000_000) budget = Math.round(n);
  }
  return budget;
}

export type ExtractedNeed = {
  services: string[];
  platforms: string[];
  industry: string | null;
  /** A city in the visitor's country. */
  city: string | null;
  /** Monthly budget in the visitor's currency. */
  budget: number | null;
  /** A city or country outside the visitor's country the text names (and none inside it). */
  elsewhere: { country: CountryCode; city: string | null } | null;
};

/**
 * Reads a brief in Arabic or English. Cities of every country are known, but
 * only one in the visitor's `country` becomes `city`; another country's city
 * (or name) comes back as `elsewhere`, so the caller can ask before switching.
 * Budgets are read in the visitor's currency.
 */
export function extractNeed(text: string, country: CountryCode = DEFAULT_COUNTRY): ExtractedNeed {
  const t = ` ${normalizeForSearch(text)} `;
  const services = find(t, SERVICE_KEYWORDS);
  const platforms = find(t, PLATFORM_KEYWORDS);
  const industries = find(t, INDUSTRY_KEYWORDS);
  // Plain "ads" plus a platform means that platform's ads.
  if (/(اعلان|ads|advert)/.test(t)) {
    const map: Record<string, string> = { instagram: "ads_meta", facebook: "ads_meta", tiktok: "ads_tiktok", snapchat: "ads_snapchat", google: "ads_google", linkedin: "ads_linkedin" };
    for (const p of platforms) if (map[p] && !services.includes(map[p])) services.push(map[p]);
  }
  if (!services.length && platforms.length) services.push("smm_management");

  const cities = findCities(t, country);
  const home = cities.find((c) => c.country === country);
  let elsewhere: ExtractedNeed["elsewhere"] = null;
  if (!home) {
    const other = cities[0];
    if (other) elsewhere = { country: other.country, city: other.key };
    else {
      const named = COUNTRY_ENTRIES.find((e) => e.code !== country && e.re.test(t));
      if (named) elsewhere = { country: named.code, city: null };
    }
  }
  return {
    services: [...new Set(services)].slice(0, 4),
    platforms,
    industry: industries[0] ?? null,
    city: home?.key ?? null,
    budget: findBudget(t, countryOf(country).currency),
    elsewhere,
  };
}

export const isArabic = (text: string) => /[؀-ۿ]/.test(text);
