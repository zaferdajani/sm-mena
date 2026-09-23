import "./setup-db";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency, listAgencies, listStripAgencies } from "@/lib/data/agencies";
import { createPost, decodeCursor, deletePost, getFeed, getPost } from "@/lib/data/posts";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";
import { ImageError, processImage } from "@/lib/images";

async function png(width = 800, height = 800, color = "#13784a") {
  return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
}

let agencyA: string;
let agencyB: string;

beforeAll(async () => {
  const u1 = await createUser("a@test.jo", "password-123");
  const u2 = await createUser("b@test.jo", "password-123");
  agencyA = (await createAgency(u1.id, { handle: "alpha.media", name: "ألفا ميديا", city: "amman", services: ["ads_meta"], startingPriceJod: 200 }, { isVerified: true })).id;
  agencyB = (await createAgency(u2.id, { handle: "beta.studio", name: "Beta Studio", city: "irbid", services: ["photography"], startingPriceJod: 600 })).id;
  for (let i = 0; i < 5; i++) {
    await createPost(agencyA, { caption: `حملة إعلانية رقم ${i}`, services: ["ads_meta"], platforms: ["instagram"], industry: "retail_shop" }, [await png()]);
  }
  await createPost(agencyB, { caption: "Product shoot", services: ["photography"], platforms: ["instagram"], industry: "restaurant_cafe" }, [await png(1200, 1600), await png()]);
}, 60_000);

afterAll(async () => {
  await closeDb();
});

describe("images", () => {
  it("resizes to the feed size and makes a square thumbnail", async () => {
    const out = await processImage(await png(3000, 2000));
    expect(out.width).toBe(1080);
    expect(out.height).toBe(720);
    const thumb = await sharp(out.thumb).metadata();
    expect([thumb.width, thumb.height, thumb.format]).toEqual([480, 480, "webp"]);
    expect(out.color).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("rejects non-images and tiny images", async () => {
    await expect(processImage(Buffer.from("not an image"))).rejects.toBeInstanceOf(ImageError);
    await expect(processImage(await png(100, 100))).rejects.toMatchObject({ code: "too_small" });
  });
});

describe("feed", () => {
  it("pages newest first without repeats", async () => {
    const first = await getFeed({}, null, 4);
    expect(first.items).toHaveLength(4);
    expect(first.nextCursor).not.toBeNull();
    const second = await getFeed({}, first.nextCursor, 4);
    expect(second.items).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
    const ids = [...first.items, ...second.items].map((p) => p.id);
    expect(new Set(ids).size).toBe(6);
    const times = [...first.items, ...second.items].map((p) => p.createdAt);
    expect([...times].sort().reverse()).toEqual(times);
  });

  it("filters by service, city, price and verified", async () => {
    expect((await getFeed({ service: "photography" }, null)).items).toHaveLength(1);
    expect((await getFeed({ city: "amman" }, null)).items).toHaveLength(5);
    expect((await getFeed({ maxPrice: 300 }, null)).items).toHaveLength(5);
    expect((await getFeed({ verified: true }, null)).items.every((p) => p.agency.isVerified)).toBe(true);
  });

  it("searches Arabic text regardless of letter variants", async () => {
    expect((await getFeed({ q: "اعلانيه" }, null)).items.length).toBe(5);
    expect((await getFeed({ q: "BETA" }, null)).items).toHaveLength(1);
  });

  it("keeps image order and dimensions", async () => {
    const [post] = (await getFeed({ agencyId: agencyB }, null)).items;
    expect(post.images).toHaveLength(2);
    expect(post.images[0].height).toBe(1350);
  });

  it("ignores malformed cursors", () => {
    expect(decodeCursor("garbage")).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
  });
});

describe("agencies", () => {
  it("lists agencies with posts in the strip and supports search", async () => {
    const strip = await listStripAgencies();
    expect(strip.map((a) => a.handle).sort()).toEqual(["alpha.media", "beta.studio"]);
    expect((await listAgencies({ q: "الفا" })).map((a) => a.handle)).toEqual(["alpha.media"]);
  });

  it("ranks paid plans first once monetization is on", async () => {
    const { setAgencyFlags } = await import("@/lib/data/admin");
    await setAgencyFlags(agencyB, { plan: "business" });
    process.env.MONETIZATION_ENABLED = "true";
    try {
      // alpha is verified, so it stays first; among unverified agencies the paid one ranks higher
      expect((await listAgencies({})).map((a) => a.handle)).toEqual(["alpha.media", "beta.studio"]);
      await setAgencyFlags(agencyA, { isVerified: false });
      expect((await listAgencies({})).map((a) => a.handle)).toEqual(["beta.studio", "alpha.media"]);
    } finally {
      delete process.env.MONETIZATION_ENABLED;
      await setAgencyFlags(agencyA, { isVerified: true });
      await setAgencyFlags(agencyB, { plan: "free" });
    }
  });

  it("deletes a post only for its owner and updates the count", async () => {
    const [post] = (await getFeed({ agencyId: agencyB }, null)).items;
    expect(await deletePost(post.id, agencyA)).toBe(false);
    expect(await deletePost(post.id, agencyB)).toBe(true);
    expect(await getPost(post.id)).toBeNull();
    const [beta] = await listAgencies({ q: "beta" });
    expect(beta.postCount).toBe(0);
  });
});
