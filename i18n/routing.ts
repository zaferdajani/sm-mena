import { defineRouting } from "next-intl/routing";
import { isRtl } from "./languages";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  localePrefix: "always",
  // Never switch language on the visitor's behalf (OneClickConvert's rule):
  // "/" opens Arabic, or the language the visitor picked before (proxy.ts),
  // and a one-line offer suggests another language when the device or its
  // time zone point to it (components/language-offer.tsx).
  localeDetection: false,
  // hreflang is declared per page in the HTML (lib/seo.ts). next-intl's Link
  // header would add a conflicting set whose x-default is an unprefixed URL
  // that redirects.
  alternateLinks: false,
  // Detection is off and the visitor's pick lives in our own cookie (LANG_COOKIE), so next-intl's
  // NEXT_LOCALE cookie did nothing but sit there without Secure or HttpOnly (QA L-05).
  localeCookie: false,
});

export function directionOf(locale: string): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}

/** Cookie holding the language the visitor chose (switcher or offer). */
export const LANG_COOKIE = "sw_lang";
/** Cookie remembering that the visitor answered the language offer. */
export const OFFER_COOKIE = "sw_lang_offer";
