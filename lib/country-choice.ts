import "server-only";
import { cookies, headers } from "next/headers";
import { countryFromHeader, DEFAULT_COUNTRY, isCountryCode, type CountryCode } from "@/lib/countries";

/** Cookie holding the visitor's country (picker, or detected from GPS / time zone). */
export const COUNTRY_COOKIE = "sw_country";

/** Request header with the visitor's country from their IP address (set by Vercel). */
export const IP_COUNTRY_HEADER = "x-vercel-ip-country";

/** The visitor's chosen country, or null before they chose or were detected. */
export async function chosenCountry(): Promise<CountryCode | null> {
  const v = (await cookies()).get(COUNTRY_COOKIE)?.value;
  return isCountryCode(v) ? v : null;
}

/** The country the visitor's IP address is in (Vercel's geolocation header), if Sawwiq serves it. */
export async function detectedCountry(): Promise<CountryCode | null> {
  return countryFromHeader((await headers()).get(IP_COUNTRY_HEADER));
}

/**
 * The country listings are scoped to: the visitor's saved choice, else the
 * country of their IP address, else Jordan.
 */
export async function currentCountry(): Promise<CountryCode> {
  return (await chosenCountry()) ?? (await detectedCountry()) ?? DEFAULT_COUNTRY;
}

/**
 * The country a phone field starts with: the visitor's country from the IP
 * address (any country in the world, not only the ones Sawwiq serves), else
 * their chosen or detected Sawwiq country.
 */
export async function phoneCountry(): Promise<string> {
  const { isDialCountry } = await import("@/lib/dial-codes");
  const ip = (await headers()).get(IP_COUNTRY_HEADER)?.toUpperCase();
  if (isDialCountry(ip)) return ip;
  return (await currentCountry()).toUpperCase();
}
