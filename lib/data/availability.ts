import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, auditLogs } from "@/lib/db/schema";

// "Open to new projects" (docs/65). Off keeps the page listed and reachable; it only leaves the
// matchmaker's and the owner-matching recommendations. Every change is the owner's and is audited.

/** SQL boundary for recommendations: a page that is not taking new projects is never suggested. */
export const openToProjects = () => eq(agencies.acceptingProjects, true);

export async function setAcceptingProjects(ownerUserId: string, agencyId: string, accepting: boolean): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .update(agencies)
    .set({ acceptingProjects: accepting, acceptingUpdatedAt: new Date() })
    .where(and(eq(agencies.id, agencyId), eq(agencies.ownerUserId, ownerUserId), eq(agencies.status, "active")))
    .returning({ id: agencies.id });
  if (!row) return false;
  await db.insert(auditLogs).values({ actorUserId: ownerUserId, action: "agency.availability", entity: "agency", entityId: agencyId, meta: { accepting } });
  return true;
}
