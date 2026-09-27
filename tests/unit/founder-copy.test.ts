import { describe, expect, it } from "vitest";
import { founderCopy } from "@/components/teaser/market-copy";
import { COUNTRY_CODES } from "@/lib/countries";

describe("pre-launch founder copy", () => {
  it("uses genuinely different Arabic voices for Jordan, Saudi Arabia and Egypt", () => {
    expect(founderCopy("ar", "jo").title).toContain("بدنا");
    expect(founderCopy("ar", "sa").title).toContain("نبي");
    expect(founderCopy("ar", "eg").title).toContain("عايزين");
  });

  it("never sells the registration number as the benefit", () => {
    for (const code of COUNTRY_CODES) {
      const copy = JSON.stringify(founderCopy("ar", code));
      expect(copy).not.toContain("مقعد");
      expect(copy).not.toContain("#00");
      expect(copy).not.toContain("180");
      expect(copy).not.toContain("القمة");
    }
  });

  it("keeps the value proposition concrete in every market", () => {
    for (const code of COUNTRY_CODES) {
      const copy = founderCopy("ar", code);
      expect(copy.value.clientsBody.length).toBeGreaterThan(35);
      expect(copy.value.partnersBody.length).toBeGreaterThan(35);
      expect(copy.founderLocked).toHaveLength(3);
      expect(copy.founderKnownBody).toContain("0%");
      expect(copy.founderKnownBody).toContain("7%");
    }
  });
});
