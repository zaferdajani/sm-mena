import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { allServices, isServiceKey, taxonomy } from "@/lib/taxonomy";

const json = JSON.parse(
  readFileSync(new URL("../../data/service-taxonomy.json", import.meta.url), "utf8"),
);

describe("taxonomy", () => {
  it("matches data/service-taxonomy.json exactly", () => {
    expect(taxonomy).toEqual(json);
  });

  it("has unique service keys", () => {
    const keys = allServices.map((service) => service.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("names every service in Arabic and English", () => {
    for (const service of allServices) {
      expect(service.name_ar.trim()).not.toBe("");
      expect(service.name_en.trim()).not.toBe("");
    }
  });

  it("recognises service keys", () => {
    expect(isServiceKey("ads_meta")).toBe(true);
    expect(isServiceKey("not_a_service")).toBe(false);
  });

  it("keeps the term SEO in English in every language", () => {
    const seo = allServices.find((s) => s.key === "seo")!;
    expect(seo.name_ar).toBe("SEO");
    expect(seo.name_en).toBe("SEO");
    for (const file of ["../../messages/ar.json", "../../data/hire-content.json"]) {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(text).not.toMatch(/السيو|تحسين محركات البحث/);
    }
  });
});
