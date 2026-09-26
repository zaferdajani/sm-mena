import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { summariseProviders } from "@/lib/teaser";

/** Live counts for the teaser page: real, active providers only (never demo agencies). */
export async function teaserStats() {
  const db = await getDb();
  const rows = await db
    .select({ country: agencies.country, city: agencies.city, kind: agencies.kind })
    .from(agencies)
    .where(and(eq(agencies.status, "active"), eq(agencies.isDemo, false)));
  return summariseProviders(rows);
}
