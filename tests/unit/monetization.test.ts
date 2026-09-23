import { afterEach, describe, expect, it } from "vitest";
import { canCreatePost, entitlementsFor } from "@/lib/monetization/entitlements";
import { PLANS } from "@/lib/monetization/plans";

afterEach(() => {
  delete process.env.MONETIZATION_ENABLED;
});

describe("entitlements", () => {
  it("gives everyone unlimited posts while monetization is off", () => {
    const ent = entitlementsFor({ plan: "free", planExpiresAt: null });
    expect(ent.enforced).toBe(false);
    expect(ent.maxPosts).toBeNull();
    expect(ent.badge).toBe(false);
    expect(canCreatePost(ent, 500)).toBe(true);
  });

  it("enforces the free limit once monetization is on", () => {
    process.env.MONETIZATION_ENABLED = "true";
    const ent = entitlementsFor({ plan: "free", planExpiresAt: null });
    expect(ent.enforced).toBe(true);
    expect(canCreatePost(ent, PLANS.free.maxPosts! - 1)).toBe(true);
    expect(canCreatePost(ent, PLANS.free.maxPosts!)).toBe(false);
  });

  it("falls back to free when a paid plan has expired", () => {
    process.env.MONETIZATION_ENABLED = "true";
    const now = new Date("2026-10-01");
    expect(entitlementsFor({ plan: "pro", planExpiresAt: new Date("2026-09-01") }, now).id).toBe("free");
    expect(entitlementsFor({ plan: "pro", planExpiresAt: new Date("2026-11-01") }, now).id).toBe("pro");
    expect(entitlementsFor({ plan: "business", planExpiresAt: null }, now).teamSeats).toBe(3);
  });
});
