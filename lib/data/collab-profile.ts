import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { collabProfiles, type CollabProfile } from "@/lib/db/schema";
import { CONSENT_VERSION, type CollabMode, type WorkMode } from "@/lib/collab/types";

// A provider's collaboration preference (docs/48). No row = unknown; the
// discovery rules treat unknown as "ask", never as "yes".

export async function getCollabProfile(agencyId: string): Promise<CollabProfile | null> {
  const db = await getDb();
  const [row] = await db.select().from(collabProfiles).where(eq(collabProfiles.agencyId, agencyId));
  return row ?? null;
}

export async function saveCollabProfile(agencyId: string, input: { modes: CollabMode[]; workModes: WorkMode[]; openToWork: boolean | null }) {
  const db = await getDb();
  const values = { agencyId, modes: input.modes, workModes: input.workModes, openToWork: input.openToWork, consentVersion: CONSENT_VERSION, updatedAt: new Date() };
  const [row] = await db.insert(collabProfiles).values(values).onConflictDoUpdate({ target: collabProfiles.agencyId, set: values }).returning();
  return row;
}
