import { citiesOf, type CountryCode } from "@/lib/core/catalog/countries";
import { PLATFORMS } from "@/lib/core/catalog/labels";
import { allServices } from "@/lib/core/catalog/taxonomy";
import type { Translate } from "./translate";

export type FormOptions = {
  platforms: { key: string; label: string }[];
  services: { key: string; label: string }[];
  cities: { key: string; label: string }[];
};

/** Service, platform and city choices for the request form, labelled for `locale`. Pure: the translators come in. */
export function serviceAndCityOptionsFor(locale: string, country: CountryCode, t: { cities: Translate; platforms: Translate }): FormOptions {
  return {
    platforms: PLATFORMS.map((key) => ({ key, label: t.platforms(key) })),
    services: allServices.map((s) => ({ key: s.key, label: locale === "ar" ? s.name_ar : s.name_en })),
    // Cities of the visitor's country (requests are matched within one country).
    cities: citiesOf(country).map((c) => ({ key: c.key, label: t.cities(c.key) })),
  };
}
