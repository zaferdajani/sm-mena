import { ALL_CITIES } from "@/lib/countries";
import { allServices, taxonomy } from "@/lib/taxonomy";

export function serviceLabel(key: string, locale: string): string {
  const service = allServices.find((s) => s.key === key);
  if (!service) return key;
  return locale === "ar" ? service.name_ar : service.name_en;
}

export function serviceOptions(locale: string) {
  return taxonomy.categories.map((category) => ({
    key: category.key,
    label: locale === "ar" ? category.name_ar : category.name_en,
    services: category.services.map((s) => ({ key: s.key, label: locale === "ar" ? s.name_ar : s.name_en })),
  }));
}

/** Every city in every country Sawwiq serves (lib/countries.ts). */
export const CITIES = ALL_CITIES as [string, ...string[]];
export const PLATFORMS = taxonomy.platforms;
export const INDUSTRIES = taxonomy.business_types;
export const TEAM_SIZES = ["1", "2-5", "6-15", "16-40", "40+"] as const;
export const PRICE_STEPS = [150, 300, 600, 1200] as const;
