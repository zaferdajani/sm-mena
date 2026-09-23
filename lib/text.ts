// Text helpers shared by server code and tests. No framework imports.

const TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/**
 * Normalises Arabic and Latin text for search: lowercase, strips diacritics
 * and tatweel, unifies alef/ya/ta-marbuta variants and Arabic-Indic digits.
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(TASHKEEL, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\s+/g, " ")
    .trim();
}

export const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$/;

const RESERVED_HANDLES = new Set([
  "admin", "api", "studio", "explore", "saved", "login", "logout", "signup",
  "register", "settings", "media", "p", "a", "about", "terms", "privacy",
  "help", "support", "sawwiq", "ar", "en",
]);

/** Instagram-style handle: 3–30 chars, a–z 0–9 . _, no leading/trailing symbol. */
export function validateHandle(handle: string): "ok" | "invalid" | "reserved" {
  const value = handle.trim().toLowerCase();
  if (!HANDLE_PATTERN.test(value) || value.includes("..")) return "invalid";
  if (RESERVED_HANDLES.has(value)) return "reserved";
  return "ok";
}

/** Keeps digits and a leading +, and converts a local Jordanian 07 number to +9627. */
export function normalizePhone(input: string): string {
  const cleaned = input.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[^\d+]/g, "");
  if (/^07\d{8}$/.test(cleaned)) return `+962${cleaned.slice(1)}`;
  if (/^9627\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^009627\d{8}$/.test(cleaned)) return `+${cleaned.slice(2)}`;
  return cleaned;
}

/** wa.me link with an optional prefilled message. */
export function whatsappLink(phone: string, message?: string): string {
  const digits = normalizePhone(phone).replace(/\D/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/** Adds https:// to a bare domain and rejects anything that is not http(s). */
export function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Instagram username from "@name", "name" or a profile URL. */
export function instagramHandle(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const match = value.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const handle = (match ? match[1] : value.replace(/^@/, "")).toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(handle) ? handle : null;
}

/** Compact counts: 1.2K, 3.4M; Arabic uses the same Latin digits used on the site. */
export function compactNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
