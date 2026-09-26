import { COUNTRIES } from "@/lib/countries";
import { serviceLabel } from "@/lib/labels";
import { BRAND } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

/**
 * schema.org builders (JSON-LD). Rules, as on OneClickConvert: one entity per
 * page, everything derived from what the page shows, and ratings only from
 * Sawwiq's own verified client reviews — never Google's, never demo agencies.
 */

const ORG_ID = `${SITE_URL}/#organization`;

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: BRAND.ar,
    alternateName: BRAND.en,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/mark-512.png`,
    description: "الشبكة العربية للعثور على وكالات التسويق والسوشيال ميديا ومقارنتها وتوظيفها. The Arabic network for marketing and social media agencies.",
    slogan: "فريقك التسويقي يبدأ من هنا",
    foundingDate: "2026",
    knowsLanguage: ["ar", "en"],
    areaServed: COUNTRIES.map((c) => ({ "@type": "Country", name: c.en })),
  };
}

export function websiteLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: locale === "ar" ? BRAND.ar : BRAND.en,
    alternateName: locale === "ar" ? BRAND.en : BRAND.ar,
    url: `${SITE_URL}/${locale}`,
    inLanguage: ["ar", "en"],
    description:
      locale === "ar"
        ? "الشبكة العربية لمقارنة وكالات التسويق والسوشيال ميديا وتوظيفها في الأردن والخليج ومصر."
        : "The Arabic network to find, compare and hire marketing and social media agencies in Jordan, the Gulf and Egypt.",
    publisher: { "@id": ORG_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/${locale}/explore?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
}

type AgencyForLd = {
  handle: string;
  name: string;
  bio: string | null;
  city: string;
  services: string[];
  isDemo: boolean;
  ratingSum: number;
  ratingCount: number;
  website: string | null;
  instagram: string | null;
  googleMapsUrl: string | null;
};

export function agencyLd(
  a: AgencyForLd,
  o: {
    locale: string;
    cityName: string;
    image: string | null;
    reviews: { reviewerName: string; rating: number; body: string; createdAt: Date }[];
    packages: { title: string; service: string; priceJod: number; billing: string }[];
  },
) {
  const url = `${SITE_URL}/${o.locale}/a/${a.handle}`;
  const rated = !a.isDemo && a.ratingCount > 0;
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}/a/${a.handle}#agency`,
    name: a.name,
    url,
    ...(a.bio ? { description: a.bio } : {}),
    ...(o.image ? { image: o.image, logo: o.image } : {}),
    address: { "@type": "PostalAddress", addressLocality: o.cityName, addressCountry: "JO" },
    areaServed: { "@type": "Country", name: "Jordan" },
    knowsAbout: a.services.map((s) => serviceLabel(s, o.locale)),
    sameAs: [a.instagram ? `https://instagram.com/${a.instagram}` : null, a.website, a.googleMapsUrl].filter(Boolean),
    ...(rated
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.round((a.ratingSum / a.ratingCount) * 10) / 10,
            reviewCount: a.ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
          review: o.reviews.slice(0, 3).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.reviewerName },
            datePublished: r.createdAt.toISOString().slice(0, 10),
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5, worstRating: 1 },
            reviewBody: r.body,
          })),
        }
      : {}),
    ...(o.packages.length
      ? {
          makesOffer: o.packages.map((p) => ({
            "@type": "Offer",
            name: p.title,
            price: p.priceJod,
            priceCurrency: "JOD",
            ...(p.billing === "monthly"
              ? { priceSpecification: { "@type": "UnitPriceSpecification", price: p.priceJod, priceCurrency: "JOD", unitCode: "MON" } }
              : {}),
            itemOffered: { "@type": "Service", name: serviceLabel(p.service, o.locale) },
          })),
        }
      : {}),
  };
}

export function hireServiceLd(o: {
  locale: string;
  url: string;
  name: string;
  serviceName: string;
  place: string;
  city: boolean;
  /** English country name when the page is about one country (or a city in it). */
  country?: string | null;
  offers: { min: number; max: number; count: number; currency: string } | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: o.name,
    serviceType: o.serviceName,
    url: o.url,
    areaServed: o.city
      ? { "@type": "City", name: o.place, ...(o.country ? { containedInPlace: { "@type": "Country", name: o.country } } : {}) }
      : o.country
        ? { "@type": "Country", name: o.country }
        : ["Jordan", "Saudi Arabia", "United Arab Emirates", "Kuwait", "Qatar", "Bahrain", "Oman", "Egypt"].map((name) => ({ "@type": "Country", name })),
    provider: { "@id": ORG_ID },
    ...(o.offers
      ? { offers: { "@type": "AggregateOffer", priceCurrency: o.offers.currency, lowPrice: o.offers.min, highPrice: o.offers.max, offerCount: o.offers.count } }
      : {}),
  };
}

export function faqLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
