import { COUNTRIES } from "@/lib/core/catalog/countries";
import type { Translate } from "./translate";

// "Based in Jordan · takes clients in Saudi Arabia": shown wherever an agency
// appears outside its home country (agencies.serves_countries).

const name = (code: string, locale: string) => {
  const c = COUNTRIES.find((x) => x.code === code);
  return c ? `${c.flag} ${locale === "ar" ? c.ar : c.en}` : code;
};

/**
 * For a listing in `viewCountry`: a note when the agency is based elsewhere.
 * Without a view country (the agency's own page): where it is based and the
 * other countries it serves, or null when it only works at home.
 * Pure: `t` is the "Profile" namespace translator.
 */
export function servesNoteFor(locale: string, t: Translate, agency: { country: string; servesCountries: string[] }, viewCountry?: string | null): string | null {
  if (viewCountry) {
    return agency.country !== viewCountry ? t("servesHere", { home: name(agency.country, locale), here: name(viewCountry, locale) }) : null;
  }
  if (!agency.servesCountries.length) return null;
  const others = agency.servesCountries.map((c) => name(c, locale)).join(locale === "ar" ? "، " : ", ");
  return `${t("basedIn", { country: name(agency.country, locale) })} · ${t("alsoServes", { countries: others })}`;
}
