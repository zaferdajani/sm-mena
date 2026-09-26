import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency, getAgencyByHandle } from "@/lib/data/agencies";
import { clientByConfirmToken, confirmClient, confirmedCounts, ensureConfirmToken, resetConfirmation, saveClient } from "@/lib/data/portfolio-clients";
import { topAgencies } from "@/lib/data/top";
import { findWhoRuns, parseAccountQuery } from "@/lib/data/who-runs";
import { createUser } from "@/lib/data/users";
import { closeDb } from "@/lib/db";
import { handleOfUrl, kindOfUrl } from "@/lib/social-links";
import { cleanApp, isTryUrlAllowed } from "@/lib/app-demo";

// The Behind-the-Page movement (marketing/05, docs/28): member numbers, client
// confirmation, "who runs this page?", the Sawwiq 50; and app demos (docs/37).

let a1: string;
let a2: string;
let cafe: string;

beforeAll(async () => {
  const u1 = await createUser("m1@test.jo", "password-123");
  const u2 = await createUser("m2@test.jo", "password-123");
  a1 = (await createAgency(u1.id, { handle: "behind.one", name: "Behind One", city: "amman", services: ["smm_management"], startingPriceJod: 200 })).id;
  a2 = (await createAgency(u2.id, { handle: "behind.two", name: "Behind Two", city: "amman", services: ["smm_management"], startingPriceJod: 200 })).id;
  const c = await saveClient(a1, null, { name: "Rose Café", links: [{ kind: "instagram", value: "@Rose.Cafe" }, { kind: "tiktok", value: "rosecafe" }] });
  if ("error" in c) throw new Error("client");
  cafe = c.id;
  const other = await saveClient(a2, null, { name: "Rose Café (claimed)", links: [{ kind: "instagram", value: "rose.cafe" }] });
  if ("error" in other) throw new Error("client");
});

afterAll(async () => {
  await closeDb();
});

describe("member numbers", () => {
  it("are given in order of joining", async () => {
    const one = await getAgencyByHandle("behind.one");
    const two = await getAgencyByHandle("behind.two");
    expect(one?.memberNo).toBeGreaterThan(0);
    expect(two!.memberNo!).toBe(one!.memberNo! + 1);
  });
});

describe("client confirmation and who runs this page", () => {
  it("reads handles and links", () => {
    expect(parseAccountQuery("@Rose.Cafe")).toEqual({ handle: "Rose.Cafe", kind: null });
    expect(parseAccountQuery("https://www.instagram.com/rose.cafe/")).toEqual({ handle: "rose.cafe", kind: "instagram" });
    expect(parseAccountQuery("tiktok.com/@rosecafe")).toEqual({ handle: "rosecafe", kind: "tiktok" });
    expect(parseAccountQuery("not a handle!!")).toBeNull();
    expect(kindOfUrl("https://x.com/rose")).toBe("x");
    expect(handleOfUrl("https://youtube.com/@rose")).toBe("rose");
  });

  it("answers only with accounts the client confirmed", async () => {
    expect(await findWhoRuns("@rose.cafe")).toEqual([]); // listed by two agencies, confirmed by none
    const token = await ensureConfirmToken(a1, cafe);
    expect(token).toMatch(/^[\w-]{20,}$/);
    expect(await ensureConfirmToken(a1, cafe)).toBe(token); // stable
    expect(await ensureConfirmToken(a2, cafe)).toBeNull(); // not its client
    const found = await clientByConfirmToken(token!);
    expect(found?.client.name).toBe("Rose Café");
    expect(found?.agency.handle).toBe("behind.one");
    expect(await confirmClient(token!)).toBe(true);
    expect(await confirmClient("nope")).toBe(false);

    const hits = await findWhoRuns("https://instagram.com/Rose.Cafe");
    expect(hits.map((h) => h.agency.handle)).toEqual(["behind.one"]);
    expect(hits[0].client.kind).toBe("instagram");
    expect(await findWhoRuns("@rosecafe")).toHaveLength(1); // the TikTok handle too
    expect(await findWhoRuns("https://tiktok.com/@rose.cafe")).toEqual([]); // wrong network
    expect(await confirmedCounts([a1, a2])).toEqual(new Map([[a1, 1]]));
  });

  it("ranks the Sawwiq 50 by confirmed accounts, and a withdrawn confirmation drops out", async () => {
    const top = await topAgencies("jo");
    expect(top[0]).toMatchObject({ rank: 1, confirmed: 1 });
    expect(top[0].agency.handle).toBe("behind.one");
    await resetConfirmation(a1, cafe);
    expect(await findWhoRuns("@rose.cafe")).toEqual([]);
    expect(await clientByConfirmToken("")).toBeNull();
  });
});

describe("app demos", () => {
  it("frames only the app mall", () => {
    expect(isTryUrlAllowed("https://pcn.store/embed/abc/")).toBe(true);
    expect(isTryUrlAllowed("https://demo.pcn.store/embed/abc/")).toBe(true);
    expect(isTryUrlAllowed("http://pcn.store/embed/abc/")).toBe(false);
    expect(isTryUrlAllowed("https://evil.example/pcn.store")).toBe(false);
    expect(cleanApp({})).toBeNull();
    expect(cleanApp({ name: "R" })).toEqual({ error: "appName" });
    expect(cleanApp({ name: "Rose app", tryUrl: "https://evil.example/" })).toEqual({ error: "appTryUrl" });
    expect(cleanApp({ name: "Rose app", kind: "ios", version: " 2.1 ", tryUrl: "https://pcn.store/embed/k/", storeUrl: "apps.apple.com/app/id1" })).toEqual({
      name: "Rose app",
      kind: "ios",
      version: "2.1",
      tryUrl: "https://pcn.store/embed/k/",
      storeUrl: "https://apps.apple.com/app/id1",
      webUrl: null,
    });
  });
});
