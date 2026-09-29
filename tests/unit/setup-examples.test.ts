import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { saveClient } from "@/lib/data/portfolio-clients";
import { setupExamples } from "@/lib/data/setup-examples";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, posts } from "@/lib/db/schema";

// The setup's examples are the demo agencies' real projects, also during the
// registration phase (when demo pages are not public), and never a real
// provider's work.

beforeAll(async () => {
  const db = await getDb();
  const make = async (handle: string, demo: boolean, services: string[]) => {
    const owner = await createUser(`${handle}@t.jo`, "password-1234");
    const agency = await createAgency(owner.id, { handle, name: handle, city: "amman", services });
    await db.update(agencies).set({ status: "active", isDemo: demo }).where(eq(agencies.id, agency.id));
    const client = await saveClient(agency.id, null, { name: `${handle} client`, industry: null, country: null, description: "", links: [] });
    await db.insert(posts).values({ agencyId: agency.id, caption: `${handle} work`, services, clientId: "ok" in client ? client.id : null });
    await db.insert(posts).values({ agencyId: agency.id, caption: `${handle} untagged`, services });
  };
  await make("demo.photo", true, ["photography"]);
  await make("demo.ads", true, ["ads_meta"]);
  await make("demo.same", true, ["photography"]);
  await make("real.one", false, ["seo"]);
});
afterAll(() => closeDb());

describe("setup examples", () => {
  it("returns one client-tagged project per demo agency, varied services first, never real providers", async () => {
    process.env.LAUNCH_PHASE = "registration";
    const examples = await setupExamples(2);
    expect(examples).toHaveLength(2);
    expect(examples.every((e) => e.agency.isDemo && e.client)).toBe(true);
    expect(new Set(examples.map((e) => e.services[0])).size).toBe(2);
    expect(examples.some((e) => e.caption.includes("real.one"))).toBe(false);
    expect(examples.every((e) => e.images !== undefined)).toBe(true);
    delete process.env.LAUNCH_PHASE;
  });
});
