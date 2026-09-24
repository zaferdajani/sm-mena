import { describe, expect, it } from "vitest";
import { isCrawler } from "@/lib/crawler";
import { fitDescription, fitTitle, languageAlternates, pageMeta, postIndexable } from "@/lib/seo";
import { agencyLd } from "@/lib/structured-data";

describe("snippet fitting", () => {
  it("keeps short titles and trims long ones at a separator, never mid-word", () => {
    expect(fitTitle("شركات إعلانات تيك توك في عمّان")).toBe("شركات إعلانات تيك توك في عمّان");
    const long = "شركات إدارة حسابات السوشيال ميديا وصناعة المحتوى في الأردن: أعمال وأسعار";
    expect(fitTitle(long, 60)).toBe("شركات إدارة حسابات السوشيال ميديا وصناعة المحتوى في الأردن");
    expect(fitTitle(long, 40)).toMatch(/^شركات إدارة حسابات السوشيال ميديا.*…$/);
    expect(fitTitle(long, 40).length).toBeLessThanOrEqual(40);
    expect(fitTitle("Social media management agencies in Jordan: work and prices", 56)).toBe("Social media management agencies in Jordan");
  });

  it("fits descriptions to whole sentences, Arabic question marks included", () => {
    const text = `${"أ".repeat(90)}. ${"ب".repeat(50)}؟ ${"ج".repeat(80)}.`;
    const out = fitDescription(text);
    expect(out.length).toBeLessThanOrEqual(158);
    expect(out.endsWith("؟")).toBe(true);
    expect(fitDescription("short")).toBe("short");
  });
});

describe("page metadata", () => {
  it("declares its own canonical and hreflang pairs with x-default", () => {
    const meta = pageMeta({ locale: "en", path: "/join", title: "Join", description: "d" });
    expect(meta.alternates?.canonical).toBe("/en/join");
    expect(meta.alternates?.languages).toEqual({ ar: "/ar/join", en: "/en/join", "x-default": "/ar/join" });
    expect(languageAlternates("")).toEqual({ ar: "/ar", en: "/en", "x-default": "/ar" });
    expect(meta.robots).toBeUndefined();
    expect(JSON.stringify(meta.openGraph)).toContain("/og/sawwiq-en.jpg");
  });

  it("can keep a page or the whole site out of the index", () => {
    expect(pageMeta({ locale: "ar", path: "/a/x", noindex: true }).robots).toEqual({ index: false, follow: true });
    const env = process.env.SEO_INDEXABLE;
    process.env.SEO_INDEXABLE = "false";
    try {
      expect(pageMeta({ locale: "ar", path: "" }).robots).toEqual({ index: false, follow: true });
    } finally {
      process.env.SEO_INDEXABLE = env;
    }
  });

  it("indexes posts only with a real description", () => {
    expect(postIndexable("short")).toBe(false);
    expect(postIndexable("x".repeat(80))).toBe(true);
  });
});

describe("structured data", () => {
  const agency = { handle: "real.co", name: "Real Co", bio: null, city: "amman", services: ["seo"], isDemo: false, ratingSum: 9, ratingCount: 2, website: null, instagram: "real", googleMapsUrl: null };
  const opts = { locale: "en", cityName: "Amman", image: null, reviews: [{ reviewerName: "Sara", rating: 5, body: "Great", createdAt: new Date("2026-09-01") }], packages: [] };

  it("rates only from Sawwiq's own reviews, and never demo agencies", () => {
    expect(agencyLd(agency, opts).aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4.5, reviewCount: 2, bestRating: 5, worstRating: 1 });
    expect(agencyLd({ ...agency, isDemo: true }, opts).aggregateRating).toBeUndefined();
    expect(agencyLd({ ...agency, ratingCount: 0, ratingSum: 0 }, opts).aggregateRating).toBeUndefined();
  });
});

describe("crawler filter", () => {
  it("recognises search, AI and link-preview robots but not people", () => {
    for (const bot of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0)",
      "ClaudeBot/1.0",
      "facebookexternalhit/1.1",
      "WhatsApp/2.23.20.0",
      "curl/8.5.0",
      "",
      null,
    ])
      expect(isCrawler(bot)).toBe(true);
    for (const person of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/330.0.1 Mobile/15E148 Safari/604.1",
    ])
      expect(isCrawler(person)).toBe(false);
  });
});
