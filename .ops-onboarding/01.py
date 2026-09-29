from pathlib import Path
root=Path('.')
p=root/'lib/data/posts.ts'
s=p.read_text().replace('import { getDb } from "@/lib/db";', 'import { getDb, type DB } from "@/lib/db";')
start=s.index('export async function createPostFromProcessed(')
end=s.index('\nexport async function updatePost(',start)
s=s[:start]+'''/** Optional ownership/checkpoint work that must commit atomically with a new post.
 * Hooks are server-only capabilities supplied by internal callers, never form input.
 */
export type PostWriteTransaction = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type PostWriteHooks = {
  beforeInsert?: (tx: PostWriteTransaction) => Promise<void>;
  afterInsert?: (tx: PostWriteTransaction, post: typeof posts.$inferSelect) => Promise<void>;
};

export async function createPostFromProcessed(
  agencyId: string,
  input: PostInput,
  processed: ProcessedImage[],
  createdAt?: Date,
  hooks: PostWriteHooks = {},
) {
  const db = await getDb();
  const [agency] = await db.select({ name: agencies.name, translation: agencies.translation }).from(agencies).where(eq(agencies.id, agencyId));
  const uploaded: { key: string; thumbKey: string; image: ProcessedImage }[] = [];
  try {
    for (const image of processed) {
      const format = image.fullFormat ?? "webp";
      const keys = newImageKeys(agencyId, format);
      // Record both new keys first: a failed thumbnail upload must not orphan the full image.
      uploaded.push({ ...keys, image });
      await storage().put(keys.key, image.full, STORED_TYPE[format]);
      await storage().put(keys.thumbKey, image.thumb, "image/webp");
    }
    return await db.transaction(async (tx) => {
      await hooks.beforeInsert?.(tx);
      const [post] = await tx
        .insert(posts)
        .values({
          agencyId,
          caption: input.caption,
          services: input.services,
          platforms: input.platforms,
          industry: input.industry ?? null,
          result: input.result ?? null,
          clientId: input.clientId ?? null,
          app: input.app ?? null,
          sourceUrl: input.sourceUrl ?? null,
          sourceProvider: input.source?.provider ?? null,
          sourceItemId: input.source?.itemId ?? null,
          embed: input.source?.embed ?? null,
          translation: input.translation ?? {},
          searchText: postSearchText(input, agency),
          ...(createdAt ? { createdAt } : {}),
        })
        .returning();
      if (uploaded.length) await tx.insert(postImages).values(
        uploaded.map((u, position) => ({
          postId: post.id,
          position,
          key: u.key,
          thumbKey: u.thumbKey,
          width: u.image.width,
          height: u.image.height,
          color: u.image.color,
        })),
      );
      await tx
        .update(agencies)
        .set({ postCount: sql`${agencies.postCount} + 1` })
        .where(eq(agencies.id, agencyId));
      await hooks.afterInsert?.(tx, post);
      return post;
    });
  } catch (error) {
    // Only these newly generated keys belong to this failed attempt. Never remove existing media.
    await storage().remove(uploaded.flatMap((u) => [u.key, u.thumbKey])).catch(() => undefined);
    throw error;
  }
}
''' +s[end:]
p.write_text(s)
p=root/'lib/behance/import.ts';s=p.read_text().replace('createPostFromProcessed, type PostInput','createPostFromProcessed, type PostInput, type PostWriteHooks').replace('input: BehanceImportInput, fetcher = defaultFetcher())','input: BehanceImportInput, fetcher = defaultFetcher(), hooks: PostWriteHooks = {})').replace('processed, at);','processed, at, hooks);');p.write_text(s)
p=root/'lib/data/portfolio-setup.ts';s=p.read_text().replace('import { audit, updateAgency }','import { updateAgency }').replace('import { createPostFromProcessed }','import { createPostFromProcessed, type PostWriteHooks }').replace('import { portfolioSetupMedia, portfolioSetups, socialImportItems, type SetupDraftData }','import { auditLogs, portfolioClients, portfolioSetupMedia, portfolioSetups, socialGrants, socialImportItems, socialResources, type SetupDraftData }')
start=s.index('  // Claim the publish:')
end=s.index('\nasync function clearSetupMedia',start)
s=s[:start]+'''  const db = await getDb();
  // Keep the exact media reviewed by this version. A later draft's images must never be cleared.
  const staged = await db.select().from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, input.agencyId)).orderBy(asc(portfolioSetupMedia.position), asc(portfolioSetupMedia.createdAt));
  const stagedIds = staged.map((m) => m.id);
  const p = d.project!;
  const caption = [p.title.trim(), p.contribution.trim(), d.client?.mode === "personal" ? input.personalLabel : ""].filter(Boolean).join("\\n\\n").slice(0, 2200);
  const fields = { caption, services: p.services, platforms: [] as string[], industry: null, result: null, clientId };
  const hooks: PostWriteHooks = {
    beforeInsert: async (tx) => {
      // Authorization/revocation always lock the grant before its resources/items.
      // Holding the same lock until insertion commits prevents a disconnect from
      // missing a concurrently published player, without calling the provider here.
      if (social && d.socialItemId) {
        const [source] = await tx.select({ grantId: socialResources.grantId })
          .from(socialImportItems).innerJoin(socialResources, eq(socialResources.id, socialImportItems.resourceId))
          .where(and(eq(socialImportItems.id, d.socialItemId), eq(socialImportItems.agencyId, input.agencyId), eq(socialResources.agencyId, input.agencyId)));
        if (!source) throw new SetupPublishConflict("item");
        const [grant] = await tx.select().from(socialGrants)
          .where(and(eq(socialGrants.id, source.grantId), eq(socialGrants.agencyId, input.agencyId))).for("update");
        if (!grant || !["active", "limited"].includes(grant.status)) throw new SetupPublishConflict("item");
        const [item] = await tx.select({ id: socialImportItems.id }).from(socialImportItems)
          .innerJoin(socialResources, eq(socialResources.id, socialImportItems.resourceId))
          .where(and(eq(socialImportItems.id, d.socialItemId), eq(socialImportItems.agencyId, input.agencyId), eq(socialResources.status, "selected"), eq(socialResources.grantId, grant.id),
            sql`${socialImportItems.fetchedAt} > now() - interval '30 days'`));
        if (!item) throw new SetupPublishConflict("item");
      }
      // The version claim is in the SAME transaction as post, images, count,
      // final draft checkpoint and audit. A reload never observes an intermediate
      // writable version, and an interrupted insertion rolls the whole claim back.
      const [claimed] = await tx.update(portfolioSetups)
        .set({ version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() })
        .where(and(eq(portfolioSetups.agencyId, input.agencyId), eq(portfolioSetups.version, input.version), isNull(portfolioSetups.postId), ne(portfolioSetups.status, "finished")))
        .returning({ version: portfolioSetups.version });
      if (!claimed) throw new SetupPublishConflict("stale");
      if (clientId) {
        const [client] = await tx.select({ id: portfolioClients.id }).from(portfolioClients)
          .where(and(eq(portfolioClients.id, clientId), eq(portfolioClients.agencyId, input.agencyId)));
        if (!client) throw new SetupPublishConflict("client");
      }
      const currentMedia = await tx.select({ id: portfolioSetupMedia.id }).from(portfolioSetupMedia)
        .where(eq(portfolioSetupMedia.agencyId, input.agencyId)).orderBy(asc(portfolioSetupMedia.position), asc(portfolioSetupMedia.createdAt));
      if (currentMedia.map((m) => m.id).join() !== stagedIds.join()) throw new SetupPublishConflict("stale");
    },
    afterInsert: async (tx, post) => {
      await tx.update(portfolioSetups).set({ postId: post.id, status: "finished", step: SETUP_STEPS, updatedAt: new Date() })
        .where(eq(portfolioSetups.agencyId, input.agencyId));
      if (social && d.socialItemId) await tx.update(socialImportItems).set({ state: "published", postId: post.id })
        .where(and(eq(socialImportItems.id, d.socialItemId), eq(socialImportItems.agencyId, input.agencyId)));
      if (stagedIds.length) await tx.delete(portfolioSetupMedia)
        .where(and(eq(portfolioSetupMedia.agencyId, input.agencyId), inArray(portfolioSetupMedia.id, stagedIds)));
      await tx.insert(auditLogs).values({ actorUserId: input.userId, action: "setup.publish", entity: "post", entityId: post.id,
        meta: { source: d.source ?? "upload", client: d.client?.mode ?? "none" } });
    },
  };
  try {
    let postId: string;
    if (d.source === "behance" && d.behance) {
      const post = await importBehanceProject(input.agencyId, { projectUrl: d.behance.projectUrl, images: d.behance.images, publishedAt: d.behance.publishedAt ? new Date(d.behance.publishedAt) : null, ...fields }, undefined, hooks);
      postId = post.id;
    } else {
      const processed: ProcessedImage[] = [];
      for (const m of staged) {
        const buf = await storage().get(m.key);
        if (!buf) return { error: "media" };
        processed.push(await processImage(buf));
      }
      const post = await createPostFromProcessed(input.agencyId, {
        ...fields, sourceUrl: social?.permalink ?? null,
        source: social ? { provider: social.provider, itemId: social.itemId, embed: social.embed } : null,
      }, processed, undefined, hooks);
      postId = post.id;
    }
    // Best-effort bytes cleanup cannot convert a successfully committed project
    // into an error. The database no longer offers these staged URLs to anyone.
    await storage().remove(staged.map((m) => m.key)).catch(() => undefined);
    return { postId };
  } catch (e) {
    if (e instanceof SetupPublishConflict) {
      const latest = await row(input.agencyId);
      if (e.code === "stale" && latest?.postId) return { postId: latest.postId };
      return { error: e.code };
    }
    if (e instanceof Error && /posts_source_item_idx|duplicate key/i.test(`${e.message} ${(e as { cause?: Error }).cause?.message ?? ""}`)) return { error: "duplicate" };
    if (e instanceof BehanceImportError) return { error: "behance" };
    return { error: "generic" };
  }
}

class SetupPublishConflict extends Error {
  constructor(public readonly code: SetupError) { super(code); }
}
''' +s[end:]
p.write_text(s)
