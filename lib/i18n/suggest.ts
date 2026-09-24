// Which language to OFFER a visitor, never which one to force (ported from
// OneClickConvert's i18n/suggest.ts and adapted to an Arabic-first site).
//
// Signals, strongest first:
//   1. A device set to Arabic is a person who chose Arabic.
//   2. A clock in an Arabic-speaking country: Arabic (an English-configured
//      phone in Amman is still offered Arabic).
//   3. A device set to another language we speak (English, …).
//   4. Outside the Arab world with an unknown device language: English.
// Returns null when the suggestion is the language already on screen.

export const COUNTRY_LANG: Record<string, string> = {
  JO: "ar", PS: "ar", LB: "ar", SY: "ar", IQ: "ar", SA: "ar", KW: "ar", BH: "ar",
  QA: "ar", AE: "ar", OM: "ar", YE: "ar", EG: "ar", LY: "ar", TN: "ar", DZ: "ar",
  MA: "ar", EH: "ar", SD: "ar",
  IR: "fa", AF: "fa", PK: "ur", TR: "tr",
  FR: "fr", BE: "fr", LU: "fr", SN: "fr", CI: "fr",
  RU: "ru", BY: "ru", KZ: "ru", IN: "hi", ID: "id",
  ES: "es", MX: "es", AR: "es", CO: "es", DE: "de", AT: "de", CN: "zh", TW: "zh", HK: "zh",
};

export function suggestLocale({
  current,
  enabled,
  browserLanguages,
  country,
}: {
  current: string;
  enabled: readonly string[];
  browserLanguages: readonly string[];
  country: string | null;
}): string | null {
  const speaks = (code: string | null | undefined): code is string => Boolean(code && enabled.includes(code));
  const stated = browserLanguages.map((l) => l.toLowerCase().split("-")[0]).find((l) => speaks(l)) ?? null;
  const fromCountry = country ? COUNTRY_LANG[country] ?? null : null;
  const pick =
    stated === "ar"
      ? "ar"
      : speaks(fromCountry)
        ? fromCountry
        : stated ?? (country && fromCountry !== "ar" && speaks("en") ? "en" : null);
  return pick && pick !== current ? pick : null;
}
