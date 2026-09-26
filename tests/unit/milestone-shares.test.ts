import { describe, expect, it } from "vitest";
import { shareFils, shareInputSchema, shareTermsHash, splitRelease } from "@/lib/contracts/shares";

describe("partner shares", () => {
  it("works out a share as a percentage or a fixed amount, never above the milestone", () => {
    expect(shareFils({ kind: "percent", percent: 30 }, 500_000)).toBe(150_000);
    expect(shareFils({ kind: "fixed", amountFils: 200_000 }, 500_000)).toBe(200_000);
    expect(shareFils({ kind: "fixed", amountFils: 900_000 }, 500_000)).toBe(500_000);
  });

  it("splits a full release: the partner gets its share, the agency the rest, each less the fee", () => {
    const s = splitRelease(500_000, 500_000, 150_000, 10);
    expect(s.partner).toEqual({ gross: 150_000, fee: 15_000, net: 135_000 });
    expect(s.agency).toEqual({ gross: 350_000, fee: 35_000, net: 315_000 });
    // Nothing is created or lost.
    expect(s.partner.gross + s.agency.gross).toBe(500_000);
  });

  it("pays the share in proportion when only part is released, and nothing when all is refunded", () => {
    const half = splitRelease(250_000, 500_000, 150_000, 0);
    expect(half.partner.gross).toBe(75_000);
    expect(half.agency.gross).toBe(175_000);
    expect(splitRelease(0, 500_000, 150_000, 10).partner.gross).toBe(0);
  });

  it("validates the form and fingerprints the agreement", () => {
    expect(shareInputSchema.safeParse({ kind: "percent", percent: "40" }).success).toBe(true);
    expect(shareInputSchema.safeParse({ kind: "percent", percent: "140" }).success).toBe(false);
    expect(shareInputSchema.safeParse({ kind: "fixed", amount: "-5" }).success).toBe(false);
    const base = { contractId: "c", milestoneId: "m", milestoneTitle: "Photos", milestoneFils: 500_000, agencyId: "a", partnerAgencyId: "p", kind: "percent", percent: 30, amountFils: 150_000, note: null };
    expect(shareTermsHash(base)).toBe(shareTermsHash({ ...base }));
    expect(shareTermsHash(base)).not.toBe(shareTermsHash({ ...base, amountFils: 150_001 }));
  });
});
