import { describe, expect, it } from "vitest";
import { extractNeed } from "@/lib/ai/extract";
import {
  answer,
  budgetRanges,
  emptyNeed,
  formatAmount,
  forNewCountry,
  mergeText,
  nextStep,
  niceRound,
  reopen,
  resolveServices,
  skipRest,
  speechLang,
} from "@/lib/match-wizard";
import { wizardNeedSchema } from "@/lib/match-wizard-schema";

describe("country-aware parsing", () => {
  it("reads a Saudi brief: Riyadh and a budget in riyals", () => {
    const need = extractNeed("أحتاج إدارة حساب إنستغرام لمطعم بالرياض بميزانية ٥ آلاف ريال", "sa");
    expect(need.services).toContain("smm_management");
    expect(need.industry).toBe("restaurant_cafe");
    expect(need.city).toBe("riyadh");
    expect(need.budget).toBe(5000);
    expect(need.elsewhere).toBeNull();
    const en = extractNeed("TikTok ads for my shop in Jeddah, SAR 3,500 a month", "sa");
    expect(en.city).toBe("jeddah");
    expect(en.budget).toBe(3500);
    expect(en.services).toContain("ads_tiktok");
  });

  it("reads amounts only in the visitor's currency", () => {
    expect(extractNeed("500 دينار", "jo").budget).toBe(500);
    expect(extractNeed("500 ريال", "jo").budget).toBeNull();
    expect(extractNeed("2k AED", "ae").budget).toBe(2000);
    expect(extractNeed("ميزانيتي 15000 جنيه", "eg").budget).toBe(15000);
    expect(extractNeed("a sale of 500", "eg").budget).toBeNull(); // "le" inside "sale" is not a currency
  });

  it("keeps the old Jordanian brief working", () => {
    const need = extractNeed("أحتاج إدارة حساب إنستغرام لمطعم في عمّان بميزانية ٣٠٠ دينار");
    expect(need).toMatchObject({ city: "amman", budget: 300, industry: "restaurant_cafe" });
  });

  it("reports a city or country outside the visitor's country instead of switching", () => {
    expect(extractNeed("Instagram for my restaurant in Amman", "sa")).toMatchObject({ city: null, elsewhere: { country: "jo", city: "amman" } });
    expect(extractNeed("agencies in Dubai please", "sa").elsewhere).toEqual({ country: "ae", city: "dubai" });
    expect(extractNeed("I want agencies in the UAE", "sa").elsewhere).toEqual({ country: "ae", city: null });
    // A city at home wins over one abroad.
    expect(extractNeed("from Amman but the shop is in Riyadh", "sa")).toMatchObject({ city: "riyadh", elsewhere: null });
    // In Oman, "عمان" is the country, not Amman.
    expect(extractNeed("شركة في عمان", "om")).toMatchObject({ city: null, elsewhere: null });
    // Glued prefix and an Arabic question mark.
    expect(extractNeed("شو أحسن شركة إعلانات جوجل بالزرقاء؟", "jo").city).toBe("zarqa");
    // Longest name wins: New Cairo, not Cairo.
    expect(extractNeed("مكتب في القاهرة الجديدة", "eg").city).toBe("new_cairo");
    // "October" alone is a month, not 6th of October city.
    expect(extractNeed("we launch in October", "eg").city).toBeNull();
  });
});

describe("wizard steps", () => {
  it("asks each question once, in order, and skips answered ones", () => {
    let need = emptyNeed();
    expect(nextStep(need)).toBe("groups");
    need = answer(need, { step: "groups", groups: ["social_media", "paid_media"] });
    expect(nextStep(need)).toBe("services");
    need = answer(need, { step: "services", services: [] }); // "Any of these"
    expect(nextStep(need)).toBe("industry");
    need = answer(need, { step: "industry", industry: "restaurant_cafe" });
    expect(nextStep(need)).toBe("platforms");
    need = answer(need, { step: "platforms", platforms: ["tiktok", "instagram"] });
    expect(nextStep(need)).toBe("budget");
    need = answer(need, { step: "budget", min: 2000, max: 5000 });
    expect(nextStep(need)).toBe("city");
    need = answer(need, { step: "city", city: null }); // all of the country
    expect(nextStep(need)).toBe("results");
    expect(resolveServices(need)).toEqual(["smm_management", "smm_content", "ads_tiktok", "ads_meta"]);
    expect(nextStep(reopen(need, "budget"))).toBe("budget");
    expect(reopen(need, "city").city).toBeNull();
  });

  it("skips platforms for branding-only projects and fills answers from text", () => {
    const branding = answer(answer(emptyNeed(), { step: "groups", groups: ["branding"] }), { step: "services", services: ["brand_identity"] });
    expect(nextStep(answer(branding, { step: "industry", industry: "other" }))).toBe("budget");
    const typed = mergeText(emptyNeed(), { services: ["photography"], platforms: [], industry: "retail_shop", city: "jeddah", budget: 3000 });
    expect(typed).toMatchObject({ groups: ["creative"], city: "jeddah", budgetMax: 3000 });
    expect(nextStep(typed)).toBe("platforms");
    expect(nextStep(skipRest(typed))).toBe("results");
  });

  it("drops a budget and city from another country after a switch", () => {
    const need = answer(answer(emptyNeed(), { step: "budget", min: 300, max: 600 }), { step: "city", city: "amman" });
    const moved = forNewCountry(need, "riyadh");
    expect(moved).toMatchObject({ budgetMin: null, budgetMax: null, city: "riyadh" });
    expect(moved.answered).not.toContain("budget");
  });

  it("validates what the page sends", () => {
    const need = answer(emptyNeed(), { step: "city", city: "riyadh" });
    expect(wizardNeedSchema.safeParse(need).success).toBe(true);
    expect(wizardNeedSchema.safeParse({ ...need, city: "atlantis" }).success).toBe(false);
    expect(wizardNeedSchema.safeParse({ ...need, answered: ["hack"] }).success).toBe(false);
  });
});

describe("budget choices", () => {
  it("sizes default ranges per currency", () => {
    const sar = budgetRanges("SAR");
    expect(sar).toHaveLength(5);
    expect(sar[0]).toEqual({ min: null, max: 2000 });
    expect(sar.at(-1)).toEqual({ min: 20000, max: null });
    expect(budgetRanges("JOD")[1]).toEqual({ min: 300, max: 600 });
    expect(budgetRanges("KWD")[0].max).toBeLessThan(budgetRanges("JOD")[0].max!);
    expect(budgetRanges("EGP")[0].max).toBeGreaterThan(budgetRanges("SAR")[0].max!);
  });

  it("uses real price quartiles when there are some", () => {
    expect(budgetRanges("SAR", { min: 2400, median: 3900, max: 6100 })).toEqual([
      { min: null, max: 2500 },
      { min: 2500, max: 4000 },
      { min: 4000, max: 6000 },
      { min: 6000, max: 10000 },
      { min: 10000, max: null },
    ]);
    // No sliver of a range (4,500 – 5,000): too-close splits are dropped.
    expect(budgetRanges("SAR", { min: 3400, median: 4600, max: 5000 }).map((r) => r.max)).toEqual([3500, 4500, 10000, null]);
    // Too few distinct prices: defaults.
    expect(budgetRanges("SAR", { min: 3000, median: 3000, max: 3000 })).toEqual(budgetRanges("SAR"));
    expect(niceRound(180)).toBe(200);
    expect(niceRound(12700)).toBe(15000);
  });

  it("writes money in the visitor's currency", () => {
    expect(formatAmount(5000, "ar", "SAR")).toBe("5,000 ر.س");
    expect(formatAmount(5000, "en", "SAR")).toBe("5,000 SAR");
    expect(speechLang("ar", "sa")).toBe("ar-SA");
    expect(speechLang("en", "sa")).toBe("en-US");
  });
});
