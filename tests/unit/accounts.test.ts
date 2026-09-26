import "./setup-db";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { accountTiles, clientShowcase, getClient, saveClient, setClientLogo } from "@/lib/data/portfolio-clients";
import { createPost, getFeed } from "@/lib/data/posts";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";

// Accounts (docs/28): an agency's work grouped by the client it handles.
const png = () => sharp({ create: { width: 600, height: 600, channels: 3, background: "#13784a" } }).png().toBuffer();

let agencyId: string;
let cafe: string;
let shop: string;

beforeAll(async () => {
  const u = await createUser("accounts@test.jo", "password-123");
  agencyId = (await createAgency(u.id, { handle: "accounts.studio", name: "Accounts Studio", city: "amman", services: ["smm_management"], startingPriceJod: 200 })).id;
  const c1 = await saveClient(agencyId, null, { name: "Rose Café", links: [{ kind: "instagram", value: "@rose.cafe" }] });
  const c2 = await saveClient(agencyId, null, { name: "Petra Shop", links: [] });
  if ("error" in c1 || "error" in c2) throw new Error("client");
  cafe = c1.id;
  shop = c2.id;
  await createPost(agencyId, { caption: "Café reels", services: ["smm_management"], platforms: ["instagram"], clientId: cafe }, [await png()]);
  await createPost(agencyId, { caption: "Café menu", services: ["smm_management"], platforms: ["instagram"], clientId: cafe }, [await png()]);
  await createPost(agencyId, { caption: "Standalone shoot", services: ["smm_management"], platforms: ["instagram"] }, [await png()]);
});

afterAll(async () => {
  await closeDb();
});

describe("accounts: work grouped by client", () => {
  it("the Work tab gets one tile per account with work, and only the standalone posts", async () => {
    const tiles = await accountTiles(agencyId);
    expect(tiles.map((t) => [t.name, t.postCount])).toEqual([["Rose Café", 2]]); // the shop has no work yet
    expect(tiles[0].cover?.url).toMatch(/\.webp$/);
    const standalone = await getFeed({ agencyId, standalone: true }, null);
    expect(standalone.items.map((p) => p.caption)).toEqual(["Standalone shoot"]);
    expect(standalone.items[0].client).toBeNull();
  });

  it("the account page lists the account's posts, each carrying the account", async () => {
    const feed = await getFeed({ agencyId, clientId: cafe }, null);
    expect(feed.items.map((p) => p.caption).sort()).toEqual(["Café menu", "Café reels"]);
    expect(feed.items[0].client).toMatchObject({ id: cafe, name: "Rose Café", logoUrl: null });
    expect(await getClient(agencyId, cafe)).toMatchObject({ name: "Rose Café", postCount: 2 });
    expect(await getClient(agencyId, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("a logo is set, replaced (returning the old key) and shown everywhere the account appears", async () => {
    expect(await setClientLogo(agencyId, cafe, "clients/x/one.webp")).toBeNull();
    expect(await setClientLogo(agencyId, cafe, "clients/x/two.webp")).toBe("clients/x/one.webp");
    // Another agency's client can't be touched.
    expect(await setClientLogo("00000000-0000-0000-0000-000000000000", cafe, null)).toBeNull();
    expect((await getClient(agencyId, cafe))?.logoUrl).toContain("two.webp");
    expect((await accountTiles(agencyId))[0].logoUrl).toContain("two.webp");
    expect((await clientShowcase(agencyId)).find((c) => c.id === cafe)?.logoUrl).toContain("two.webp");
    expect((await getFeed({ agencyId, clientId: cafe }, null)).items[0].client?.logoUrl).toContain("two.webp");
    expect((await getClient(agencyId, shop))?.logoUrl).toBeNull();
  });
});
