import { describe, expect, it } from "vitest";
import { DEFAULT_TIERS, earnings, isActiveReferral, isReferralCode, missingForActive, normalizeCode } from "@/lib/referrals";

const provider = { isDemo: false, status: "active", bio: "Reels for cafés", services: ["reels"], postCount: 1, referralVoidReason: null };

describe("referral agents", () => {
  it("counts a referred provider only once its page is real", () => {
    expect(isActiveReferral(provider)).toBe(true);
    expect(missingForActive({ ...provider, bio: " ", services: [], postCount: 0 })).toEqual(["bio", "services", "post"]);
    expect(isActiveReferral({ ...provider, postCount: 0 })).toBe(false);
    expect(isActiveReferral({ ...provider, isDemo: true })).toBe(false);
    expect(isActiveReferral({ ...provider, status: "deactivated" })).toBe(false);
    expect(isActiveReferral({ ...provider, referralVoidReason: "duplicate" })).toBe(false);
  });

  it("pays the rate per active provider plus every tier reached", () => {
    expect(earnings(0, 5000)).toMatchObject({ total: 0, next: DEFAULT_TIERS[0], toNext: 10 });
    expect(earnings(9, 5000)).toMatchObject({ base: 45_000, bonuses: 0, toNext: 1 });
    expect(earnings(10, 5000)).toMatchObject({ base: 50_000, bonuses: 10_000, total: 60_000, toNext: 15 });
    expect(earnings(120, 5000).bonuses).toBe(10_000 + 30_000 + 75_000 + 200_000);
    expect(earnings(120, 5000).next).toBeNull();
  });

  it("accepts simple personal codes", () => {
    expect(normalizeCode(" @Ahmad-1 ")).toBe("ahmad-1");
    expect(isReferralCode("ahmad")).toBe(true);
    expect(isReferralCode("ab")).toBe(false);
    expect(isReferralCode("a b")).toBe(false);
  });
});
