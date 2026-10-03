import "server-only";
import { getTranslations } from "next-intl/server";
import type { CountryOption } from "@/components/country-city-field";
import { countryOptionsFor } from "@/lib/core/options/country";

/** Next binding of lib/core/options/country.ts: countries with their cities, labelled in the page's language. */
export async function countryOptions(locale: string): Promise<CountryOption[]> {
  const tCity = await getTranslations({ locale, namespace: "Cities" });
  return countryOptionsFor(locale, tCity);
}
