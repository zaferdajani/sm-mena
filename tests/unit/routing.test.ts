import { describe, expect, it } from "vitest";
import { directionOf, routing } from "@/i18n/routing";

describe("routing", () => {
  it("defaults to Arabic", () => {
    expect(routing.defaultLocale).toBe("ar");
  });

  it("uses right-to-left only for Arabic", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
});
