import { describe, expect, it } from "vitest";
import { landingCopy, siteCopy } from "@/components/landing/copy";
import { COUNTRY_CODES, countryFromHeader } from "@/lib/countries";

describe("country from the IP geolocation header", () => {
  it("accepts the countries Sawwiq serves, in any case", () => {
    expect(countryFromHeader("SA")).toBe("sa");
    expect(countryFromHeader("ae")).toBe("ae");
    expect(countryFromHeader(" EG ")).toBe("eg");
  });

  it("ignores other countries and a missing header", () => {
    expect(countryFromHeader("US")).toBeNull();
    expect(countryFromHeader("")).toBeNull();
    expect(countryFromHeader(null)).toBeNull();
    expect(countryFromHeader(undefined)).toBeNull();
  });
});

describe("landing copy per country", () => {
  it("keeps Jordan exactly as written", () => {
    expect(landingCopy("ar", "jo")).toBe(siteCopy.ar);
    expect(landingCopy("en", "jo")).toBe(siteCopy.en);
    expect(siteCopy.en.payments.ledger.money(350)).toBe("JOD 350");
    expect(siteCopy.ar.payments.ledger.money(350)).toBe("350 د.أ");
  });

  it("names the country, its cities and its currency", () => {
    const ar = landingCopy("ar", "sa");
    expect(ar.chapters[0].title).toBe("اعثر على وكالة التسويق المناسبة في السعودية");
    expect(ar.cities.title).toBe("في كل مدن السعودية");
    expect(ar.cities.list[0]).toEqual({ slug: "riyadh", name: "الرياض", alt: "RIYADH" });
    expect(ar.payments.ledger.project).toBe("حملة إطلاق مطعم، الرياض");
    expect(ar.payments.ledger.money(1750)).toBe("1,750 ر.س");
    expect(ar.footer.tagline).toBe("أول منصة عربية لوكالات التسويق · السعودية");

    const en = landingCopy("en", "ae");
    expect(en.chapters[0].title).toBe("Find the right marketing agency in the United Arab Emirates");
    expect(en.cities.title).toBe("Across the United Arab Emirates");
    expect(en.cities.list.map((c) => c.name)).toEqual(["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah"]);
    expect(en.cities.list[0].alt).toBe("دبي");
    expect(en.payments.ledger.money(1750)).toBe("AED 1,750");
    expect(en.trust.review.name).toBe("Dr. Lina, dental clinic in Sharjah");
    expect(en.agencies.body).toBe("For agencies and freelancers in Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah and Fujairah. Your Sawwiq page is free.");
    expect(en.footer.tagline).toBe("The first Arabic marketplace for marketing agencies · United Arab Emirates");
  });

  it("drops Jordan-only places everywhere else", () => {
    for (const code of COUNTRY_CODES.filter((c) => c !== "jo")) {
      for (const lang of ["ar", "en"] as const) {
        const text = JSON.stringify(landingCopy(lang, code));
        for (const word of ["Jordan", "Amman", "Aqaba", "Irbid", "Dead Sea", "الأردن", "عمّان", "العقبة", "إربد", "البحر الميت", "JOD", "د.أ"]) {
          expect(text, `${lang}/${code}`).not.toContain(word);
        }
        expect(landingCopy(lang, code).cities.list).toHaveLength(6);
        expect(landingCopy(lang, code).payments.ledger.milestones.every((m) => m.amount > 0)).toBe(true);
      }
    }
  });
});
