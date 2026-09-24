import { COUNTRIES } from "@/lib/countries";
/** "3 days ago" style relative time in Arabic or English. */
export function timeAgo(iso: string, locale: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, "second");
}

/** Whole amounts in a currency (default JOD): agency prices, packages, budgets. */
export function formatJod(value: number, locale: string, currency = "JOD"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-JO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

/** Money stored in fils (1 JOD = 1000 fils), shown in dinars. */
/** Thousandths of a currency (contracts, payments): "150 د.أ", "1,200.5 SAR". */
export function formatFils(fils: number, locale: string, currency = "JOD"): string {
  const symbol = locale === "ar" ? (COUNTRIES.find((c) => c.currency === currency)?.currencyAr ?? currency) : currency;
  return `${(fils / 1000).toLocaleString(locale === "ar" ? "ar-JO-u-nu-latn" : "en", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} ${symbol}`;
}
