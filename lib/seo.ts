import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";

/**
 * Search metadata for every public page, from one place so canonical URLs,
 * language pairs (hreflang with x-default), share cards and index rules can't
 * drift apart (the OneClickConvert playbook, docs/18-seo.md).
 */

export const BRAND = { ar: "سوّق", en: "Sawwiq" } as const;
export const brandOf = (locale: string) => (locale === "ar" ? BRAND.ar : BRAND.en);
/** Open Graph locale by language and country: a Saudi page is ar_SA, not ar_JO (marketing/06 §7C). */
const OG_COUNTRY: Record<string, string> = { jo: "JO", sa: "SA", ae: "AE", kw: "KW", qa: "QA", bh: "BH", om: "OM", eg: "EG" };
const ogLocale = (locale: string, country = "jo") => `${locale === "ar" ? "ar" : "en"}_${OG_COUNTRY[country] ?? "JO"}`;

/** SEO_INDEXABLE=false keeps the whole site out of search engines (staging, before launch). */
export const siteIndexable = () => process.env.SEO_INDEXABLE !== "false";

/** A hire page for a service is indexed once this many real (non-demo) agencies offer it... */
export const INDEX_MIN_SERVICE = 1;
/** ...and a service-in-a-city page once this many do; below that it adds nothing to the Jordan-wide page. */
export const INDEX_MIN_CITY = 2;

/** A post page is worth a search result when the work comes with a real description. */
export const postIndexable = (caption: string) => caption.trim().length >= 80;

const TITLE_MAX = 65;
const DESCRIPTION_MAX = 158;

/**
 * Search results show about 60 characters of a title. Keeps the head of
 * "Head: detail · detail" titles whole instead of letting Google cut mid-word.
 * `room` is what's left after the " · brand" suffix the layout adds.
 */
export function fitTitle(title: string, room = TITLE_MAX): string {
  const t = title.replace(/\s+/g, " ").trim();
  if (t.length <= room) return t;
  for (const sep of [" · ", " | ", " – ", " — ", ": "]) {
    const parts = t.split(sep);
    let out = parts[0];
    for (const p of parts.slice(1)) {
      if ((out + sep + p).length > room) break;
      out += sep + p;
    }
    if (parts.length > 1 && out.length <= room && out.length >= 15) return out;
  }
  const cut = t.slice(0, room - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).trim()}…`;
}

/** Whole sentences that fit about 158 characters, else a whole-word cut with an ellipsis. */
export function fitDescription(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= DESCRIPTION_MAX) return t;
  const sentences = t.match(/[^.!?؟]+[.!?؟]+(\s|$)/g) ?? [];
  let out = "";
  for (const s of sentences) {
    if ((out + s).trim().length > DESCRIPTION_MAX) break;
    out += s;
  }
  if (out.trim().length >= 60) return out.trim();
  const cut = t.slice(0, DESCRIPTION_MAX - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).trim()}…`;
}

export const absoluteUrl = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

/** hreflang pairs for a path (without the locale), x-default = Arabic. */
export function languageAlternates(path: string) {
  return {
    ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
    "x-default": `/${routing.defaultLocale}${path}`,
  };
}

export const defaultOgImage = (locale: string) => ({
  url: `/og/sawwiq-${locale === "ar" ? "ar" : "en"}.jpg`,
  width: 1200,
  height: 630,
  alt: locale === "ar" ? "سوّق: شركات التسويق والسوشيال ميديا في الأردن" : "Sawwiq: social media and marketing agencies in Jordan",
});

type OgImage = { url: string; width?: number; height?: number; alt?: string };

export function pageMeta(o: {
  locale: string;
  /** Path without the locale prefix, e.g. "" for home or "/hire/seo". */
  path: string;
  title?: string;
  /** Use the title as is, without the " · brand" suffix (the home page). */
  absoluteTitle?: boolean;
  description?: string;
  images?: OgImage[];
  noindex?: boolean;
  type?: "website" | "profile" | "article";
  /** The page's country (lib/countries.ts codes); decides the Open Graph locale. Jordan when unknown. */
  country?: string;
}): Metadata {
  const brand = brandOf(o.locale);
  const title = o.title ? fitTitle(o.title, o.absoluteTitle ? TITLE_MAX : TITLE_MAX - brand.length - 3) : undefined;
  const description = o.description ? fitDescription(o.description) : undefined;
  const url = `/${o.locale}${o.path}`;
  const images = o.images?.length ? o.images : [defaultOgImage(o.locale)];
  return {
    ...(title ? { title: o.absoluteTitle ? { absolute: title } : title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: url, languages: languageAlternates(o.path) },
    openGraph: {
      type: o.type ?? "website",
      url,
      siteName: brand,
      locale: ogLocale(o.locale, o.country),
      alternateLocale: routing.locales.filter((l) => l !== o.locale).map((l) => ogLocale(l, o.country)),
      ...(title ? { title: o.absoluteTitle ? title : `${title} · ${brand}` } : {}),
      ...(description ? { description } : {}),
      images,
    },
    twitter: { card: "summary_large_image", ...(title ? { title } : {}), ...(description ? { description } : {}), images: images.map((i) => i.url) },
    ...(o.noindex || !siteIndexable() ? { robots: { index: false, follow: true } } : {}),
  };
}
