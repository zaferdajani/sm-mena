import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, auditLogs, profilePublications, type Agency } from "@/lib/db/schema";
import { canReadProfile, isRegistrationPhase, profileIndexable, PUBLICATION_CONSENT_VERSION, type ProfileVisibility } from "@/lib/launch-phase";

/** Legacy accounts keep their already-published links; new registration accounts get an explicit private row. */
export async function publicationFor(agencyId: string): Promise<{ visibility: ProfileVisibility; legacy: boolean }> {
  const db = await getDb();
  const [row] = await db.select().from(profilePublications).where(eq(profilePublications.agencyId, agencyId));
  return row ? { visibility: row.visibility, legacy: false } : { visibility: "public", legacy: true };
}
/** SQL boundary for bulk discovery; unlisted/private profiles never enter recommendations, counts or sitemaps. */
export const discoverableProfiles = () => sql`not exists (select 1 from ${profilePublications} where ${profilePublications.agencyId} = ${agencies.id} and ${profilePublications.visibility} <> 'public')`;

/** Who is reading: the signed-in user (if any) and whether they are staff. The web derives it from the cookie; the API from the bearer token. */
export type Viewer = { userId: string | null; staff: boolean };

export async function mayReadAgency(agency: Agency, viewer?: Viewer): Promise<boolean> {
  if (agency.status !== "active") return false;
  const { visibility } = await publicationFor(agency.id);
  if (visibility !== "private" && !(agency.isDemo && isRegistrationPhase())) return true;
  const who = viewer ?? (await (await import("@/lib/launch-access")).launchViewer());
  // Demo pages are examples only during registration: staff and the demo account itself (a fixture) still see them.
  if (agency.isDemo && isRegistrationPhase()) return who.staff || (who.userId !== null && who.userId === agency.ownerUserId);
  return canReadProfile(visibility, who.userId === agency.ownerUserId, who.staff);
}
export async function mayReadAgencyId(id: string, viewer?: Viewer): Promise<boolean> {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return false;
  const db = await getDb();
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, id));
  return Boolean(agency && await mayReadAgency(agency, viewer));
}
export async function visibleAgencyByHandle(handle: string): Promise<Agency | null> {
  const db = await getDb();
  const [agency] = await db.select().from(agencies).where(and(eq(agencies.handle, handle.toLowerCase()), eq(agencies.status, "active")));
  return agency && await mayReadAgency(agency) ? agency : null;
}
export async function mayIndexAgency(agency: Agency) {
  return agency.status === "active" && profileIndexable((await publicationFor(agency.id)).visibility, agency.isDemo);
}
/** Called only with the authenticated owner. Ownership is checked again inside the transaction. */
export async function setPublication(ownerUserId: string, agencyId: string, visibility: ProfileVisibility) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [agency] = await tx.select({ id: agencies.id }).from(agencies).where(and(eq(agencies.id, agencyId), eq(agencies.ownerUserId, ownerUserId), eq(agencies.status, "active"))).for("update");
    if (!agency) return false;
    await tx.insert(profilePublications).values({ agencyId, visibility, consentVersion: PUBLICATION_CONSENT_VERSION, updatedAt: new Date() })
      .onConflictDoUpdate({ target: profilePublications.agencyId, set: { visibility, consentVersion: PUBLICATION_CONSENT_VERSION, updatedAt: new Date() } });
    await tx.insert(auditLogs).values({ actorUserId: ownerUserId, action: "profile.publication_changed", entity: "agency", entityId: agencyId, meta: { visibility, version: PUBLICATION_CONSENT_VERSION } });
    return true;
  });
}
