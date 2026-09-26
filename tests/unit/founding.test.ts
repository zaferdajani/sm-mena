import { afterEach, describe, expect, it } from "vitest";
import { FOUNDING, foundingStatus, isFoundingMember } from "@/lib/founding";

// The Founding 100 (docs/39): seat number ≠ cohort ≠ benefits.
const d = (s: string) => new Date(s);

describe("founding cohort", () => {
  afterEach(() => {
    delete process.env.FOUNDING_CLOSES_AT;
    delete process.env.FOUNDING_ACTIVATED_AT;
  });

  it("is the first seats of real providers, never demo agencies or seats past the cap", () => {
    expect(isFoundingMember({ foundingSeat: 1, createdAt: d("2026-09-01"), isDemo: false })).toBe(true);
    expect(isFoundingMember({ foundingSeat: FOUNDING.size, createdAt: d("2026-09-01"), isDemo: false })).toBe(true);
    expect(isFoundingMember({ foundingSeat: FOUNDING.size + 1, createdAt: d("2026-09-01"), isDemo: false })).toBe(false);
    expect(isFoundingMember({ foundingSeat: 3, createdAt: d("2026-09-01"), isDemo: true })).toBe(false);
    expect(isFoundingMember({ foundingSeat: null, createdAt: d("2026-09-01"), isDemo: false })).toBe(false);
  });

  it("closes on the date, even with seats left; a member's seat number survives the close", () => {
    process.env.FOUNDING_CLOSES_AT = "2026-12-31T23:59:59Z";
    expect(isFoundingMember({ foundingSeat: 5, createdAt: d("2026-10-01"), isDemo: false })).toBe(true);
    expect(isFoundingMember({ foundingSeat: 6, createdAt: d("2027-01-02"), isDemo: false })).toBe(false);
    const late = foundingStatus({ foundingSeat: 6, createdAt: d("2027-01-02"), isDemo: false }, 40, d("2027-01-03"));
    expect(late).toMatchObject({ member: false, seat: 6, seatsLeft: 60, open: false });
  });

  it("counts seats left and starts the benefit clock only at activation", () => {
    const before = foundingStatus({ foundingSeat: 2, createdAt: d("2026-09-01"), isDemo: false }, 2, d("2026-09-26"));
    expect(before).toMatchObject({ member: true, seatsLeft: 98, open: true, benefitsUntil: null });
    process.env.FOUNDING_ACTIVATED_AT = "2026-11-01T00:00:00Z";
    const after = foundingStatus({ foundingSeat: 2, createdAt: d("2026-09-01"), isDemo: false }, 100, d("2026-11-02"));
    expect(after.open).toBe(false);
    expect(after.benefitsUntil?.toISOString()).toBe("2027-01-30T00:00:00.000Z");
  });
});
