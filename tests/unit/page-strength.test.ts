import { describe, expect, it } from "vitest";
import { pageStrength, type PageFacts } from "@/lib/core/rules/page-strength";

const base: PageFacts = { visibility: "private", services: [], city: null, whatsapp: null, postCount: 0, bio: "", avatarKey: null, platforms: [], startingPriceJod: null, packageCount: 0 };

describe("pageStrength", () => {
  it("a fresh private page needs work first, then services, contact, city and publishing", () => {
    const s = pageStrength(base);
    expect(s.matchReady).toBe(false);
    expect(s.next).toBe("work");
    expect(s.missing.slice(0, 5)).toEqual(["work", "services", "whatsapp", "city", "publish"]);
    expect(s.percent).toBe(0);
  });

  it("match-ready means public, one service, city, WhatsApp and one project; a private page never is", () => {
    const ready = { ...base, visibility: "public" as const, services: ["smm_management"], city: "amman", whatsapp: "+962790000000", postCount: 1 };
    expect(pageStrength(ready).matchReady).toBe(true);
    expect(pageStrength(ready).next).toBe("intro");
    expect(pageStrength({ ...ready, visibility: "unlisted" }).matchReady).toBe(false);
    expect(pageStrength({ ...ready, visibility: "unlisted" }).next).toBe("publish");
  });

  it("strong adds an intro, a picture, platforms, a price or package and three projects", () => {
    const strong = { ...base, visibility: "public" as const, services: ["seo"], city: "amman", whatsapp: "0790000000", postCount: 3, bio: "We do SEO", avatarKey: "a.webp", platforms: ["instagram"], packageCount: 1 };
    const s = pageStrength(strong);
    expect(s.strong).toBe(true);
    expect(s.next).toBeNull();
    expect(s.percent).toBe(100);
    expect(pageStrength({ ...strong, packageCount: 0 }).missing).toEqual(["price"]);
    expect(pageStrength({ ...strong, packageCount: 0, startingPriceJod: 150 }).strong).toBe(true);
  });
});
