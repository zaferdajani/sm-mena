import { readFileSync } from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, prospects, type Prospect } from "@/lib/db/schema";
import { prospectKey, type ProspectInput, type ProspectPatch } from "@/lib/prospects";
import { audit } from "./agencies";

// Admin → Prospects (docs/55): who to invite at launch and where each contact stands.

export type ProspectRow = Prospect & { agencyHandle: string | null };

export async function listProspects(): Promise<ProspectRow[]> {
  const db = await getDb();
  const rows = await db
    .select({ prospect: prospects, agencyHandle: agencies.handle })
    .from(prospects)
    .leftJoin(agencies, eq(prospects.agencyId, agencies.id))
    .orderBy(desc(prospects.priority), asc(prospects.status), asc(prospects.name));
  return rows.map((r) => ({ ...r.prospect, agencyHandle: r.agencyHandle }));
}

export async function addProspect(input: ProspectInput, by: string | null, source = "owner"): Promise<{ prospect: Prospect; created: boolean }> {
  const db = await getDb();
  const nameKey = prospectKey(input.name);
  const [existing] = await db.select().from(prospects).where(eq(prospects.nameKey, nameKey));
  if (existing) return { prospect: existing, created: false };
  const [row] = await db
    .insert(prospects)
    .values({
      name: input.name,
      nameKey,
      website: input.website || null,
      instagram: input.instagram || null,
      city: input.city,
      services: input.services,
      note: input.note || null,
      priority: input.priority,
      source,
      createdBy: by,
    })
    .onConflictDoNothing({ target: prospects.nameKey })
    .returning();
  if (!row) {
    const [raced] = await db.select().from(prospects).where(eq(prospects.nameKey, nameKey));
    return { prospect: raced, created: false };
  }
  await audit(by, "prospect.added", "prospect", row.id, { source });
  return { prospect: row, created: true };
}

export async function updateProspect(id: string, patch: ProspectPatch, by: string): Promise<boolean> {
  const db = await getDb();
  const set: Partial<typeof prospects.$inferInsert> = { updatedAt: new Date() };
  if (patch.status !== undefined) {
    set.status = patch.status;
    if (patch.status === "contacted") set.contactedAt = new Date();
  }
  if (patch.note !== undefined) set.note = patch.note || null;
  if (patch.priority !== undefined) set.priority = patch.priority;
  if (patch.website !== undefined) set.website = patch.website || null;
  if (patch.instagram !== undefined) set.instagram = patch.instagram || null;
  const [row] = await db.update(prospects).set(set).where(eq(prospects.id, id)).returning({ id: prospects.id });
  if (!row) return false;
  await audit(by, "prospect.updated", "prospect", id, { fields: Object.keys(patch) });
  return true;
}

export async function removeProspect(id: string, by: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db.delete(prospects).where(eq(prospects.id, id)).returning({ id: prospects.id, name: prospects.name });
  if (!row) return false;
  await audit(by, "prospect.removed", "prospect", id, { name: row.name });
  return true;
}

/** A prospect that signed up: link it so the list shows the page (matched by website host or handle, never by guessing). */
export async function linkJoinedProspects(): Promise<number> {
  const db = await getDb();
  const open = await db.select().from(prospects).where(and(eq(prospects.status, "new"), sql`${prospects.agencyId} is null`));
  let linked = 0;
  for (const p of open) {
    if (!p.website) continue;
    const host = new URL(p.website).hostname.replace(/^www\./, "");
    const [agency] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(and(eq(agencies.isDemo, false), sql`lower(${agencies.website}) like ${"%" + host + "%"}`));
    if (!agency) continue;
    await db.update(prospects).set({ agencyId: agency.id, status: "joined", updatedAt: new Date() }).where(eq(prospects.id, p.id));
    linked++;
  }
  return linked;
}

type ResearchFile = { researchedOn: string; country: string; prospects: (ProspectInput & { source: string })[] };

export function researchedProspects(): ResearchFile {
  return JSON.parse(readFileSync(path.join(process.cwd(), "data", "prospects-jordan.json"), "utf8")) as ResearchFile;
}

/** Adds the researched list (data/prospects-jordan.json) without touching rows that already exist. */
export async function importResearched(by: string | null): Promise<{ added: number; skipped: number }> {
  const file = researchedProspects();
  let added = 0;
  let skipped = 0;
  for (const p of file.prospects) {
    const { source, ...input } = p;
    const r = await addProspect({ ...input, website: input.website ?? "", instagram: input.instagram ?? "", note: input.note ?? "", city: input.city ?? "amman", services: input.services ?? [], priority: input.priority ?? false }, by, source);
    if (r.created) added++;
    else skipped++;
  }
  if (added) await audit(by, "prospect.imported", "prospect", undefined, { added, skipped, researchedOn: file.researchedOn });
  return { added, skipped };
}
