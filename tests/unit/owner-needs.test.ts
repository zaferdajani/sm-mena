import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { getOwnerNeed, ownerNeedsInCountry, ownerNeedsStats, saveOwnerNeed } from "@/lib/data/owner-needs";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";
import { ownerNeedFromForm, ownerNeedSchema } from "@/lib/validation/owner-needs";

// Business owners' early registration (docs/58): the contract and the one-row-per-account store.

afterAll(async () => closeDb());

const form = (over: Record<string, string | string[]> = {}) => {
  const f = new FormData();
  const base: Record<string, string | string[]> = { country: "jo", city: "amman", businessType: "restaurant_cafe", services: ["social_media", "paid_media"], timing: "month", whatsapp: "+962 79 123 4567", note: " Opening a second branch ", ...over };
  for (const [k, v] of Object.entries(base)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
};

describe("ownerNeedSchema", () => {
  it("accepts a complete form and normalises the optional fields", () => {
    const r = ownerNeedSchema.safeParse(ownerNeedFromForm(form()));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data).toMatchObject({ country: "jo", city: "amman", businessType: "restaurant_cafe", services: ["social_media", "paid_media"], timing: "month", whatsapp: "+962791234567", note: "Opening a second branch" });
  });
  it("rejects a city outside the chosen country, an empty service list and an unknown timing", () => {
    expect(ownerNeedSchema.safeParse(ownerNeedFromForm(form({ city: "riyadh" }))).success).toBe(false);
    expect(ownerNeedSchema.safeParse(ownerNeedFromForm(form({ services: ["not_a_group"] }))).success).toBe(false);
    expect(ownerNeedSchema.safeParse(ownerNeedFromForm(form({ timing: "tomorrow" }))).success).toBe(false);
  });
  it("drops unknown business types and blank optionals instead of failing", () => {
    const r = ownerNeedSchema.safeParse(ownerNeedFromForm(form({ businessType: "spaceport", whatsapp: "", note: "   " })));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toMatchObject({ businessType: null, whatsapp: null, note: null });
  });
});

describe("owner needs store", () => {
  it("keeps one row per account, rewrites it on edit and counts by country, service and timing", async () => {
    const a = await createUser(`owner-a-${Date.now()}@test.jo`, "x".repeat(24), "client");
    const b = await createUser(`owner-b-${Date.now()}@test.jo`, "x".repeat(24), "client");
    const first = ownerNeedSchema.parse(ownerNeedFromForm(form()));
    await saveOwnerNeed(a.id, first, "ar");
    await saveOwnerNeed(b.id, ownerNeedSchema.parse(ownerNeedFromForm(form({ country: "sa", city: "riyadh", services: ["social_media"], timing: "now" }))), "en");
    // edit: the same account, new answers, still one row
    await saveOwnerNeed(a.id, ownerNeedSchema.parse(ownerNeedFromForm(form({ services: ["creative"], timing: "later" }))), "ar");
    const row = await getOwnerNeed(a.id);
    expect(row).toMatchObject({ userId: a.id, services: ["creative"], timing: "later", locale: "ar" });
    const stats = await ownerNeedsStats();
    expect(stats.total).toBeGreaterThanOrEqual(2);
    expect(stats.byCountry.find((c) => c.key === "sa")?.n).toBeGreaterThanOrEqual(1);
    expect(stats.byService.find((s) => s.key === "creative")?.n).toBeGreaterThanOrEqual(1);
    expect(stats.byTiming.find((s) => s.key === "later")?.n).toBeGreaterThanOrEqual(1);
    expect(await ownerNeedsInCountry("sa")).toBeGreaterThanOrEqual(1);
  });
});
