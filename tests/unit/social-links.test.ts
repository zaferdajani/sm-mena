import { describe, expect, it } from "vitest";
import { cleanLinks, cleanLinkValue, linkHref, linkLabel } from "@/lib/social-links";

describe("social links", () => {
  it("keeps handles without @ and builds the profile address", () => {
    expect(cleanLinkValue("instagram", " @nakhla.cafe ")).toBe("nakhla.cafe");
    expect(linkHref("instagram", "nakhla.cafe")).toBe("https://www.instagram.com/nakhla.cafe");
    expect(linkHref("tiktok", "nakhla")).toBe("https://www.tiktok.com/@nakhla");
    expect(linkHref("youtube", "nakhla")).toBe("https://www.youtube.com/@nakhla");
    expect(linkLabel("instagram", "nakhla.cafe")).toBe("@nakhla.cafe");
  });

  it("accepts pasted links only on the matching network", () => {
    expect(cleanLinkValue("instagram", "instagram.com/nakhla.cafe")).toBe("https://instagram.com/nakhla.cafe");
    expect(cleanLinkValue("instagram", "https://evil.example/nakhla")).toBeNull();
    expect(cleanLinkValue("x", "https://twitter.com/nakhla")).toBe("https://twitter.com/nakhla");
    expect(linkLabel("tiktok", "https://www.tiktok.com/@nakhla")).toBe("@nakhla");
  });

  it("treats websites as links", () => {
    expect(cleanLinkValue("website", "nakhla.jo")).toBe("https://nakhla.jo/");
    expect(cleanLinkValue("website", "javascript:alert(1)")).toBeNull();
    expect(cleanLinkValue("website", "nakhla")).toBeNull();
    expect(linkLabel("website", "https://www.nakhla.jo/menu/")).toBe("nakhla.jo/menu");
  });

  it("cleans form rows: skips empty rows, reports the first bad one, removes duplicates", () => {
    expect(cleanLinks([{ kind: "instagram", value: "a" }, { kind: "tiktok", value: "" }, { kind: "instagram", value: "@a" }])).toEqual({ links: [{ kind: "instagram", value: "a" }] });
    expect(cleanLinks([{ kind: "instagram", value: "a" }, { kind: "facebook", value: "https://x.com/a" }])).toEqual({ error: 1 });
    expect(cleanLinks([{ kind: "myspace", value: "a" }])).toEqual({ error: 0 });
  });
});
