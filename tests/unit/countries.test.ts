import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ALL_CITIES, COUNTRIES, countryFromPosition, countryFromTimeZone, countryOfCity, currencyLabel, currencyOf } from "@/lib/countries";
import { createAgency, listAgencies } from "@/lib/data/agencies";
import { createUser } from "@/lib/data/users";
import { formatFils } from "@/lib/format";
import { findMatches } from "@/lib/matching";
import { withCountry } from "@/lib/matching/scope";
import { closeDb } from "@/lib/db";

describe("country registry", () => {
  it("covers Jordan, the six Gulf states and Egypt, with unique city keys", () => {
    expect(COUNTRIES.map((c) => c.code)).toEqual(["jo", "sa", "ae", "kw", "qa", "bh", "om", "eg"]);
    expect(new Set(ALL_CITIES).size).toBe(ALL_CITIES.length);
    expect(countryOfCity("riyadh")).toBe("sa");
    expect(countryOfCity("amman")).toBe("jo");
    expect(countryOfCity("atlantis")).toBeNull();
    expect(currencyOf("eg")).toBe("EGP");
    expect(currencyLabel("SAR", "ar")).toBe("ر.س");
    expect(formatFils(1_500_000, "en", "AED")).toBe("1,500 AED");
  });

  it("maps a GPS position and a time zone to a country", () => {
    expect(countryFromPosition(31.95, 35.93)).toBe("jo"); // Amman
    expect(countryFromPosition(24.71, 46.67)).toBe("sa"); // Riyadh
    expect(countryFromPosition(25.2, 55.27)).toBe("ae"); // Dubai
    expect(countryFromPosition(29.37, 47.98)).toBe("kw"); // Kuwait City
    expect(countryFromPosition(25.29, 51.53)).toBe("qa"); // Doha
    expect(countryFromPosition(26.22, 50.58)).toBe("bh"); // Manama
    expect(countryFromPosition(23.59, 58.41)).toBe("om"); // Muscat
    expect(countryFromPosition(30.04, 31.24)).toBe("eg"); // Cairo
    expect(countryFromPosition(51.5, -0.12)).toBeNull(); // London
    expect(countryFromTimeZone("Asia/Riyadh")).toBe("sa");
    expect(countryFromTimeZone("Europe/Paris")).toBeNull();
  });
});

describe("listings stay in one country", () => {
  beforeAll(async () => {
    const a = await createUser("riyadh@t.jo", "password-1234");
    await createAgency(a.id, { handle: "riyadh.ads", name: "Riyadh Ads", city: "riyadh", services: ["ads_meta"] });
    const b = await createUser("amman@t.jo", "password-1234");
    await createAgency(b.id, { handle: "amman.ads", name: "Amman Ads", city: "amman", services: ["ads_meta"] });
  });
  afterAll(() => closeDb());

  it("an agency's country comes from its city", async () => {
    const [riyadh] = await listAgencies({ country: "sa" });
    expect(riyadh).toMatchObject({ handle: "riyadh.ads", country: "sa" });
    expect((await listAgencies({ country: "jo" })).map((a) => a.handle)).toEqual(["amman.ads"]);
  });

  it("matching searches the visitor's country", async () => {
    expect((await findMatches({ services: ["ads_meta"], country: "sa" })).map((m) => m.handle)).toEqual(["riyadh.ads"]);
    expect((await withCountry("jo", () => findMatches({ services: ["ads_meta"] }))).map((m) => m.handle)).toEqual(["amman.ads"]);
    expect((await findMatches({ services: ["ads_meta"], city: "riyadh" })).map((m) => m.handle)).toEqual(["riyadh.ads"]);
  });
});
