import content from "@/data/hire-content.json";
import { serviceLabel } from "@/lib/labels";

/**
 * Written copy for each service's hire page (data/hire-content.json), in
 * Arabic and English, so every page says something of its own: what the
 * service includes, what moves the price, when it's the wrong choice, and two
 * questions specific to it. "search" is the phrase people actually type, used
 * in titles, headings and link text (docs/18-seo.md).
 */
export type HireContent = {
  search: string;
  intro: string;
  includes: string[];
  priceDrivers: string;
  notFor: string;
  faq: { q: string; a: string }[];
};

type Entry = { onSite: boolean; ar: HireContent; en: HireContent };
const data = content as Record<string, Entry | undefined>;

export function hireContent(service: string, locale: string): HireContent | null {
  const e = data[service];
  return e ? (locale === "ar" ? e.ar : e.en) : null;
}

/** Work that happens at the client's place (shoots, events): the city matters. */
export const isOnSite = (service: string) => Boolean(data[service]?.onSite);

/** The searched phrase for a service, or its catalogue name (lower case in English, for use mid-sentence). */
export const searchPhrase = (service: string, locale: string) => hireContent(service, locale)?.search ?? serviceLabel(service, locale);

/** Sentence case for where the phrase starts a line: titles, headings, link text. */
export const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase() + text.slice(1);

/** The searched phrase as link text. */
export const serviceLinkText = (service: string, locale: string) => capitalize(searchPhrase(service, locale));
