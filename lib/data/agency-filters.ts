import { arrayOverlaps, sql, type SQL } from "drizzle-orm";
import { agencies, packages } from "@/lib/db/schema";
import { FULL_SERVICE_GROUPS } from "@/lib/full-service";

export type AgencyFilterInput = { platforms?: string[]; minPrice?: number; maxPrice?: number; fullService?: boolean };

/** Conditions on the agencies table shared by the post feed and the agency list. */
export function agencyConditions(f: AgencyFilterInput, { platformsOnAgency = true } = {}): SQL[] {
  const c: SQL[] = [];
  if (platformsOnAgency && f.platforms?.length) c.push(arrayOverlaps(agencies.platforms, f.platforms));
  // Budget range (JOD a month): the agency starts within the budget…
  if (f.maxPrice !== undefined) c.push(sql`(${agencies.startingPriceJod} is null or ${agencies.startingPriceJod} <= ${f.maxPrice})`);
  // …and, when its packages are published, offers something at or above the minimum.
  if (f.minPrice !== undefined) {
    c.push(sql`coalesce((select max(${packages.priceJod}) from ${packages} where ${packages.agencyId} = ${agencies.id}), ${f.minPrice}) >= ${f.minPrice}`);
  }
  if (f.fullService) for (const group of FULL_SERVICE_GROUPS) c.push(arrayOverlaps(agencies.services, group));
  return c;
}
