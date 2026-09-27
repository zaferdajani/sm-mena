import "server-only";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, collabBlocks } from "@/lib/db/schema";

// A provider that blocks another receives nothing from it and is not shown
// to it (docs/48). Blocks are private to the blocker.

export async function blockProvider(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) return false;
  const db = await getDb();
  const [exists] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.id, blockedId));
  if (!exists) return false;
  await db.insert(collabBlocks).values({ blockerAgencyId: blockerId, blockedAgencyId: blockedId }).onConflictDoNothing();
  return true;
}

export async function unblockProvider(blockerId: string, blockedId: string) {
  const db = await getDb();
  await db.delete(collabBlocks).where(and(eq(collabBlocks.blockerAgencyId, blockerId), eq(collabBlocks.blockedAgencyId, blockedId)));
}

/** Every provider that either side blocked: neither may reach the other. */
export async function blockedSet(agencyId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select().from(collabBlocks).where(or(eq(collabBlocks.blockerAgencyId, agencyId), eq(collabBlocks.blockedAgencyId, agencyId)));
  return new Set(rows.map((r) => (r.blockerAgencyId === agencyId ? r.blockedAgencyId : r.blockerAgencyId)));
}

export async function isBlockedEitherWay(a: string, b: string) {
  return (await blockedSet(a)).has(b);
}

/** The blocker's own list, with the public name only. */
export async function myBlocks(agencyId: string) {
  const db = await getDb();
  return db
    .select({ blockedAgencyId: collabBlocks.blockedAgencyId, name: agencies.name, handle: agencies.handle })
    .from(collabBlocks)
    .innerJoin(agencies, eq(collabBlocks.blockedAgencyId, agencies.id))
    .where(eq(collabBlocks.blockerAgencyId, agencyId));
}
