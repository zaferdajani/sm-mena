import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { packages, type DeliverableLine, type Package, type PackageTranslation } from "@/lib/db/schema";

export const MAX_PACKAGES = 6;

export type PackageInput = {
  title: string;
  description: string;
  service: string;
  priceJod: number;
  billing: "monthly" | "one_off";
  deliverables: string[];
  items?: DeliverableLine[];
  deliveryDays?: number | null;
  /** Title, description and deliverables in the agency's other language. */
  translation?: PackageTranslation;
};

export async function listPackages(agencyId: string): Promise<Package[]> {
  const db = await getDb();
  return db.select().from(packages).where(eq(packages.agencyId, agencyId)).orderBy(asc(packages.position), asc(packages.createdAt));
}

export async function createPackage(agencyId: string, input: PackageInput) {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(packages).where(eq(packages.agencyId, agencyId));
  if (n >= MAX_PACKAGES) return null;
  const [row] = await db.insert(packages).values({ agencyId, ...input, position: n }).returning();
  return row;
}

export async function updatePackage(agencyId: string, packageId: string, input: PackageInput) {
  const db = await getDb();
  const [row] = await db.update(packages).set(input).where(and(eq(packages.id, packageId), eq(packages.agencyId, agencyId))).returning();
  return row ?? null;
}

export async function deletePackage(agencyId: string, packageId: string) {
  const db = await getDb();
  const rows = await db.delete(packages).where(and(eq(packages.id, packageId), eq(packages.agencyId, agencyId))).returning({ id: packages.id });
  return rows.length > 0;
}

/** Cheapest package per agency for a service (monthly and one-off alike). */
export async function cheapestPackages(agencyIds: string[], service?: string) {
  if (!agencyIds.length) return new Map<string, { priceJod: number; billing: Package["billing"]; title: string }>();
  const db = await getDb();
  const rows = await db
    .select()
    .from(packages)
    .where(service ? and(inArray(packages.agencyId, agencyIds), eq(packages.service, service)) : inArray(packages.agencyId, agencyIds))
    .orderBy(asc(packages.priceJod));
  const out = new Map<string, { priceJod: number; billing: Package["billing"]; title: string }>();
  for (const p of rows) if (!out.has(p.agencyId)) out.set(p.agencyId, { priceJod: p.priceJod, billing: p.billing, title: p.title });
  return out;
}

/** Package price range for a service across the market (for budget estimates). */
export async function packagePriceRange(service: string) {
  const db = await getDb();
  const [row] = await db
    .select({
      n: sql<number>`count(*)::int`,
      min: sql<number | null>`min(${packages.priceJod})`,
      median: sql<number | null>`percentile_cont(0.5) within group (order by ${packages.priceJod})`,
      max: sql<number | null>`max(${packages.priceJod})`,
    })
    .from(packages)
    .where(and(eq(packages.service, service), eq(packages.billing, "monthly")));
  return { ...row, median: row.median === null ? null : Math.round(Number(row.median)) };
}
