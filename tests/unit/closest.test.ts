import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { basicMatchmaker } from "@/lib/ai/fallback";
import { createAgency } from "@/lib/data/agencies";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";
import { closeness, hasRequirements, type CloseAgency } from "@/lib/matching/closeness";
import { closestAgencies } from "@/lib/matching/closest";
import { describeDifferences } from "@/lib/matching/describe";
import { withCountry } from "@/lib/matching/scope";

const agency = (over: Partial<CloseAgency> = {}): CloseAgency => ({
  services: ["smm_management"],
  platforms: ["instagram"],
  industries: [],
  city: "amman",
  country: "jo",
  servesCountries: [],
  priceJod: 300,
  maxPackageJod: null,
  isVerified: false,
  ...over,
});

describe("closeness", () => {
  it("is 100% when everything asked for is met, and counts only what was asked", () => {
    expect(closeness({ services: ["smm_management"], city: "amman", country: "jo", budgetMax: 400 }, agency()).percent).toBe(100);
    expect(hasRequirements({ country: "jo" })).toBe(false);
  });

  it("gives partial credit and says what differs", () => {
    const c = closeness(
      { services: ["smm_management", "ads_google"], city: "irbid", country: "jo", budgetMax: 250, platforms: ["instagram", "tiktok"], industry: "restaurant_cafe" },
      agency({ services: ["smm_management", "ads_meta"] }),
    );
    expect(c.percent).toBeGreaterThan(40);
    expect(c.percent).toBeLessThan(80);
    const byKey = Object.fromEntries(c.differences.map((d) => [d.key, d]));
    expect(byKey.services).toMatchObject({ status: "partly", offered: ["smm_management"], missing: ["ads_google"], related: ["ads_meta"] });
    expect(byKey.location).toMatchObject({ status: "partly", wantedCity: "irbid", city: "amman" });
    expect(byKey.budget).toMatchObject({ status: "partly", over: 50, price: 300 });
    expect(byKey.platforms).toMatchObject({ status: "partly", offered: ["instagram"], missing: ["tiktok"] });
    expect(byKey.industry).toMatchObject({ status: "missing" });
  });

  it("ranks an agency abroad that serves the country above one that doesn't", () => {
    const req = { services: ["seo"], country: "jo" };
    const serves = closeness(req, agency({ services: ["seo"], country: "sa", servesCountries: ["jo"] })).percent;
    const not = closeness(req, agency({ services: ["seo"], country: "sa" })).percent;
    expect(serves).toBeGreaterThan(not);
  });

  it("words the differences in Arabic and English", () => {
    const c = closeness({ services: ["seo"], city: "irbid", country: "jo", budgetMax: 200 }, agency({ services: ["seo"], priceJod: 260 }));
    const en = describeDifferences(c.differences, "en").map((l) => l.text);
    expect(en).toContain("Offers SEO");
    expect(en.some((l) => l.includes("not Irbid"))).toBe(true);
    expect(en.some((l) => l.includes("over your maximum"))).toBe(true);
    const ar = describeDifferences(c.differences, "ar").map((l) => l.text);
    expect(ar.some((l) => l.includes("إربد"))).toBe(true);
  });
});

describe("when a search finds nothing", () => {
  beforeAll(async () => {
    const a = await createUser("close-a@t.jo", "password-1234");
    await createAgency(a.id, { handle: "close.amman", name: "Close Amman", city: "amman", services: ["smm_management", "ads_meta"], startingPriceJod: 350 });
    const b = await createUser("close-b@t.jo", "password-1234");
    await createAgency(b.id, { handle: "close.zarqa", name: "Close Zarqa", city: "zarqa", services: ["seo"], startingPriceJod: 150 });
  });
  afterAll(() => closeDb());

  it("returns the closest agencies, best first, with their differences", async () => {
    const found = await closestAgencies({ services: ["smm_management"], city: "aqaba", country: "jo", budgetMax: 300 });
    expect(found[0].handle).toBe("close.amman");
    expect(found[0].percent).toBeGreaterThan(50);
    expect(found[0].differences.find((d) => d.key === "location")).toMatchObject({ status: "partly" });
  });

  it("the guided matchmaker says there's no exact match and shows the closest", async () => {
    // Nobody here offers Google Ads; an agency running Meta ads is the closest.
    const res = await withCountry("jo", () => basicMatchmaker([{ role: "user", content: "Google Ads for my clinic in Aqaba, budget 100 JOD" }], "en"));
    expect(res.recommendation?.closest).toBe(true);
    expect(res.reply).toContain("No agency in Jordan matches everything");
    expect(res.recommendation?.agencies[0].closeness?.percent).toBeGreaterThan(0);
  });
});
