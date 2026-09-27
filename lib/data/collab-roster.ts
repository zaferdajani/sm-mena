import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, collabRoster, type CollabRosterEntry } from "@/lib/db/schema";
import { mediaUrl } from "@/lib/storage";

// The private roster (docs/48 §roster): the owner's own notes about
// providers. Only the owner ever reads a row; the provider is never told.

export type RosterInput = { providerAgencyId: string; groupName: string; tags: string[]; notes: string; rateFils: number | null; rateUnit: string | null; rateCurrency: string | null };

export type RosterRow = CollabRosterEntry & { provider: { id: string; handle: string; name: string; kind: "agency" | "freelancer"; city: string; country: string; avatarUrl: string | null; status: string } };

export async function saveRosterEntry(ownerId: string, input: RosterInput) {
  if (input.providerAgencyId === ownerId) return null;
  const db = await getDb();
  const [exists] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.id, input.providerAgencyId));
  if (!exists) return null;
  const set = { groupName: input.groupName, tags: input.tags, notes: input.notes, rateFils: input.rateFils, rateUnit: input.rateFils === null ? null : input.rateUnit, rateCurrency: input.rateFils === null ? null : input.rateCurrency, updatedAt: new Date() };
  const [row] = await db
    .insert(collabRoster)
    .values({ ownerAgencyId: ownerId, providerAgencyId: input.providerAgencyId, ...set })
    .onConflictDoUpdate({ target: [collabRoster.ownerAgencyId, collabRoster.providerAgencyId], set })
    .returning();
  return row;
}

export async function removeRosterEntry(ownerId: string, providerId: string) {
  const db = await getDb();
  const rows = await db.delete(collabRoster).where(and(eq(collabRoster.ownerAgencyId, ownerId), eq(collabRoster.providerAgencyId, providerId))).returning({ id: collabRoster.id });
  return rows.length > 0;
}

/** Only the owner's rows, with the provider's public card (never the provider's private data). */
export async function listRoster(ownerId: string): Promise<RosterRow[]> {
  const db = await getDb();
  const rows = await db.select().from(collabRoster).where(eq(collabRoster.ownerAgencyId, ownerId)).orderBy(asc(collabRoster.groupName), asc(collabRoster.createdAt)).limit(300);
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.providerAgencyId))];
  const providers = new Map((await db.select().from(agencies).where(inArray(agencies.id, ids))).map((a) => [a.id, a]));
  return rows.flatMap((r) => {
    const a = providers.get(r.providerAgencyId);
    return a ? [{ ...r, provider: { id: a.id, handle: a.handle, name: a.name, kind: a.kind, city: a.city, country: a.country, avatarUrl: mediaUrl(a.avatarKey), status: a.status } }] : [];
  });
}

export async function rosterIds(ownerId: string): Promise<Set<string>> {
  const db = await getDb();
  return new Set((await db.select({ id: collabRoster.providerAgencyId }).from(collabRoster).where(eq(collabRoster.ownerAgencyId, ownerId))).map((r) => r.id));
}

export async function touchRoster(ownerId: string, providerId: string, at = new Date()) {
  const db = await getDb();
  await db.update(collabRoster).set({ lastEngagedAt: at }).where(and(eq(collabRoster.ownerAgencyId, ownerId), eq(collabRoster.providerAgencyId, providerId)));
}
