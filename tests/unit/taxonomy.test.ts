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

  it("names SEO in Arabic with the acronym kept, so both readers find it", () => {
    // The owner asked for a plain Arabic name (31 Oct 2026); "(SEO)" stays in it because that is the word people
    // who know the service search for. Transliterations («سيو») stay out of names and copy; the matchmaker and
    // service search still understand them (lib/ai/extract.ts, data/service-catalog.json aliases).
    const seo = allServices.find((s) => s.key === "seo")!;
    expect(seo.name_ar).toBe("تحسين الظهور في محركات البحث (SEO)");
    expect(seo.name_en).toBe("SEO");
    for (const file of ["../../messages/ar.json", "../../data/hire-content.json"]) {
      const text = readFileSync(new URL(file, import.meta.url), "utf8");
      expect(text).not.toMatch(/السيو/);
    }
  });
});
