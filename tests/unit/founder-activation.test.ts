import { afterEach, describe, expect, it } from "vitest";
import { FOUNDING, founderEligibility, founderMarketplaceFee, opportunityVisibleAt } from "@/lib/founding";

const base = {
  foundingSeat: 4,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  isDemo: false,
  status: "active" as const,
  bio: "We make campaigns that sell.",
  services: ["social-media-management"],
  postCount: 1,
  packageCount: 0,
};

describe("Founder commercial activation", () => {
  afterEach(() => {
    delete process.env.FOUNDING_CLOSES_AT;
    delete process.env.FOUNDING_ACTIVATED_AT;
  });

  it("requires useful supply, not registration alone", () => {
    expect(founderEligibility(base).eligible).toBe(true);
    expect(founderEligibility({ ...base, bio: "" }).eligible).toBe(false);
    expect(founderEligibility({ ...base, services: [] }).eligible).toBe(false);
    expect(founderEligibility({ ...base, postCount: 0, packageCount: 0 }).eligible).toBe(false);
    expect(founderEligibility({ ...base, postCount: 0, packageCount: 1 }).eligible).toBe(true);
    expect(founderEligibility({ ...base, status: "suspended" }).eligible).toBe(false);
    expect(founderEligibility({ ...base, isDemo: true }).eligible).toBe(false);
  });

  it("gives eligible founders a 24-hour opportunity head start without scoring changes", () => {
    const created = new Date("2026-09-27T08:00:00Z");
    expect(opportunityVisibleAt(created, true)).toEqual(created);
    expect(opportunityVisibleAt(created, false).getTime() - created.getTime()).toBe(FOUNDING.opportunityHeadStartHours * 3_600_000);
  });

  it("waives the first Sawwiq-acquired project then uses 7% during the founder year", () => {
    process.env.FOUNDING_ACTIVATED_AT = "2026-10-01T00:00:00Z";
    const common = { eligible: true, protectedPaymentsLive: true, acquiredBySawwiq: true, activatedAt: new Date("2026-10-01T00:00:00Z"), now: new Date("2026-11-01T00:00:00Z"), standardFeePercent: 10 };
    expect(founderMarketplaceFee({ ...common, priorFeeWaiverReservations: 0 })).toBe(0);
    expect(founderMarketplaceFee({ ...common, priorFeeWaiverReservations: 1 })).toBe(7);
  });

  it("never discounts direct/existing-client or pre-live money flows", () => {
    const common = { eligible: true, activatedAt: new Date("2026-10-01T00:00:00Z"), now: new Date("2026-11-01T00:00:00Z"), standardFeePercent: 10, priorFeeWaiverReservations: 0 };
    expect(founderMarketplaceFee({ ...common, protectedPaymentsLive: false, acquiredBySawwiq: true })).toBe(10);
    expect(founderMarketplaceFee({ ...common, protectedPaymentsLive: true, acquiredBySawwiq: false })).toBe(10);
  });

  it("expires the founder rate after 365 days", () => {
    expect(founderMarketplaceFee({ eligible: true, protectedPaymentsLive: true, acquiredBySawwiq: true, priorFeeWaiverReservations: 1, activatedAt: new Date("2026-10-01T00:00:00Z"), now: new Date("2027-10-02T00:00:00Z"), standardFeePercent: 10 })).toBe(10);
  });
});
