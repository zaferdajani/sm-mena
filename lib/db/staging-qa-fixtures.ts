import "server-only";
import { and, eq, like, ne, or, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, auditLogs, profilePublications } from "@/lib/db/schema";
import { PUBLICATION_CONSENT_VERSION } from "@/lib/launch-phase";
import { assertStagingDatabase } from "@/lib/core/rules/staging";

/**
 * Staging only (QA H-05): agencies a tester signs up with a `qa.` handle are test fixtures, not
 * agencies. They are made private so they never show on staging Explore or as public profiles.
 * Nothing is deleted. Runs on every staging build (lib/db/staging-refresh.ts); a page already
 * private is left alone. Returns how many pages it hid.
 */
export async function hideQaFixtures(): Promise<number> {
  assertStagingDatabase();
  const db = await getDb();
  const rows = await db
    .select({ id: agencies.id })
    .from(agencies)
    .leftJoin(profilePublications, eq(profilePublications.agencyId, agencies.id))
    .where(and(like(agencies.handle, "qa.%"), or(isNull(profilePublications.visibility), ne(profilePublications.visibility, "private"))));
  for (const { id } of rows) {
    await db.insert(profilePublications).values({ agencyId: id, visibility: "private", consentVersion: PUBLICATION_CONSENT_VERSION, updatedAt: new Date() })
      .onConflictDoUpdate({ target: profilePublications.agencyId, set: { visibility: "private", updatedAt: new Date() } });
    await db.insert(auditLogs).values({ action: "staging.qa_fixture_hidden", entity: "agency", entityId: id, meta: { reason: "qa. handle on staging" } });
  }
  return rows.length;
}
