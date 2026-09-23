import { describe, expect, it } from "vitest";
import { extractNeed } from "@/lib/ai/fallback";

describe("extractNeed (rule-based matchmaker)", () => {
  it("understands Arabic briefs with city, budget and industry", () => {
    const need = extractNeed("أحتاج إدارة حساب إنستغرام لمطعم في عمّان بميزانية ٣٠٠ دينار");
    expect(need.services).toContain("smm_management");
    expect(need.platforms).toContain("instagram");
    expect(need.city).toBe("amman");
    expect(need.industry).toBe("restaurant_cafe");
    expect(need.budget).toBe(300);
  });

  it("maps ads plus a platform to that platform's ads service", () => {
    expect(extractNeed("TikTok ads for my online store, budget 1.5k JOD").services).toContain("ads_tiktok");
    expect(extractNeed("TikTok ads for my online store, budget 1.5k JOD").budget).toBe(1500);
    const store = extractNeed("اعلانات فيسبوك لمتجر الكتروني");
    expect(store.services).toEqual(["ads_meta"]); // "online store" is the industry, not a website request
    expect(store.industry).toBe("ecommerce");
  });

  it("defaults to account management when only a platform is named", () => {
    expect(extractNeed("something for my instagram").services).toEqual(["smm_management"]);
  });

  it("returns nothing actionable for small talk", () => {
    const need = extractNeed("hello there");
    expect(need.services).toEqual([]);
    expect(need.budget).toBeNull();
  });
});
