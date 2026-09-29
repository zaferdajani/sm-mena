from pathlib import Path
p=Path('lib/data/social.ts');s=p.read_text().replace('and, eq, inArray, isNull, lt, sql','and, eq, gt, inArray, isNull, lt, notInArray, sql')
a=s.index('async function markGrant('); b=s.index('\nconst today =',a)
s=s[:a]+'''async function markGrant(grantId: string, status: "expired" | "limited" | "revoked" | "failed", reason: string, version: number) {
  const db = await getDb();
  await db.update(socialGrants).set({ status, statusReason: reason, updatedAt: new Date() })
    .where(and(eq(socialGrants.id, grantId), eq(socialGrants.version, version), notInArray(socialGrants.status, ["revoked", "revoke_pending"])));
}

/** Serialize refresh itself, not merely the final token write. The provider's
 * rotating refresh token must never be sent by two concurrent workers.
 * All DB work in this transaction uses tx; provider calls have bounded timeouts.
 */
async function grantToken(snapshot: typeof socialGrants.$inferSelect): Promise<{ token: string; version: number }> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [grant] = await tx.select().from(socialGrants)
      .where(and(eq(socialGrants.id, snapshot.id), eq(socialGrants.agencyId, snapshot.agencyId))).for("update");
    if (!grant || ["revoked", "revoke_pending"].includes(grant.status)) throw new ProviderError("permission");
    const ctx = grantCtx(grant.id, grant.provider, grant.agencyId);
    const access = openToken(grant.sealedAccess, { ...ctx, purpose: "access" });
    if (!access) throw new ProviderError("expired");
    const soon = grant.accessExpiresAt && grant.accessExpiresAt.getTime() < Date.now() + 5 * 60_000;
    const adapter = ADAPTERS[grant.provider];
    if (!soon || !adapter.refresh) return { token: access, version: grant.version };
    if (grant.refreshExpiresAt && grant.refreshExpiresAt.getTime() <= Date.now()) throw new ProviderError("expired");
    const refreshToken = openToken(grant.sealedRefresh, { ...ctx, purpose: "refresh" });
    const config = adapterConfig(grant.provider);
    if (!config) throw new ProviderError("unavailable");
    if (!refreshToken && grant.provider !== "instagram") throw new ProviderError("expired");
    const next = await adapter.refresh(config, refreshToken ?? access, access);
    await tx.update(socialGrants).set({
      sealedAccess: sealToken(next.accessToken, { ...ctx, purpose: "access" }),
      ...(next.refreshToken ? { sealedRefresh: sealToken(next.refreshToken, { ...ctx, purpose: "refresh" }) } : {}),
      accessExpiresAt: next.expiresIn ? new Date(Date.now() + next.expiresIn * 1000) : null,
      ...(next.refreshExpiresIn ? { refreshExpiresAt: new Date(Date.now() + next.refreshExpiresIn * 1000) } : {}),
      version: grant.version + 1, lastVerifiedAt: new Date(), updatedAt: new Date(),
    }).where(and(eq(socialGrants.id, grant.id), eq(socialGrants.agencyId, grant.agencyId), eq(socialGrants.version, grant.version)));
    return { token: next.accessToken, version: grant.version + 1 };
  });
}
''' +s[b:]
a=s.index('  try {\n    const token = resource.sealedToken');b=s.index('\n/** The offered item',a)
s=s[:a]+'''  let requestVersion = grant.version;
  try {
    const current = await grantToken(grant);
    requestVersion = current.version;
    const token = resource.sealedToken
      ? openToken(resource.sealedToken, { owner: `${grant.id}:${resource.providerResourceId}`, provider: resource.provider, agencyId, purpose: "page" })
      : current.token;
    if (!token) throw new ProviderError("expired");
    const page = await adapter.listItems(config, token, { kind: resource.kind, id: resource.providerResourceId }, cursor && cursor.length <= 300 ? cursor : null);
    const db = await getDb();
    const out = await db.transaction(async (tx) => {
      const [stillAuthorized] = await tx.select().from(socialGrants)
        .where(and(eq(socialGrants.id, grant.id), eq(socialGrants.agencyId, agencyId))).for("update");
      if (!stillAuthorized || stillAuthorized.version !== requestVersion || ["revoked", "revoke_pending"].includes(stillAuthorized.status)) throw new ProviderError("permission");
      const [stillSelected] = await tx.select({ id: socialResources.id }).from(socialResources)
        .where(and(eq(socialResources.id, resourceId), eq(socialResources.agencyId, agencyId), eq(socialResources.grantId, grant.id), eq(socialResources.status, "selected")));
      if (!stillSelected) throw new ProviderError("permission");
      const offered: OfferedItem[] = [];
      for (const item of page.items.slice(0, 30)) {
        if (!item.displayable) {
          // A disabled button is not authorization. Keep unembeddable/private
          // items out of the selectable table, and invalidate an earlier offer.
          await tx.delete(socialImportItems).where(and(eq(socialImportItems.agencyId, agencyId), eq(socialImportItems.provider, resource.provider), eq(socialImportItems.providerItemId, item.id)));
          await tx.update(posts).set({ embed: null }).where(and(eq(posts.agencyId, agencyId), eq(posts.sourceProvider, resource.provider), eq(posts.sourceItemId, item.id)));
          offered.push({ ...item, rowId: `unavailable:${item.id}`, state: "dismissed", postId: null });
          continue;
        }
        const [saved] = await tx.insert(socialImportItems)
          .values({ agencyId, resourceId, provider: resource.provider, providerItemId: item.id, mediaKind: item.mediaKind, title: item.title, caption: item.caption, permalink: item.permalink, thumbnailUrl: item.thumbnailUrl, publishedAt: item.publishedAt ? new Date(item.publishedAt) : null })
          .onConflictDoUpdate({
            target: [socialImportItems.agencyId, socialImportItems.provider, socialImportItems.providerItemId],
            set: { resourceId, title: item.title, caption: item.caption, permalink: item.permalink, thumbnailUrl: item.thumbnailUrl, fetchedAt: new Date() },
          }).returning();
        offered.push({ ...item, rowId: saved.id, state: saved.state, postId: saved.postId });
      }
      await tx.update(socialGrants).set({ lastVerifiedAt: new Date(), status: stillAuthorized.status === "expired" ? "active" : stillAuthorized.status })
        .where(and(eq(socialGrants.id, grant.id), eq(socialGrants.version, requestVersion)));
      return offered;
    });
    return { items: out, next: page.next };
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : "unavailable";
    // Neither stale successful responses nor errors can reopen a disconnected
    // grant or overwrite the health of a newer authorization.
    if (code === "expired") await markGrant(grant.id, "expired", "expired", requestVersion);
    if (code === "permission") await markGrant(grant.id, "limited", "permission", requestVersion);
    return { error: code === "quota" ? "quota" : code === "expired" ? "expired" : code === "permission" ? "permission" : "failed" };
  }
}
''' +s[b:]
s=s.replace('export async function getItemForAgency(agencyId: string, itemRowId: string) {\n  const db', 'export async function getItemForAgency(agencyId: string, itemRowId: string) {\n  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemRowId)) return null;\n  const db')
s=s.replace('.innerJoin(socialResources, eq(socialResources.id, socialImportItems.resourceId))\n    .where(and(eq(socialImportItems.id, itemRowId), eq(socialImportItems.agencyId, agencyId), eq(socialResources.agencyId, agencyId), eq(socialResources.status, "selected")))', '.innerJoin(socialResources, eq(socialResources.id, socialImportItems.resourceId))\n    .innerJoin(socialGrants, eq(socialGrants.id, socialResources.grantId))\n    .where(and(eq(socialImportItems.id, itemRowId), eq(socialImportItems.agencyId, agencyId), eq(socialResources.agencyId, agencyId), eq(socialGrants.agencyId, agencyId), eq(socialResources.status, "selected"), inArray(socialGrants.status, ["active", "limited"]), gt(socialImportItems.fetchedAt, new Date(Date.now() - 30 * 86_400_000))))')
s=s.replace('await removeGrantData(grant.id, agencyId, grant.provider, "revoke_pending", "disconnecting");','const removedVersion = await removeGrantData(grant.id, agencyId, grant.provider, "revoke_pending", "disconnecting");')
s=s.replace('}).where(eq(socialGrants.id, grant.id));\n  return { ok: true, remote };', '}).where(and(eq(socialGrants.id, grant.id), eq(socialGrants.agencyId, agencyId), eq(socialGrants.version, removedVersion), eq(socialGrants.status, "revoke_pending")));\n  return { ok: true, remote };')
s=s.replace('  await db.transaction(async (tx) => {\n    const resourceIds', '''  return db.transaction(async (tx) => {
    // Acquire the same first lock used by refresh, source persistence and
    // setup publication, then invalidate every outstanding version.
    const [removed] = await tx.update(socialGrants)
      .set({ sealedAccess: null, sealedRefresh: null, scopes: [], status, statusReason: reason, version: sql`${socialGrants.version} + 1`, updatedAt: new Date() })
      .where(and(eq(socialGrants.id, grantId), eq(socialGrants.agencyId, agencyId))).returning({ version: socialGrants.version });
    if (!removed) return -1;
    const resourceIds''')
s=s.replace('    await tx.update(socialGrants).set({ sealedAccess: null, sealedRefresh: null, scopes: [], status, statusReason: reason, updatedAt: new Date() }).where(eq(socialGrants.id, grantId));','    return removed.version;')
p.write_text(s)
