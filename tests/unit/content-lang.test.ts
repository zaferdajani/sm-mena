import { describe, expect, it } from "vitest";
import {
  agencyName,
  agencyTranslationSchema,
  compact,
  localized,
  localizedAgency,
  localizedPost,
  packageTranslationSchema,
  readTranslation,
  translationSearchText,
} from "@/lib/content-lang";

describe("agency content in two languages", () => {
  const main = { name: "استوديو نخلة", bio: "محتوى للمطاعم", about: "", strengths: ["تصوير"] };
  const translation = { name: "Nakhla Studio", bio: "Content for restaurants", strengths: [] as string[] };

  it("shows the translation to readers of the other language, field by field", () => {
    const en = localized(main, translation, "ar", "en");
    expect(en.name).toBe("Nakhla Studio");
    expect(en.bio).toBe("Content for restaurants");
    // Empty in the translation: falls back to the main text.
    expect(en.strengths).toEqual(["تصوير"]);
    expect(en.about).toBe("");
  });

  it("shows the main text to readers of the main language, and when there is no translation", () => {
    expect(localized(main, translation, "ar", "ar")).toEqual(main);
    expect(localized(main, null, "ar", "en")).toEqual(main);
    expect(localized(main, {}, "ar", "en")).toEqual(main);
  });

  it("works the other way for agencies that write in English first", () => {
    expect(localizedAgency({ ...main, name: "Blue Desk", contentLang: "en", translation: { name: "المكتب الأزرق" } }, "ar").name).toBe("المكتب الأزرق");
    expect(agencyName({ name: "Blue Desk", nameTranslation: "المكتب الأزرق", contentLang: "en" }, "en")).toBe("Blue Desk");
  });

  it("localizes a post and its agency name, and applying it twice changes nothing", () => {
    const post = {
      caption: "حملة رمضان",
      result: null,
      contentLang: "ar" as const,
      translation: { caption: "Ramadan campaign", result: "+40% bookings" },
      agency: { name: "استوديو نخلة", nameTranslation: "Nakhla Studio", contentLang: "ar" as const },
    };
    const once = localizedPost(post, "en");
    expect(once.caption).toBe("Ramadan campaign");
    expect(once.result).toBe("+40% bookings");
    expect(once.agency.name).toBe("Nakhla Studio");
    expect(localizedPost(once, "en")).toEqual(once);
    expect(localizedPost(post, "ar")).toEqual(post);
  });

  it("reads tr_* form fields, splits lists and drops empty values", () => {
    const form = new FormData();
    form.set("name", "ignored");
    form.set("tr_name", "  Nakhla Studio ");
    form.set("tr_bio", "");
    form.set("tr_strengths", "- Food photography\n\n• Reels\n");
    expect(readTranslation(form, agencyTranslationSchema)).toEqual({ name: "Nakhla Studio", strengths: ["Food photography", "Reels"] });
    const pkg = new FormData();
    pkg.set("tr_deliverables", "12 posts\n4 reels");
    expect(readTranslation(pkg, packageTranslationSchema)).toEqual({ deliverables: ["12 posts", "4 reels"] });
  });

  it("rejects text over the limits", () => {
    const form = new FormData();
    form.set("tr_name", "x".repeat(81));
    expect(readTranslation(form, agencyTranslationSchema)).toBeNull();
  });

  it("puts both languages in the search text", () => {
    expect(translationSearchText({ name: "Nakhla Studio", strengths: ["Reels"], bio: "" })).toBe("Nakhla Studio Reels");
    expect(compact({ a: "", b: [], c: "x" })).toEqual({ c: "x" });
  });
});
