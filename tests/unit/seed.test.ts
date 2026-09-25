import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { removeDemoData } from "@/lib/data/admin";
import { closeDb, getDb } from "@/lib/db";
import { agencies, packages } from "@/lib/db/schema";
import { DEMO_AGENCIES, seed } from "@/lib/db/seed";

afterAll(() => closeDb());

describe("demo seed", () => {
  it("includes a healthcare specialist, adds new demo agencies to an existing demo, and respects removal", async () => {
    await seed({ quiet: true });
    const db = await getDb();
    const count = async () => (await db.select({ id: agencies.id }).from(agencies)).length;
    expect(await count()).toBe(DEMO_AGENCIES.length);

    const [shifa] = await db.select().from(agencies).where(eq(agencies.handle, "shifa.digital"));
    expect(shifa.industries).toEqual(["clinic_health"]);
    const pkgs = await db.select().from(packages).where(eq(packages.agencyId, shifa.id));
    expect(pkgs.map((p) => p.title)).toEqual(["باقة العيادة", "Bookings Growth"]);
    expect(pkgs[0].items).toContainEqual({ key: "reels", quantity: 8, platform: "instagram" });

    // A deployment seeded before this agency existed gets it on the next boot.
    await db.delete(agencies).where(eq(agencies.id, shifa.id));
    await seed({ quiet: true });
    expect(await count()).toBe(DEMO_AGENCIES.length);
    await seed({ quiet: true }); // nothing missing: no duplicates
    expect(await count()).toBe(DEMO_AGENCIES.length);

    // Once an admin removes demo data, the seed never brings it back.
    const removed = await removeDemoData();
    expect(removed).toEqual({ deleted: DEMO_AGENCIES.length, deactivated: 0 });
    await seed({ quiet: true });
    expect(await count()).toBe(0);
  }, 600_000);
});
