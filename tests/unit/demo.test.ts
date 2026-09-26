import "./setup-db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency, listAgencies } from "@/lib/data/agencies";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { demoHiddenOnMain, isDemoMode, scopeFor, setDemoHiddenOnMain, visibleIn } from "@/lib/demo";

beforeAll(async () => {
  const real = await createUser("real@t.jo", "password-1234");
  const demo = await createUser("demo@t.jo", "password-1234");
  await createAgency(real.id, { handle: "real.one", name: "Real One", city: "amman", services: ["seo"] });
  await createAgency(demo.id, { handle: "demo.one", name: "Demo One", city: "amman", services: ["seo"] }, { isDemo: true });
});
afterAll(() => closeDb());

const handles = async (demo: boolean, hidden: boolean) => {
  const db = await getDb();
  return (await db.select({ handle: agencies.handle }).from(agencies).where(scopeFor(demo, hidden))).map((r) => r.handle).sort();
};

describe("the demo at /demo", () => {
  it("shows only demo agencies in the demo, whatever the main site does", async () => {
    expect(await handles(true, false)).toEqual(["demo.one"]);
    expect(await handles(true, true)).toEqual(["demo.one"]);
  });

  it("shows both on the main site until an admin hides the demo agencies", async () => {
    expect(await handles(false, false)).toEqual(["demo.one", "real.one"]);
    expect(await handles(false, true)).toEqual(["real.one"]);
  });

  it("hides pages across the line", () => {
    expect(visibleIn({ isDemo: false }, true, false)).toBe(false);
    expect(visibleIn({ isDemo: true }, true, true)).toBe(true);
    expect(visibleIn({ isDemo: true }, false, false)).toBe(true);
    expect(visibleIn({ isDemo: true }, false, true)).toBe(false);
    expect(visibleIn({ isDemo: false }, false, true)).toBe(true);
  });

  it("is off outside a request, and the admin switch is stored", async () => {
    expect(await isDemoMode()).toBe(false);
    expect(await demoHiddenOnMain()).toBe(false);
    expect((await listAgencies({})).map((a) => a.handle).sort()).toEqual(["demo.one", "real.one"]);
    await setDemoHiddenOnMain(true, null);
    expect(await demoHiddenOnMain()).toBe(true);
    expect((await listAgencies({})).map((a) => a.handle)).toEqual(["real.one"]);
    await setDemoHiddenOnMain(false, null);
    expect(await demoHiddenOnMain()).toBe(false);
  });
});
