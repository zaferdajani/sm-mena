import { INDUSTRIES } from "@/lib/labels";
import { searchTags } from "@/lib/services/catalog";
import { normalizeForSearch } from "@/lib/text";

/**
 * What a typed search means besides its exact words: the services whose names or aliases it names (so
 * "سوشال" finds social media agencies) and the business types it names (so "مخبز" or "bakery" finds work
 * for restaurants and cafés). Pure; the lists widen a search, they never narrow it.
 */
const BUSINESS_WORDS: Record<(typeof INDUSTRIES)[number], string[]> = {
  restaurant_cafe: ["مطعم", "مطاعم", "مقهى", "مقاهي", "كافيه", "كوفي", "قهوة", "مخبز", "مخابز", "حلويات", "حلويات", "معجنات", "restaurant", "cafe", "café", "coffee", "bakery", "bakeries", "sweets", "dessert", "food"],
  clinic_health: ["عيادة", "عيادات", "طبيب", "طبية", "اسنان", "أسنان", "صيدلية", "مستشفى", "clinic", "dental", "dentist", "doctor", "pharmacy", "medical", "hospital"],
  retail_shop: ["متجر", "محل", "محلات", "ملابس", "أزياء", "ازياء", "بوتيك", "shop", "store", "boutique", "fashion", "retail"],
  real_estate: ["عقار", "عقارات", "شقق", "real estate", "property", "properties"],
  education: ["مدرسة", "مدارس", "تعليم", "أكاديمية", "اكاديمية", "جامعة", "school", "academy", "education", "university"],
  beauty_fitness: ["صالون", "تجميل", "نادي رياضي", "جيم", "سبا", "salon", "beauty", "gym", "fitness", "spa"],
  ecommerce: ["متجر إلكتروني", "متجر الكتروني", "أونلاين", "اونلاين", "ecommerce", "e-commerce", "online store"],
  professional_services: ["محاماة", "محامي", "محاسبة", "استشارات", "law firm", "lawyer", "accounting", "consulting"],
  tourism_hospitality: ["فندق", "فنادق", "سياحة", "منتجع", "hotel", "tourism", "resort"],
  manufacturing: ["مصنع", "مصانع", "factory", "manufacturing"],
  ngo: ["جمعية", "منظمة", "خيرية", "ngo", "charity", "nonprofit"],
  other: [],
};

const INDEX = Object.entries(BUSINESS_WORDS).map(([key, words]) => ({ key, words: words.map((w) => normalizeForSearch(w)) }));

export function searchIntent(query: string): { services: string[]; industries: string[] } {
  const q = normalizeForSearch(query).trim();
  if (q.length < 2) return { services: [], industries: [] };
  const words = q.split(/\s+/);
  const industries = INDEX.filter(({ words: list }) => list.some((w) => w === q || words.includes(w) || (w.includes(" ") && q.includes(w)))).map((i) => i.key);
  const services = q.length >= 3 ? searchTags(q, { limit: 6 }).map((t) => t.key) : [];
  return { services, industries };
}
