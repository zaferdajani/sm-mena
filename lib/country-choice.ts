import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_COUNTRY, isCountryCode, type CountryCode } from "@/lib/countries";

/** Cookie holding the visitor's country (picker, or detected from GPS / time zone). */
export const COUNTRY_COOKIE = "sw_country";

/** The visitor's chosen country, or null before they chose or were detected. */
export async function chosenCountry(): Promise<CountryCode | null> {
  const v = (await cookies()).get(COUNTRY_COOKIE)?.value;
  return isCountryCode(v) ? v : null;
}

/** The country listings are scoped to: the visitor's choice, else Jordan. */
export async function currentCountry(): Promise<CountryCode> {
  return (await chosenCountry()) ?? DEFAULT_COUNTRY;
}
