import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { collabPrefs, type CollabPrefs } from "@/lib/db/schema";
import { REMINDER_KINDS } from "@/lib/collab/next-actions";

/** Collaboration reminder preferences (docs/50): which reminder kinds are muted and the agency's quiet hours. */
export async function getPrefs(agencyId: string): Promise<CollabPrefs> {
  const db = await getDb();
  const [row] = await db.select().from(collabPrefs).where(eq(collabPrefs.agencyId, agencyId));
  return row ?? { agencyId, mutedKinds: [], quietStart: null, quietEnd: null, showFeedback: true, updatedAt: new Date(0) };
}

export async function savePrefs(agencyId: string, input: { mutedKinds: string[]; quietStart: number | null; quietEnd: number | null }) {
  const db = await getDb();
  const values = { mutedKinds: input.mutedKinds.filter((k) => (REMINDER_KINDS as string[]).includes(k)), quietStart: input.quietStart, quietEnd: input.quietEnd, updatedAt: new Date() };
  await db.insert(collabPrefs).values({ agencyId, ...values }).onConflictDoUpdate({ target: collabPrefs.agencyId, set: values });
}
