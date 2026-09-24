import "server-only";
import { getTranslations } from "next-intl/server";
import type { CountryOption } from "@/components/country-city-field";
import { COUNTRIES } from "@/lib/countries";

/** Countries with their cities, labelled in the page's language, for the country + city field. */
export async function countryOptions(locale: string): Promise<CountryOption[]> {
  const tCity = await getTranslations({ locale, namespace: "Cities" });
  return COUNTRIES.map((c) => ({ code: c.code, name: locale === "ar" ? c.ar : c.en, flag: c.flag, cities: c.cities.map((x) => ({ key: x.key, label: tCity(x.key) })) }));
}
