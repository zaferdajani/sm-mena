import { describe, expect, it } from "vitest";
import { availabilityStale, pageStrength, type PageFacts } from "@/lib/core/rules/page-strength";

const base: PageFacts = { visibility: "private", services: [], city: null, whatsapp: null, postCount: 0, bio: "", avatarKey: null, platforms: [], startingPriceJod: null, packageCount: 0, acceptingProjects: true, acceptingUpdatedAt: null, createdAt: new Date("2026-10-01") };

describe("pageStrength", () => {
  it("a fresh private page needs work first, then services, contact, city and publishing", () => {
    const s = pageStrength(base);
    expect(s.matchReady).toBe(false);
    expect(s.next).toBe("work");
    expect(s.missing.slice(0, 5)).toEqual(["work", "services", "whatsapp", "city", "publish"]);
    expect(s.percent).toBe(9); // only "open to new projects" is on from the start
  });

  it("match-ready means public, one service, city, WhatsApp and one project; a private page never is", () => {
    const ready = { ...base, visibility: "public" as const, services: ["smm_management"], city: "amman", whatsapp: "+962790000000", postCount: 1 };
    expect(pageStrength(ready).matchReady).toBe(true);
    expect(pageStrength(ready).next).toBe("intro");
    expect(pageStrength({ ...ready, visibility: "unlisted" }).matchReady).toBe(false);
    expect(pageStrength({ ...ready, visibility: "unlisted" }).next).toBe("publish");
    // Not taking new projects: listed, but not match-ready.
    expect(pageStrength({ ...ready, acceptingProjects: false }).matchReady).toBe(false);
    expect(pageStrength({ ...ready, acceptingProjects: false }).next).toBe("available");
  });

  it("asks again after 60 days without a confirmation, never when the page is closed to projects", () => {
    const now = new Date("2026-12-15");
    expect(availabilityStale({ acceptingProjects: true, acceptingUpdatedAt: null, createdAt: new Date("2026-10-01") }, now)).toBe(true);
    expect(availabilityStale({ acceptingProjects: true, acceptingUpdatedAt: new Date("2026-12-01"), createdAt: new Date("2026-10-01") }, now)).toBe(false);
    expect(availabilityStale({ acceptingProjects: false, acceptingUpdatedAt: null, createdAt: new Date("2026-01-01") }, now)).toBe(false);
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
