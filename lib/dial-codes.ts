/**
 * International dialling codes for phone fields (WhatsApp at sign-up and in
 * the studio). ISO 3166-1 alpha-2 → calling code without "+". Names come from
 * the browser (Intl.DisplayNames) in the page's language, so none are stored.
 * North American numbering plan islands carry their full "1xxx" code.
 */
export const DIAL_CODES: Record<string, string> = {
  AF: "93", AL: "355", DZ: "213", AS: "1684", AD: "376", AO: "244", AI: "1264", AG: "1268", AR: "54", AM: "374",
  AW: "297", AU: "61", AT: "43", AZ: "994", BS: "1242", BH: "973", BD: "880", BB: "1246", BY: "375", BE: "32",
  BZ: "501", BJ: "229", BM: "1441", BT: "975", BO: "591", BA: "387", BW: "267", BR: "55", VG: "1284", BN: "673",
  BG: "359", BF: "226", BI: "257", KH: "855", CM: "237", CA: "1", CV: "238", KY: "1345", CF: "236", TD: "235",
  CL: "56", CN: "86", CO: "57", KM: "269", CG: "242", CD: "243", CK: "682", CR: "506", CI: "225", HR: "385",
  CU: "53", CW: "599", CY: "357", CZ: "420", DK: "45", DJ: "253", DM: "1767", DO: "1809", EC: "593", EG: "20",
  SV: "503", GQ: "240", ER: "291", EE: "372", SZ: "268", ET: "251", FK: "500", FO: "298", FJ: "679", FI: "358",
  FR: "33", GF: "594", PF: "689", GA: "241", GM: "220", GE: "995", DE: "49", GH: "233", GI: "350", GR: "30",
  GL: "299", GD: "1473", GP: "590", GU: "1671", GT: "502", GN: "224", GW: "245", GY: "592", HT: "509", HN: "504",
  HK: "852", HU: "36", IS: "354", IN: "91", ID: "62", IR: "98", IQ: "964", IE: "353", IL: "972", IT: "39",
  JM: "1876", JP: "81", JO: "962", KZ: "7", KE: "254", KI: "686", XK: "383", KW: "965", KG: "996", LA: "856",
  LV: "371", LB: "961", LS: "266", LR: "231", LY: "218", LI: "423", LT: "370", LU: "352", MO: "853", MG: "261",
  MW: "265", MY: "60", MV: "960", ML: "223", MT: "356", MH: "692", MQ: "596", MR: "222", MU: "230", YT: "262",
  MX: "52", FM: "691", MD: "373", MC: "377", MN: "976", ME: "382", MS: "1664", MA: "212", MZ: "258", MM: "95",
  NA: "264", NR: "674", NP: "977", NL: "31", NC: "687", NZ: "64", NI: "505", NE: "227", NG: "234", KP: "850",
  MK: "389", NO: "47", OM: "968", PK: "92", PW: "680", PS: "970", PA: "507", PG: "675", PY: "595", PE: "51",
  PH: "63", PL: "48", PT: "351", PR: "1787", QA: "974", RE: "262", RO: "40", RU: "7", RW: "250", KN: "1869",
  LC: "1758", VC: "1784", WS: "685", SM: "378", ST: "239", SA: "966", SN: "221", RS: "381", SC: "248", SL: "232",
  SG: "65", SX: "1721", SK: "421", SI: "386", SB: "677", SO: "252", ZA: "27", KR: "82", SS: "211", ES: "34",
  LK: "94", SD: "249", SR: "597", SE: "46", CH: "41", SY: "963", TW: "886", TJ: "992", TZ: "255", TH: "66",
  TL: "670", TG: "228", TO: "676", TT: "1868", TN: "216", TR: "90", TM: "993", TC: "1649", TV: "688", UG: "256",
  UA: "380", AE: "971", GB: "44", US: "1", UY: "598", UZ: "998", VU: "678", VA: "39", VE: "58", VN: "84",
  VI: "1340", YE: "967", ZM: "260", ZW: "263",
};

/** Arab countries come first in the list (Sawwiq's markets), then everyone else by name. */
export const ARAB_FIRST = ["JO", "SA", "AE", "KW", "QA", "BH", "OM", "EG", "IQ", "PS", "LB", "SY", "YE", "LY", "TN", "DZ", "MA", "SD", "MR", "SO", "DJ", "KM"];

export const DEFAULT_DIAL_COUNTRY = "JO";

export const isDialCountry = (code: unknown): code is string => typeof code === "string" && Object.hasOwn(DIAL_CODES, code.toUpperCase());

export const flagOf = (iso2: string) => String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

/**
 * A phone number typed in a local or international form, as +<country><number>.
 * Arabic-Indic digits are accepted; "+" or "00" means the number is already
 * international; otherwise the trunk "0" is dropped and the chosen country's
 * code is added (07X XXX XXXX in Jordan → +9627XXXXXXXX).
 */
export function internationalPhone(country: string | null | undefined, input: string): string {
  const cleaned = input.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return `+${cleaned.slice(1).replace(/\D/g, "")}`;
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  const dial = DIAL_CODES[(country ?? DEFAULT_DIAL_COUNTRY).toUpperCase()] ?? DIAL_CODES[DEFAULT_DIAL_COUNTRY];
  // Someone who typed the country code without "+" keeps it.
  if (cleaned.startsWith(dial) && cleaned.length > dial.length + 6) return `+${cleaned}`;
  return `+${dial}${cleaned.replace(/^0+/, "")}`;
}

/** Splits a stored international number back into its country and local part (for editing). */
export function splitPhone(phone: string | null | undefined, fallback: string): { country: string; local: string } {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!phone?.startsWith("+") || !digits) return { country: fallback, local: phone ?? "" };
  // Longest matching code wins; the fallback country breaks ties (+1, +7, +39…).
  const matches = Object.entries(DIAL_CODES).filter(([, dial]) => digits.startsWith(dial));
  const longest = Math.max(0, ...matches.map(([, d]) => d.length));
  const best = matches.filter(([, d]) => d.length === longest);
  const pick = best.find(([c]) => c === fallback) ?? best[0];
  return pick ? { country: pick[0], local: digits.slice(pick[1].length) } : { country: fallback, local: phone };
}
