import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { CITIES, PLATFORMS } from "@/lib/labels";
import { allServices } from "@/lib/taxonomy";

export async function serviceAndCityOptions() {
  const locale = await getLocale();
  const tCity = await getTranslations("Cities");
  const tPlat = await getTranslations("Platforms");
  return {
    platforms: PLATFORMS.map((key) => ({ key, label: tPlat(key) })),
    services: allServices.map((s) => ({ key: s.key, label: locale === "ar" ? s.name_ar : s.name_en })),
    cities: CITIES.map((key) => ({ key, label: tCity(key) })),
  };
}
