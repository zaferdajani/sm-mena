import "./setup-db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { closeDb } from "@/lib/db";
import { cachedFeatureState, defaultFeatures, featureOpen, getFeatures, resetFeatureCache, setFeature } from "@/lib/features";
import { goLiveChecklist, setManualTick } from "@/lib/golive";
import { monetizationEnabled } from "@/lib/monetization/plans";

afterAll(() => closeDb());
beforeEach(() => resetFeatureCache());

describe("feature switches", () => {
  it("start with protected payments and paid plans coming soon, everything else on", () => {
    const d = defaultFeatures();
    expect(d.protected_payments.state).toBe("soon");
    expect(d.paid_plans.state).toBe("soon");
    expect(d.contracts.state).toBe("on");
    expect(d.ai_matchmaker.state).toBe("on");
  });

  it("take a different starting point from FEATURE_DEFAULTS, ignoring unknown names", () => {
    process.env.FEATURE_DEFAULTS = "protected_payments=on, ndas=off, nonsense=on, reviews=maybe";
    const d = defaultFeatures();
    delete process.env.FEATURE_DEFAULTS;
    expect(d.protected_payments.state).toBe("on");
    expect(d.ndas.state).toBe("off");
    expect(d.reviews.state).toBe("on");
  });

  it("let pilots and staff use a coming-soon feature, nobody an off one, everyone an on one", async () => {
    const saved = await setFeature("protected_payments", { state: "soon", pilots: ["@Pilot.Agency", "pilot.agency", "bad handle!"] }, null);
    expect(saved.pilots).toEqual(["pilot.agency"]);
    resetFeatureCache();
    expect((await getFeatures()).protected_payments).toEqual({ state: "soon", pilots: ["pilot.agency"] });
    expect(await featureOpen("protected_payments", { agencyHandle: "pilot.agency" })).toBe(true);
    expect(await featureOpen("protected_payments", { agencyHandle: "other.agency" })).toBe(false);
    expect(await featureOpen("protected_payments", { staff: true })).toBe(true);
    expect(await featureOpen("protected_payments")).toBe(false);

    await setFeature("protected_payments", { state: "off", pilots: ["pilot.agency"] }, null);
    expect(await featureOpen("protected_payments", { agencyHandle: "pilot.agency", staff: true })).toBe(false);
    await setFeature("protected_payments", { state: "on", pilots: [] }, null);
    expect(await featureOpen("protected_payments")).toBe(true);
    await setFeature("protected_payments", { state: "soon", pilots: [] }, null);
  }, 30_000);

  it("drive paid plans (monetization) from the switch", async () => {
    await setFeature("paid_plans", { state: "on", pilots: [] }, null);
    expect(cachedFeatureState("paid_plans")).toBe("on");
    expect(monetizationEnabled()).toBe(true);
    await setFeature("paid_plans", { state: "soon", pilots: [] }, null);
    expect(monetizationEnabled()).toBe(false);
  });
});

describe("protected payments go-live checklist", () => {
  it("is not ready in test mode, and remembers the steps the owner ticks", async () => {
    const before = await goLiveChecklist();
    expect(before.live).toBe(false);
    expect(before.ready).toBe(false);
    expect(before.items.find((i) => i.key === "adapterConnected")).toMatchObject({ done: false, manual: false });
    await setManualTick("lawyerReviewed", true, null);
    const after = await goLiveChecklist();
    expect(after.items.find((i) => i.key === "lawyerReviewed")).toMatchObject({ done: true, manual: true });
    await setManualTick("lawyerReviewed", false, null);
    expect((await goLiveChecklist()).items.find((i) => i.key === "lawyerReviewed")?.done).toBe(false);
  });
});
