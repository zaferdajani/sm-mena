import { COUNTRIES } from "@/lib/core/catalog/countries";
import type { Translate } from "./translate";

export type CountryOptionData = { code: string; name: string; flag: string; cities: { key: string; label: string }[] };

/** Countries with their cities, labelled in `locale`, for the country + city field. Pure: the city translator comes in. */
export function countryOptionsFor(locale: string, tCity: Translate): CountryOptionData[] {
  return COUNTRIES.map((c) => ({ code: c.code, name: locale === "ar" ? c.ar : c.en, flag: c.flag, cities: c.cities.map((x) => ({ key: x.key, label: tCity(x.key) })) }));
}
