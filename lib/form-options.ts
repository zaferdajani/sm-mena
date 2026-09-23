import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { CITIES } from "@/lib/labels";
import { allServices } from "@/lib/taxonomy";

export async function serviceAndCityOptions() {
  const locale = await getLocale();
  const tCity = await getTranslations("Cities");
  return {
    services: allServices.map((s) => ({ key: s.key, label: locale === "ar" ? s.name_ar : s.name_en })),
    cities: CITIES.map((key) => ({ key, label: tCity(key) })),
  };
}
