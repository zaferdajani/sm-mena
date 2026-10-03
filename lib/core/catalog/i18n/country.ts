// Visitor country from the device"s own IANA time zone (ported from
// OneClickConvert). Not from the IP address: nothing is stored or sent to a
// lookup service, and a coarse answer ("which countries use this clock") is
// all the language offer and the statistics need. Unknown zones stay unknown.

export const ZONE_TO_COUNTRY: Record<string, string> = {
  // Middle East and North Africa — the site"s main audience.
  "Asia/Amman": "JO", "Asia/Jerusalem": "IL", "Asia/Hebron": "PS", "Asia/Gaza": "PS",
  "Asia/Beirut": "LB", "Asia/Damascus": "SY", "Asia/Baghdad": "IQ", "Asia/Riyadh": "SA",
  "Asia/Kuwait": "KW", "Asia/Bahrain": "BH", "Asia/Qatar": "QA", "Asia/Dubai": "AE",
  "Asia/Muscat": "OM", "Asia/Aden": "YE", "Africa/Cairo": "EG", "Africa/Tripoli": "LY",
  "Africa/Tunis": "TN", "Africa/Algiers": "DZ", "Africa/Casablanca": "MA",
  "Africa/El_Aaiun": "EH", "Africa/Khartoum": "SD", "Asia/Tehran": "IR",
  "Europe/Istanbul": "TR", "Asia/Istanbul": "TR", "Asia/Nicosia": "CY",

  // Europe.
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Lisbon": "PT", "Europe/Madrid": "ES",
  "Europe/Paris": "FR", "Europe/Brussels": "BE", "Europe/Amsterdam": "NL",
  "Europe/Berlin": "DE", "Europe/Zurich": "CH", "Europe/Vienna": "AT", "Europe/Rome": "IT",
  "Europe/Copenhagen": "DK", "Europe/Oslo": "NO", "Europe/Stockholm": "SE",
  "Europe/Helsinki": "FI", "Europe/Warsaw": "PL", "Europe/Prague": "CZ",
  "Europe/Budapest": "HU", "Europe/Bucharest": "RO", "Europe/Sofia": "BG",
  "Europe/Athens": "GR", "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Moscow": "RU",
  "Europe/Belgrade": "RS", "Europe/Zagreb": "HR", "Europe/Sarajevo": "BA",
  "Europe/Ljubljana": "SI", "Europe/Bratislava": "SK", "Europe/Vilnius": "LT",
  "Europe/Riga": "LV", "Europe/Tallinn": "EE", "Europe/Minsk": "BY", "Europe/Tirane": "AL",
  "Europe/Skopje": "MK", "Europe/Chisinau": "MD", "Atlantic/Reykjavik": "IS",
  "Atlantic/Canary": "ES", "Europe/Malta": "MT", "Europe/Luxembourg": "LU",

  // Americas.
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Anchorage": "US",
  "America/Detroit": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
  "America/Winnipeg": "CA", "America/Halifax": "CA", "America/St_Johns": "CA",
  "America/Mexico_City": "MX", "America/Tijuana": "MX", "America/Monterrey": "MX",
  "America/Bogota": "CO", "America/Lima": "PE", "America/Santiago": "CL",
  "America/Caracas": "VE", "America/La_Paz": "BO", "America/Asuncion": "PY",
  "America/Montevideo": "UY", "America/Guatemala": "GT", "America/Panama": "PA",
  "America/Havana": "CU", "America/Santo_Domingo": "DO", "America/Puerto_Rico": "PR",
  "America/Jamaica": "JM", "America/Costa_Rica": "CR", "America/Tegucigalpa": "HN",
  "America/El_Salvador": "SV", "America/Managua": "NI",
  "America/Sao_Paulo": "BR", "America/Fortaleza": "BR", "America/Manaus": "BR",
  "America/Recife": "BR", "America/Bahia": "BR",
  "America/Argentina/Buenos_Aires": "AR", "America/Buenos_Aires": "AR",

  // Africa (sub-Saharan).
  "Africa/Lagos": "NG", "Africa/Accra": "GH", "Africa/Abidjan": "CI",
  "Africa/Dakar": "SN", "Africa/Nairobi": "KE", "Africa/Kampala": "UG",
  "Africa/Dar_es_Salaam": "TZ", "Africa/Addis_Ababa": "ET", "Africa/Mogadishu": "SO",
  "Africa/Johannesburg": "ZA", "Africa/Harare": "ZW", "Africa/Lusaka": "ZM",
  "Africa/Kinshasa": "CD", "Africa/Luanda": "AO", "Africa/Douala": "CM",

  // Asia and Oceania.
  "Asia/Karachi": "PK", "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
  "Asia/Colombo": "LK", "Asia/Dhaka": "BD", "Asia/Kathmandu": "NP",
  "Asia/Kabul": "AF", "Asia/Tashkent": "UZ", "Asia/Almaty": "KZ", "Asia/Baku": "AZ",
  "Asia/Tbilisi": "GE", "Asia/Yerevan": "AM", "Asia/Bishkek": "KG", "Asia/Dushanbe": "TJ",
  "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN", "Asia/Saigon": "VN",
  "Asia/Jakarta": "ID", "Asia/Makassar": "ID", "Asia/Kuala_Lumpur": "MY",
  "Asia/Singapore": "SG", "Asia/Manila": "PH", "Asia/Yangon": "MM",
  "Asia/Phnom_Penh": "KH", "Asia/Vientiane": "LA",
  "Asia/Shanghai": "CN", "Asia/Chongqing": "CN", "Asia/Urumqi": "CN",
  "Asia/Hong_Kong": "HK", "Asia/Macau": "MO", "Asia/Taipei": "TW",
  "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Pyongyang": "KP",
  "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Australia/Brisbane": "AU",
  "Australia/Perth": "AU", "Australia/Adelaide": "AU", "Australia/Darwin": "AU",
  "Pacific/Auckland": "NZ", "Pacific/Fiji": "FJ",
};

/** Two-letter country code for a time zone, or null when we don"t know it. */
export function countryOfZone(zone: string | null | undefined): string | null {
  return zone ? ZONE_TO_COUNTRY[zone] ?? null : null;
}

/** The visitor"s country in the browser, or null. */
export function visitorCountry(): string | null {
  try {
    return countryOfZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

/** Country name in the given language, falling back to the code. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}
