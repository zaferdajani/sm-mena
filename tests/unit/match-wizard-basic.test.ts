import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { basicMatchmaker, examples } from "@/lib/ai/fallback";
import { createAgency } from "@/lib/data/agencies";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";
import { findMatches, marketPrices } from "@/lib/matching";
import { withCountry } from "@/lib/matching/scope";
import { answer, emptyNeed, skipRest } from "@/lib/match-wizard";

beforeAll(async () => {
  const a = await createUser("riyadh-w@t.jo", "password-1234");
  await createAgency(a.id, { handle: "riyadh.social", name: "Riyadh Social", city: "riyadh", services: ["smm_management"], startingPriceJod: 4000 });
  const b = await createUser("amman-w@t.jo", "password-1234");
  await createAgency(b.id, { handle: "amman.social", name: "Amman Social", city: "amman", services: ["smm_management"], startingPriceJod: 300 });
  // Price ranges need at least MIN_PRICE_SAMPLE (3) prices in a country.
  for (const [handle, city, price] of [["jeddah.social", "jeddah", 3500], ["dammam.social", "dammam", 4500]] as const) {
    const u = await createUser(`${handle}@t.jo`, "password-1234");
    await createAgency(u.id, { handle, name: handle, city, services: ["smm_management"], startingPriceJod: price });
  }
});
afterAll(() => closeDb());

const user = (content: string) => [{ role: "user" as const, content }];

describe("the visitor's country wins", () => {
  it("findMatches ignores a city in another country", async () => {
    const found = await withCountry("sa", () => findMatches({ services: ["smm_management"], city: "amman" }));
    expect(found.map((m) => m.handle).sort()).toEqual(["dammam.social", "jeddah.social", "riyadh.social"]);
  });

  it("prices stay in the visitor's country", async () => {
    const sa = await withCountry("sa", () => marketPrices("smm_management", "amman"));
    expect(sa.suggested?.median).toBe(4000);
  });

  it("examples use the visitor's capital and currency", () => {
    expect(examples("sa", "ar").join(" ")).toContain("الرياض");
    expect(examples("sa", "ar").join(" ")).toContain("ر.س");
    expect(examples("sa", "en").join(" ")).not.toMatch(/Amman|JOD/);
  });

  it("asks before switching when a message names a city elsewhere", async () => {
    const res = await withCountry("sa", () => basicMatchmaker(user("Instagram management for a restaurant in Amman"), "en", emptyNeed()));
    expect(res.recommendation).toBeNull();
    expect(res.countrySwitch).toEqual({ country: "jo", city: "amman" });
    expect(res.reply).toContain("Saudi Arabia");
  });
});

describe("guided chat in rule-based mode", () => {
  it("fills answers from typed text and asks for the rest", async () => {
    const need = answer(emptyNeed(), { step: "groups", groups: ["social_media"] });
    const res = await withCountry("sa", () => basicMatchmaker(user("مطعم في جدة"), "ar", need));
    expect(res.recommendation).toBeNull();
    expect(res.need).toMatchObject({ industry: "restaurant_cafe", city: "jeddah" });
    expect(res.reply).toContain("جدة");
  });

  it("shows Saudi agencies with riyal amounts once complete", async () => {
    const need = skipRest(answer(answer(emptyNeed(), { step: "groups", groups: ["social_media"] }), { step: "budget", min: 2000, max: 5000 }));
    const res = await withCountry("sa", () => basicMatchmaker(user("5,000 ر.س شهرياً"), "ar", need, true));
    expect(res.recommendation?.agencies.map((a) => a.handle)).toContain("riyadh.social");
    expect(res.recommendation?.agencies.map((a) => a.handle)).not.toContain("amman.social");
    expect(res.recommendation?.currency).toBe("SAR");
    expect(res.recommendation?.budgetNote).toContain("ر.س");
    expect(res.recommendation?.budgetNote).not.toContain("د.أ");
    expect(res.reply).toContain("السعودية");
  });

  it("a brief typed at the first question goes straight to matches", async () => {
    const res = await withCountry("sa", () => basicMatchmaker(user("Instagram management in Riyadh, 5000 SAR"), "en", emptyNeed()));
    expect(res.recommendation?.agencies[0].handle).toBe("riyadh.social");
    expect(res.recommendation?.city).toBe("riyadh");
  });
});
