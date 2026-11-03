import { describe, expect, it } from "vitest";
import { gaMeasurementId, mayLoadAnalytics, parseChoice } from "@/lib/analytics-consent";

describe("analytics consent", () => {
  it("never loads analytics before an explicit Accept", () => {
    const id = gaMeasurementId("G-ABCD1234");
    expect(mayLoadAnalytics(id, null)).toBe(false);
    expect(mayLoadAnalytics(id, "rejected")).toBe(false);
    expect(mayLoadAnalytics(id, "accepted")).toBe(true);
  });
  it("loads nothing without a valid measurement id, even after Accept", () => {
    expect(mayLoadAnalytics(gaMeasurementId(undefined), "accepted")).toBe(false);
    expect(mayLoadAnalytics(gaMeasurementId("not an id"), "accepted")).toBe(false);
    expect(mayLoadAnalytics(gaMeasurementId("UA-1"), "accepted")).toBe(false);
  });
  it("ignores junk in storage", () => {
    expect(parseChoice("yes")).toBeNull();
    expect(parseChoice(null)).toBeNull();
    expect(parseChoice("rejected")).toBe("rejected");
  });
});
