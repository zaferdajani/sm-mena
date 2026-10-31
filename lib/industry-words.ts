import { normalizeForSearch } from "@/lib/text";

/**
 * Everyday words business owners type for their own business, mapped to the business types agencies are
 * filed under (data/service-taxonomy.json business_types). Searching "مخبز" or "bakery" found nothing, because
 * no agency writes "bakery" in its name; the type "restaurants and cafés" is what fits.
 */
export const BUSINESS_WORDS: Record<string, string[]> = {
  restaurant_cafe: ["مخبز", "مخابز", "فرن", "حلويات", "كنافة", "مطعم", "مطاعم", "مقهى", "مقاهي", "كافيه", "كوفي", "قهوة", "شاورما", "بيتزا", "bakery", "bakeries", "sweets", "dessert", "restaurant", "cafe", "café", "coffee", "pizza", "food"],
  clinic_health: ["عيادة", "عيادات", "طبيب", "دكتور", "أسنان", "صيدلية", "مستشفى", "مختبر", "clinic", "dental", "dentist", "doctor", "pharmacy", "hospital", "health"],
  retail_shop: ["متجر", "محل", "محلات", "بوتيك", "ملابس", "أزياء", "أحذية", "عطور", "مجوهرات", "shop", "store", "boutique", "fashion", "clothes", "perfume", "jewelry"],
  real_estate: ["عقار", "عقارات", "شقق", "إسكان", "real estate", "property", "apartments"],
  education: ["مدرسة", "مدارس", "روضة", "جامعة", "تعليم", "دورات", "أكاديمية", "school", "kindergarten", "academy", "courses", "education"],
  beauty_fitness: ["صالون", "تجميل", "سبا", "نادي", "جيم", "رياضة", "حلاق", "salon", "beauty", "spa", "gym", "fitness", "barber"],
  ecommerce: ["متجر إلكتروني", "تسوق إلكتروني", "online store", "ecommerce", "e-commerce"],
  tourism_hospitality: ["فندق", "فنادق", "سياحة", "سفر", "منتجع", "hotel", "tourism", "travel", "resort"],
  professional_services: ["محاماة", "محامي", "محاسبة", "استشارات", "law firm", "lawyer", "accounting", "consulting"],
  manufacturing: ["مصنع", "مصانع", "factory", "manufacturing"],
  ngo: ["جمعية", "منظمة", "خيرية", "ngo", "charity", "nonprofit"],
};

// Phrases first, so "متجر إلكتروني" (online store) is not read as "متجر" (shop).
const INDEX = Object.entries(BUSINESS_WORDS)
  .flatMap(([industry, words]) => words.map((w) => [normalizeForSearch(w), industry] as const))
  .sort((a, b) => Number(b[0].includes(" ")) - Number(a[0].includes(" ")));

/** The business type a search means, when it is one of those everyday words (whole word or phrase); otherwise null. */
export function industryForWords(query: string | null | undefined): string | null {
  if (!query) return null;
  const q = normalizeForSearch(query);
  if (!q) return null;
  const words = new Set(q.split(/\s+/));
  for (const [word, industry] of INDEX) if (q === word || words.has(word) || (word.includes(" ") && q.includes(word))) return industry;
  return null;
}
