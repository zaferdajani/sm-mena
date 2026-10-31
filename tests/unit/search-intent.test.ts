import { describe, expect, it } from "vitest";
import { searchIntent } from "@/lib/search-intent";

describe("searchIntent", () => {
  it("reads the site's own colloquial service words", () => {
    expect(searchIntent("سوشال").services).toContain("smm_management");
    expect(searchIntent("سوشال ميديا").services.length).toBeGreaterThan(0);
  });

  it("reads business types in Arabic and English", () => {
    for (const q of ["مخبز", "حلويات", "bakery", "مخبز حلويات في عمان"]) expect(searchIntent(q).industries).toContain("restaurant_cafe");
    expect(searchIntent("عيادة اسنان").industries).toContain("clinic_health");
    expect(searchIntent("online store").industries).toContain("ecommerce");
  });

  it("adds nothing for unrelated or tiny text", () => {
    expect(searchIntent("x")).toEqual({ services: [], industries: [] });
    expect(searchIntent("nakhla").industries).toEqual([]);
  });
});
