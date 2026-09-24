import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { citiesOf } from "@/lib/countries";
import { currentCountry } from "@/lib/country-choice";
import { PLATFORMS } from "@/lib/labels";
import { allServices } from "@/lib/taxonomy";

export async function serviceAndCityOptions() {
  const locale = await getLocale();
  const tCity = await getTranslations("Cities");
  const tPlat = await getTranslations("Platforms");
  return {
    platforms: PLATFORMS.map((key) => ({ key, label: tPlat(key) })),
    services: allServices.map((s) => ({ key: s.key, label: locale === "ar" ? s.name_ar : s.name_en })),
    // Cities of the visitor's country (requests are matched within one country).
    cities: citiesOf(await currentCountry()).map((c) => ({ key: c.key, label: tCity(c.key) })),
  };
}
