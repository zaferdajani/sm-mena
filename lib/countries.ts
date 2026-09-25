/**
 * Countries Sawwiq serves: Jordan first, then the Gulf and Egypt. One source
 * for country names, currency, phone codes, time zones and the cities agencies
 * can be based in. City keys are unique across countries, so a city alone
 * tells the country (and old Jordan-only data keeps working).
 *
 * Amounts are stored per agency in its country's currency, in thousandths
 * ("fils" for JOD), whatever the currency's own minor unit.
 */

export type City = { key: string; ar: string; en: string };
export type Country = {
  code: CountryCode;
  ar: string;
  en: string;
  flag: string;
  currency: string;
  currencyAr: string;
  dial: string;
  timeZones: string[];
  /** Rough bounding box [south, west, north, east] for mapping a GPS position to a country. */
  box: [number, number, number, number];
  cities: City[];
};

export const COUNTRY_CODES = ["jo", "sa", "ae", "kw", "qa", "bh", "om", "eg"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];
export const DEFAULT_COUNTRY: CountryCode = "jo";

const c = (key: string, ar: string, en: string): City => ({ key, ar, en });

export const COUNTRIES: Country[] = [
  {
    code: "jo", ar: "الأردن", en: "Jordan", flag: "🇯🇴", currency: "JOD", currencyAr: "د.أ", dial: "962", timeZones: ["Asia/Amman"], box: [29.1, 34.9, 33.4, 39.3],
    cities: [
      c("amman", "عمّان", "Amman"), c("zarqa", "الزرقاء", "Zarqa"), c("irbid", "إربد", "Irbid"), c("aqaba", "العقبة", "Aqaba"),
      c("salt", "السلط", "Salt"), c("madaba", "مادبا", "Madaba"), c("karak", "الكرك", "Karak"), c("mafraq", "المفرق", "Mafraq"),
      c("jerash", "جرش", "Jerash"), c("ajloun", "عجلون", "Ajloun"), c("tafilah", "الطفيلة", "Tafilah"), c("maan", "معان", "Ma'an"),
    ],
  },
  {
    code: "sa", ar: "السعودية", en: "Saudi Arabia", flag: "🇸🇦", currency: "SAR", currencyAr: "ر.س", dial: "966", timeZones: ["Asia/Riyadh"], box: [16.3, 34.5, 32.2, 55.7],
    cities: [
      c("riyadh", "الرياض", "Riyadh"), c("jeddah", "جدة", "Jeddah"), c("makkah", "مكة المكرمة", "Makkah"), c("madinah", "المدينة المنورة", "Madinah"),
      c("dammam", "الدمام", "Dammam"), c("khobar", "الخبر", "Khobar"), c("dhahran", "الظهران", "Dhahran"), c("al_ahsa", "الأحساء", "Al Ahsa"),
      c("taif", "الطائف", "Taif"), c("abha", "أبها", "Abha"), c("tabuk", "تبوك", "Tabuk"), c("buraidah", "بريدة", "Buraidah"),
      c("hail", "حائل", "Hail"), c("jazan", "جازان", "Jazan"), c("najran", "نجران", "Najran"), c("jubail", "الجبيل", "Jubail"), c("yanbu", "ينبع", "Yanbu"),
    ],
  },
  {
    code: "ae", ar: "الإمارات", en: "United Arab Emirates", flag: "🇦🇪", currency: "AED", currencyAr: "د.إ", dial: "971", timeZones: ["Asia/Dubai"], box: [22.6, 51.5, 26.1, 56.4],
    cities: [
      c("dubai", "دبي", "Dubai"), c("abu_dhabi", "أبوظبي", "Abu Dhabi"), c("sharjah", "الشارقة", "Sharjah"), c("ajman", "عجمان", "Ajman"),
      c("ras_al_khaimah", "رأس الخيمة", "Ras Al Khaimah"), c("fujairah", "الفجيرة", "Fujairah"), c("umm_al_quwain", "أم القيوين", "Umm Al Quwain"), c("al_ain", "العين", "Al Ain"),
    ],
  },
  {
    code: "kw", ar: "الكويت", en: "Kuwait", flag: "🇰🇼", currency: "KWD", currencyAr: "د.ك", dial: "965", timeZones: ["Asia/Kuwait"], box: [28.5, 46.5, 30.1, 48.5],
    cities: [
      c("kuwait_city", "مدينة الكويت", "Kuwait City"), c("hawalli", "حولي", "Hawalli"), c("salmiya", "السالمية", "Salmiya"), c("farwaniya", "الفروانية", "Farwaniya"),
      c("ahmadi", "الأحمدي", "Ahmadi"), c("jahra", "الجهراء", "Jahra"), c("mubarak_al_kabeer", "مبارك الكبير", "Mubarak Al-Kabeer"),
    ],
  },
  {
    code: "qa", ar: "قطر", en: "Qatar", flag: "🇶🇦", currency: "QAR", currencyAr: "ر.ق", dial: "974", timeZones: ["Asia/Qatar"], box: [24.4, 50.7, 26.2, 51.7],
    cities: [c("doha", "الدوحة", "Doha"), c("al_rayyan", "الريان", "Al Rayyan"), c("lusail", "لوسيل", "Lusail"), c("al_wakrah", "الوكرة", "Al Wakrah"), c("al_khor", "الخور", "Al Khor"), c("umm_salal", "أم صلال", "Umm Salal")],
  },
  {
    code: "bh", ar: "البحرين", en: "Bahrain", flag: "🇧🇭", currency: "BHD", currencyAr: "د.ب", dial: "973", timeZones: ["Asia/Bahrain"], box: [25.5, 50.3, 26.4, 50.9],
    cities: [c("manama", "المنامة", "Manama"), c("muharraq", "المحرق", "Muharraq"), c("riffa", "الرفاع", "Riffa"), c("isa_town", "مدينة عيسى", "Isa Town"), c("hamad_town", "مدينة حمد", "Hamad Town"), c("sitra", "سترة", "Sitra")],
  },
  {
    code: "om", ar: "عُمان", en: "Oman", flag: "🇴🇲", currency: "OMR", currencyAr: "ر.ع", dial: "968", timeZones: ["Asia/Muscat"], box: [16.6, 52.0, 26.4, 59.9],
    cities: [c("muscat", "مسقط", "Muscat"), c("salalah", "صلالة", "Salalah"), c("sohar", "صحار", "Sohar"), c("nizwa", "نزوى", "Nizwa"), c("sur", "صور", "Sur"), c("ibri", "عبري", "Ibri"), c("barka", "بركاء", "Barka")],
  },
  {
    code: "eg", ar: "مصر", en: "Egypt", flag: "🇪🇬", currency: "EGP", currencyAr: "ج.م", dial: "20", timeZones: ["Africa/Cairo"], box: [22.0, 24.7, 31.7, 36.9],
    cities: [
      c("cairo", "القاهرة", "Cairo"), c("giza", "الجيزة", "Giza"), c("alexandria", "الإسكندرية", "Alexandria"), c("new_cairo", "القاهرة الجديدة", "New Cairo"),
      c("sheikh_zayed", "الشيخ زايد", "Sheikh Zayed"), c("october", "السادس من أكتوبر", "6th of October"), c("mansoura", "المنصورة", "Mansoura"), c("tanta", "طنطا", "Tanta"),
      c("zagazig", "الزقازيق", "Zagazig"), c("ismailia", "الإسماعيلية", "Ismailia"), c("port_said", "بورسعيد", "Port Said"), c("suez", "السويس", "Suez"),
      c("luxor", "الأقصر", "Luxor"), c("aswan", "أسوان", "Aswan"), c("hurghada", "الغردقة", "Hurghada"), c("sharm_el_sheikh", "شرم الشيخ", "Sharm El Sheikh"), c("asyut", "أسيوط", "Asyut"),
    ],
  },
];

const byCode = new Map(COUNTRIES.map((x) => [x.code, x]));
const cityCountry = new Map(COUNTRIES.flatMap((x) => x.cities.map((city) => [city.key, x.code] as const)));

export const isCountryCode = (v: unknown): v is CountryCode => typeof v === "string" && (COUNTRY_CODES as readonly string[]).includes(v);
export const countryOf = (code: string | null | undefined): Country => byCode.get(isCountryCode(code) ? code : DEFAULT_COUNTRY)!;
export const countryName = (code: string, locale: string) => (locale === "ar" ? countryOf(code).ar : countryOf(code).en);
export const currencyOf = (code: string | null | undefined) => countryOf(code).currency;
export const citiesOf = (code: string | null | undefined) => countryOf(code).cities;
/** The country a city belongs to (city keys are unique across countries). */
export const countryOfCity = (city: string | null | undefined): CountryCode | null => (city ? (cityCountry.get(city) ?? null) : null);
export const isCityIn = (city: string, code: string) => countryOfCity(city) === code;

/** Every city key, for validation. */
export const ALL_CITIES = COUNTRIES.flatMap((x) => x.cities.map((city) => city.key));

/**
 * Country from an IP-geolocation header value (Vercel's `x-vercel-ip-country`
 * is an upper-case ISO code such as "SA"). Only countries Sawwiq serves count;
 * anything else (or no header) is null.
 */
export function countryFromHeader(value: string | null | undefined): CountryCode | null {
  const code = value?.trim().toLowerCase();
  return isCountryCode(code) ? code : null;
}

/** Country from the device's time zone (no permission needed), or null. */
export function countryFromTimeZone(tz: string | null | undefined): CountryCode | null {
  if (!tz) return null;
  return COUNTRIES.find((x) => x.timeZones.includes(tz))?.code ?? null;
}

/**
 * Country from a GPS position. Small countries are tested first because
 * their boxes sit inside bigger ones; outside the region, null.
 */
export function countryFromPosition(lat: number, lon: number): CountryCode | null {
  const order: CountryCode[] = ["bh", "qa", "kw", "ae", "jo", "om", "eg", "sa"];
  for (const code of order) {
    const [s, w, n, e] = countryOf(code).box;
    if (lat >= s && lat <= n && lon >= w && lon <= e) return code;
  }
  return null;
}

/** How a currency is written after an amount: "د.أ" in Arabic, "JOD" in English. */
export const currencyLabel = (currency: string, locale: string) => (locale === "ar" ? (COUNTRIES.find((x) => x.currency === currency)?.currencyAr ?? currency) : currency);

/** Money in the country's currency. Amounts are whole currency units. */
export function formatMoney(value: number, locale: string, currency = "JOD", fractionDigits = 0): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en", { style: "currency", currency, maximumFractionDigits: fractionDigits, minimumFractionDigits: 0 }).format(value);
}
