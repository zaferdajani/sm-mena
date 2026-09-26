import { describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "@/lib/countries";
import { summariseProviders, vaultState } from "@/lib/teaser";

describe("teaser stats", () => {
  it("lists every served country, even with no providers", () => {
    const s = summariseProviders([]);
    expect(s.total).toBe(0);
    expect(s.countries.map((c) => c.code)).toEqual([...COUNTRY_CODES]);
    expect(s.cities).toEqual([]);
  });

  it("counts per country and city, most first, and splits agencies from freelancers", () => {
    const s = summariseProviders([
      { country: "jo", city: "amman", kind: "agency" },
      { country: "jo", city: "amman", kind: "freelancer" },
      { country: "jo", city: "irbid", kind: "agency" },
      { country: "sa", city: "riyadh", kind: "agency" },
    ]);
    expect(s.total).toBe(4);
    expect(s.freelancers).toBe(1);
    expect(s.agencies).toBe(3);
    expect(s.countries.slice(0, 2)).toEqual([
      { code: "jo", n: 3 },
      { code: "sa", n: 1 },
    ]);
    expect(s.cities[0]).toEqual({ key: "amman", country: "jo", n: 2 });
  });

  it("trusts the city over a stale country, and skips unknown places", () => {
    const s = summariseProviders([
      { country: "jo", city: "riyadh", kind: "agency" },
      { country: "xx", city: "nowhere", kind: "agency" },
      { country: "eg", city: "nowhere", kind: "agency" },
    ]);
    expect(s.countries.find((c) => c.code === "sa")?.n).toBe(1);
    expect(s.countries.find((c) => c.code === "eg")?.n).toBe(1);
    expect(s.total).toBe(2);
    expect(s.cities).toEqual([{ key: "riyadh", country: "sa", n: 1 }]);
  });
});

describe("teaser vault", () => {
  it("unlocks teasers as real seats fill and tracks progress to the next one", () => {
    let v = vaultState(0);
    expect(v.items.every((i) => !i.open)).toBe(true);
    expect(v.next?.at).toBe(100);
    expect(v.left).toBe(100);
    v = vaultState(150);
    expect(v.items.map((i) => i.open)).toEqual([true, false, false]);
    expect(v.progress).toBeCloseTo(50 / 400);
    v = vaultState(1200);
    expect(v.next).toBeNull();
    expect(v.progress).toBe(1);
  });
});
