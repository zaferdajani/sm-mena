import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, posts } from "@/lib/db/schema";
import { getPostsByIds, type PostView } from "@/lib/data/posts";

/**
 * Real examples for the first-run setup (docs/53): published projects of the
 * demo agencies that are filed under a client, so a new provider sees an
 * actual page (agency, client, images, caption) rather than placeholders.
 * The demo agencies are fictional and labelled as such wherever shown; one
 * project per agency, the most varied services first.
 */
export async function setupExamples(limit = 4): Promise<PostView[]> {
  const db = await getDb();
  const rows = await db
    .select({ id: posts.id, agencyId: posts.agencyId, services: posts.services })
    .from(posts)
    .innerJoin(agencies, eq(posts.agencyId, agencies.id))
    .where(and(eq(agencies.isDemo, true), eq(agencies.status, "active"), eq(posts.status, "published"), isNotNull(posts.clientId)))
    .orderBy(desc(posts.createdAt))
    .limit(60);
  const picked: typeof rows = [];
  const seenAgency = new Set<string>();
  const seenService = new Set<string>();
  // First pass: different agencies and different lead services; second pass fills up.
  for (const pass of [true, false]) {
    for (const r of rows) {
      if (picked.length >= limit || seenAgency.has(r.agencyId)) continue;
      const lead = r.services[0] ?? "";
      if (pass && seenService.has(lead)) continue;
      picked.push(r);
      seenAgency.add(r.agencyId);
      seenService.add(lead);
    }
  }
  return getPostsByIds(picked.map((r) => r.id));
}
