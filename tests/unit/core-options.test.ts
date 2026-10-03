import { describe, expect, it } from "vitest";
import { countryOptionsFor } from "@/lib/core/options/country";
import { serviceAndCityOptionsFor } from "@/lib/core/options/form";
import { servesNoteFor } from "@/lib/core/options/serves-note";
import { postFormOptionsFor } from "@/lib/core/options/studio";
import { launchPhase } from "@/lib/core/rules/launch-phase";
import { entitlementsFor } from "@/lib/core/rules/monetization/entitlements";
import { PLANS } from "@/lib/core/rules/monetization/plans";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

// The option builders take (locale, t): the Next wrappers in lib/*-options.ts read those from the request,
// a native client passes its own. These tests run them with the real message catalogs and no framework.
const t = (ns: Record<string, string>) => (key: string) => ns[key] ?? key;
const arMessages = ar as unknown as Record<string, Record<string, string>>;
const enMessages = en as unknown as Record<string, Record<string, string>>;

describe("option builders without Next", () => {
  it("labels services in the page language and cities from the message catalog", () => {
    const options = serviceAndCityOptionsFor("ar", "jo", { cities: t(arMessages.Cities), platforms: t(arMessages.Platforms) });
    expect(options.cities.some((c) => c.key === "amman" && c.label === arMessages.Cities.amman)).toBe(true);
    expect(options.cities.every((c) => !/riyadh|dubai/.test(c.key))).toBe(true);
    const seo = options.services.find((s) => s.key === "seo");
    expect(seo?.label).toBe("SEO");
    expect(options.platforms.length).toBeGreaterThan(3);
  });
  it("puts the agency's own services first in the post form", () => {
    const options = postFormOptionsFor("en", ["seo"], [{ id: "c1", name: "Client" }], { platforms: t(enMessages.Platforms), industries: t(enMessages.Industries) });
    expect(options.services.primary.map((s) => s.key)).toEqual(["seo"]);
    expect(options.services.other.some((s) => s.key === "seo")).toBe(false);
    expect(options.clients).toEqual([{ key: "c1", label: "Client" }]);
  });
  it("names countries in Arabic or English with their cities", () => {
    const arabic = countryOptionsFor("ar", t(arMessages.Cities));
    const english = countryOptionsFor("en", t(enMessages.Cities));
    const jo = (list: typeof arabic) => list.find((c) => c.code === "jo")!;
    expect(jo(english).name).toBe("Jordan");
    expect(jo(arabic).name).not.toBe("Jordan");
    expect(jo(arabic).cities.map((c) => c.key)).toEqual(jo(english).cities.map((c) => c.key));
  });
  it("writes the serves-elsewhere note only when it applies", () => {
    const tp = (key: string, values?: Record<string, string | number | Date>) => `${key}:${Object.values(values ?? {}).join("|")}`;
    expect(servesNoteFor("en", tp, { country: "jo", servesCountries: [] }, "jo")).toBeNull();
    expect(servesNoteFor("en", tp, { country: "jo", servesCountries: ["sa"] }, "sa")).toMatch(/^servesHere:.*Jordan\|.*Saudi/);
    expect(servesNoteFor("en", tp, { country: "jo", servesCountries: [] })).toBeNull();
    expect(servesNoteFor("ar", tp, { country: "jo", servesCountries: ["sa", "ae"] })).toMatch(/basedIn:.*· alsoServes:.*، /);
  });
});

describe("pure rules take their configuration as arguments", () => {
  it("launchPhase reads the env it is given and fails closed", () => {
    expect(launchPhase({ LAUNCH_PHASE: "full" })).toBe("full");
    expect(launchPhase({ LAUNCH_PHASE: "discovery" })).toBe("discovery");
    expect(launchPhase({ LAUNCH_PHASE: "open-bar" })).toBe("registration");
    expect(launchPhase({})).toBe("registration");
  });
  it("entitlements enforce only when told to", () => {
    const agency = { plan: "free" as const, planExpiresAt: null };
    expect(entitlementsFor(agency, { enforced: false }).maxPosts).toBeNull();
    expect(entitlementsFor(agency, { enforced: true }).maxPosts).toBe(PLANS.free.maxPosts);
    const now = new Date("2026-10-01");
    expect(entitlementsFor({ plan: "pro", planExpiresAt: new Date("2026-09-01") }, { enforced: true, now }).id).toBe("free");
  });
});
