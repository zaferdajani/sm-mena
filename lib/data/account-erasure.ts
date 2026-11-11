import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, portfolioClients, portfolioSetupMedia, postImages, posts } from "@/lib/db/schema";
import { storage } from "@/lib/storage";

// Closing an account erases the files its holder uploaded (docs/08, PDPL art. 18 / GDPR art. 17):
// avatar, post images and thumbnails, client logos and staged setup images. Contracts, the ledger
// and work-order deliverables shared with a counterparty stay (legal duty, docs/32).

/** Deletes the agency's published posts (and their images) and every stored file it owns. Returns the number of files removed. */
export async function eraseAgencyFiles(agencyId: string) {
  const db = await getDb();
  const [agency] = await db.select({ avatarKey: agencies.avatarKey }).from(agencies).where(eq(agencies.id, agencyId));
  if (!agency) return 0;
  const postIds = (await db.select({ id: posts.id }).from(posts).where(eq(posts.agencyId, agencyId))).map((p) => p.id);
  const images = postIds.length ? await db.select({ key: postImages.key, thumbKey: postImages.thumbKey }).from(postImages).where(inArray(postImages.postId, postIds)) : [];
  const logos = await db.select({ key: portfolioClients.logoKey }).from(portfolioClients).where(eq(portfolioClients.agencyId, agencyId));
  const staged = await db.select({ key: portfolioSetupMedia.key }).from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, agencyId));
  const keys = [
    ...(agency.avatarKey ? [agency.avatarKey] : []),
    ...images.flatMap((i) => [i.key, i.thumbKey]),
    ...logos.flatMap((l) => (l.key ? [l.key] : [])),
    ...staged.map((s) => s.key),
  ];
  await db.transaction(async (tx) => {
    if (postIds.length) await tx.delete(posts).where(inArray(posts.id, postIds));
    await tx.delete(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, agencyId));
    await tx.update(portfolioClients).set({ logoKey: null }).where(eq(portfolioClients.agencyId, agencyId));
    await tx.update(agencies).set({ avatarKey: null }).where(eq(agencies.id, agencyId));
  });
  // Database first, files after: a failed delete leaves an orphan file, never a dangling row.
  if (keys.length) await storage().remove(keys).catch(() => undefined);
  return keys.length;
}
