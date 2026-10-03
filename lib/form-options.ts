import "server-only";
import { getLocale, getTranslations } from "next-intl/server";
import { serviceAndCityOptionsFor } from "@/lib/core/options/form";
import { currentCountry } from "@/lib/country-choice";

/** Next binding of lib/core/options/form.ts: reads the locale, the visitor's country and the translators from the request. */
export async function serviceAndCityOptions() {
  const [locale, country, tCity, tPlat] = await Promise.all([getLocale(), currentCountry(), getTranslations("Cities"), getTranslations("Platforms")]);
  return serviceAndCityOptionsFor(locale, country, { cities: tCity, platforms: tPlat });
}
