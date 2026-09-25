import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { packageFacts } from "@/lib/data/hire";
import { createPackage, type PackageInput } from "@/lib/data/packages";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { packages } from "@/lib/db/schema";

const service = "smm_management";
let agencyId: string;

type Sample = { price: number; billing?: PackageInput["billing"]; days?: number | null };

async function addPackages(samples: Sample[]) {
  for (const [index, sample] of samples.entries()) {
    const row = await createPackage(agencyId, {
      title: `Pricing fixture ${index + 1}`,
      description: "Fictional package used only by the isolated test database.",
      service,
      priceJod: sample.price,
      billing: sample.billing ?? "monthly",
      deliverables: ["Test deliverable"],
      deliveryDays: sample.days ?? null,
    });
    expect(row).not.toBeNull();
  }
}

function facts() {
  return packageFacts(service, { city: "amman", country: "JO" });
}

beforeAll(async () => {
  const owner = await createUser("hire-pricing@sawwiq.test", "fixture-password-123");
  agencyId = (await createAgency(owner.id, {
    handle: "hire.pricing.fixture",
    name: "Hire pricing fixture",
    city: "amman",
    services: [service],
    startingPriceJod: 250,
  })).id;
}, 60_000);

beforeEach(async () => {
  const db = await getDb();
  await db.delete(packages).where(eq(packages.agencyId, agencyId));
});

afterAll(async () => {
  await closeDb();
});

describe("hire package price and delivery medians", () => {
  it("returns no facts when there are no packages", async () => {
    expect(await facts()).toBeNull();
  });

  it("averages both prices and delivery times in an even sample", async () => {
    await addPackages([{ price: 320, days: 10 }, { price: 250, days: 4 }]);
    expect(await facts()).toEqual({
      count: 2,
      monthly: { min: 250, median: 285, max: 320 },
      oneOff: null,
      deliveryDays: 7,
    });
  });

  it("uses the central observation for an unsorted odd sample", async () => {
    await addPackages([{ price: 900, days: 21 }, { price: 100, days: 3 }, { price: 300, days: 9 }]);
    expect(await facts()).toEqual({
      count: 3,
      monthly: { min: 100, median: 300, max: 900 },
      oneOff: null,
      deliveryDays: 9,
    });
  });

  it("uses the two central observations rather than the extremes", async () => {
    await addPackages([{ price: 900 }, { price: 100 }, { price: 300 }, { price: 200 }]);
    expect((await facts())?.monthly).toEqual({ min: 100, median: 250, max: 900 });
  });

  it("preserves a single observation", async () => {
    await addPackages([{ price: 150, billing: "one_off", days: 5 }]);
    expect(await facts()).toEqual({
      count: 1,
      monthly: null,
      oneOff: { min: 150, median: 150, max: 150 },
      deliveryDays: 5,
    });
  });

  it("keeps monthly and one-off price populations separate", async () => {
    await addPackages([
      { price: 320 },
      { price: 250 },
      { price: 500, billing: "one_off" },
      { price: 100, billing: "one_off" },
    ]);
    expect(await facts()).toEqual({
      count: 4,
      monthly: { min: 250, median: 285, max: 320 },
      oneOff: { min: 100, median: 300, max: 500 },
      deliveryDays: null,
    });
  });

  it("retains fractional medians instead of choosing the lower observation", async () => {
    await addPackages([{ price: 501, billing: "one_off", days: 7 }, { price: 100, billing: "one_off", days: 4 }]);
    expect(await facts()).toEqual({
      count: 2,
      monthly: null,
      oneOff: { min: 100, median: 300.5, max: 501 },
      deliveryDays: 5.5,
    });
  });

  it("does not turn missing delivery times into zero-day observations", async () => {
    await addPackages([{ price: 100, days: null }, { price: 200, days: 8 }]);
    expect((await facts())?.deliveryDays).toBe(8);
  });
});
