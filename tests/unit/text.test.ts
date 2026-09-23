import { describe, expect, it } from "vitest";
import {
  instagramHandle,
  normalizeForSearch,
  normalizePhone,
  normalizeUrl,
  validateHandle,
  whatsappLink,
} from "@/lib/text";

describe("normalizeForSearch", () => {
  it("unifies Arabic letter variants and strips diacritics", () => {
    expect(normalizeForSearch("إدارةُ الحسابات")).toBe(normalizeForSearch("اداره الحسابات"));
    expect(normalizeForSearch("مُستشفى")).toBe("مستشفي");
  });
  it("lowercases Latin text and converts Arabic-Indic digits", () => {
    expect(normalizeForSearch("  Petra   GROWTH ٢٠٢٦ ")).toBe("petra growth 2026");
  });
});

describe("validateHandle", () => {
  it("accepts Instagram-style handles", () => {
    expect(validateHandle("nakhla.studio")).toBe("ok");
    expect(validateHandle("reel_house_jo")).toBe("ok");
  });
  it("rejects bad shapes and reserved words", () => {
    expect(validateHandle("ab")).toBe("invalid");
    expect(validateHandle(".dot")).toBe("invalid");
    expect(validateHandle("a..b")).toBe("invalid");
    expect(validateHandle("has space")).toBe("invalid");
    expect(validateHandle("admin")).toBe("reserved");
  });
});

describe("phones and links", () => {
  it("normalises Jordanian mobile numbers", () => {
    expect(normalizePhone("079 123 4567")).toBe("+962791234567");
    expect(normalizePhone("00962791234567")).toBe("+962791234567");
    expect(normalizePhone("٠٧٩١٢٣٤٥٦٧")).toBe("+962791234567");
  });
  it("builds wa.me links with a message", () => {
    expect(whatsappLink("0791234567", "مرحبا")).toBe(
      `https://wa.me/962791234567?text=${encodeURIComponent("مرحبا")}`,
    );
  });
  it("normalises websites and rejects other schemes", () => {
    expect(normalizeUrl("example.jo")).toBe("https://example.jo/");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("")).toBeNull();
  });
  it("extracts Instagram usernames", () => {
    expect(instagramHandle("https://www.instagram.com/Nakhla.Studio/")).toBe("nakhla.studio");
    expect(instagramHandle("@petra_growth")).toBe("petra_growth");
    expect(instagramHandle("not valid!")).toBeNull();
  });
});
