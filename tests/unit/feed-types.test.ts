import "./setup-db";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPromotion } from "@/lib/data/admin";
import { createAgency } from "@/lib/data/agencies";
import { createPost, getFeed } from "@/lib/data/posts";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";
import { BUSINESS_EMOJI, BUSINESS_TYPES, isBusinessType } from "@/lib/business-types";
import { injectPromotions } from "@/lib/monetization/promotions";

const png = () => sharp({ create: { width: 600, height: 600, channels: 3, background: "#be123c" } }).png().toBuffer();

beforeAll(async () => {
  const admin = await createUser("admin@t.jo", "password-1234", "admin");
  const cafe = await createAgency((await createUser("cafe@t.jo", "password-1234")).id, { handle: "cafe.studio", name: "Cafe Studio", city: "amman", services: ["smm_content"] });
  const shop = await createAgency((await createUser("shop@t.jo", "password-1234")).id, { handle: "shop.studio", name: "Shop Studio", city: "amman", services: ["smm_content"] });
  for (let i = 0; i < 6; i++) await createPost(cafe.id, { caption: `Café ${i}`, services: ["smm_content"], platforms: ["instagram"], industry: "restaurant_cafe" }, [await png()]);
  const shopPost = await createPost(shop.id, { caption: "Shop window", services: ["smm_content"], platforms: ["instagram"], industry: "retail_shop" }, [await png()]);
  const day = 24 * 3600 * 1000;
  await createPromotion({ agencyId: shop.id, postId: shopPost.id, placement: "feed", service: null, city: null, startsAt: new Date(Date.now() - day), endsAt: new Date(Date.now() + day), note: "test", createdBy: admin.id });
}, 60_000);
afterAll(() => closeDb());

describe("business types in the feed", () => {
  it("has a picture for every type", () => {
    expect(Object.keys(BUSINESS_EMOJI).sort()).toEqual([...BUSINESS_TYPES].sort());
    expect(isBusinessType("restaurant_cafe")).toBe(true);
    expect(isBusinessType("nope")).toBe(false);
  });

  it("filters posts by type", async () => {
    const { items } = await getFeed({ industry: "restaurant_cafe" }, null, 12);
    expect(items.length).toBe(6);
    expect(items.every((p) => p.industry === "restaurant_cafe")).toBe(true);
  });

  it("never slips a sponsored post of another type into a type-filtered feed", async () => {
    const cafes = await getFeed({ industry: "restaurant_cafe" }, null, 12);
    // Unfiltered, the shop's sponsored post does go in after six posts…
    const mixed = await injectPromotions(cafes.items, { placement: "feed", filters: {}, firstPage: true, visitorId: null });
    expect(mixed.some((p) => p.sponsored && p.industry === "retail_shop")).toBe(true);
    // …but not into the cafés-only feed.
    const withAds = await injectPromotions(cafes.items, { placement: "feed", filters: { industry: "restaurant_cafe" }, firstPage: true, visitorId: null });
    expect(withAds.every((p) => p.industry === "restaurant_cafe")).toBe(true);
  });
});
