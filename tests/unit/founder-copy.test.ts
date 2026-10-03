import { describe, expect, it } from "vitest";
import { founderCopy } from "@/components/teaser/market-copy";
import { COUNTRY_CODES } from "@/lib/countries";

describe("pre-launch founder copy", () => {
  it("speaks one Modern Standard Arabic voice in every market (no dialect by country)", () => {
    const colloquial = /(^|[^\u0600-\u06FF])(بدنا|نبي|عايزين|هسا|شو|بدك|اللي|خلّي|خلي|مين|هيك|بس|شي|عشان|ليش)(?![\u0600-\u06FF])/;
    const banned = /أهل التسويق|سوشيال ميديا|فريلانسر|بورتفوليو/;
    for (const code of COUNTRY_CODES) {
      const copy = JSON.stringify(founderCopy("ar", code));
      expect(copy).not.toMatch(colloquial);
      expect(copy).not.toMatch(banned);
    }
    // the same voice everywhere: the title does not change register between markets
    expect(founderCopy("ar", "sa").title).toBe(founderCopy("ar", "jo").title);
    expect(founderCopy("ar", "eg").title).toBe(founderCopy("ar", "jo").title);
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
