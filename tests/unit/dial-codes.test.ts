import { describe, expect, it } from "vitest";
import { DIAL_CODES, flagOf, internationalPhone, splitPhone } from "@/lib/dial-codes";

describe("phone numbers with a country picker", () => {
  it("adds the chosen country's code and drops the trunk zero", () => {
    expect(internationalPhone("JO", "079 111 2233")).toBe("+962791112233");
    expect(internationalPhone("SA", "0501234567")).toBe("+966501234567");
    expect(internationalPhone("EG", "01012345678")).toBe("+201012345678");
    expect(internationalPhone("AE", "٠٥٠١٢٣٤٥٦٧")).toBe("+971501234567");
  });

  it("keeps numbers already typed in international form", () => {
    expect(internationalPhone("JO", "+966 50 123 4567")).toBe("+966501234567");
    expect(internationalPhone("JO", "00971501234567")).toBe("+971501234567");
    expect(internationalPhone("KW", "96550012345")).toBe("+96550012345");
  });

  it("splits a stored number back into country and local part", () => {
    expect(splitPhone("+962791112233", "SA")).toEqual({ country: "JO", local: "791112233" });
    expect(splitPhone("+14155550100", "CA")).toEqual({ country: "CA", local: "4155550100" });
    expect(splitPhone("", "EG")).toEqual({ country: "EG", local: "" });
  });

  it("has a flag and a code for every country", () => {
    expect(Object.keys(DIAL_CODES).length).toBeGreaterThan(200);
    expect(flagOf("jo")).toBe("🇯🇴");
  });
});
