from pathlib import Path
root=Path('.');p=root/'lib/data/portfolio-setup.ts';s=p.read_text();a=s.index('export async function addSetupMedia(');b=s.index('\n/** A staged image',a)
s=s[:a]+'''export async function addSetupMedia(agencyId: string, files: Buffer[], source: "upload" | "pdf"): Promise<SetupMediaView[] | { error: SetupError }> {
  if (!files.length || files.length > MAX_IMAGES_PER_POST) return { error: "tooMany" };
  const db = await getDb();
  const keys: string[] = [];
  try {
    // Validate the whole batch before writing anything; a bad second image
    // cannot leave an invisible, partly accepted first image in the draft.
    const processed = await Promise.all(files.map((file) => processImage(file)));
    const staged = [];
    for (const image of processed) {
      const id = randomUUID();
      const key = `drafts/${agencyId}/${id}.webp`;
      keys.push(key);
      await storage().put(key, image.full, "image/webp");
      staged.push({ id, agencyId, key, width: image.width, height: image.height, source });
    }
    await db.transaction(async (tx) => {
      const [draft] = await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update");
      if (!draft || draft.status === "finished") throw new SetupPublishConflict("done");
      const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, agencyId));
      if (n + staged.length > MAX_IMAGES_PER_POST) throw new SetupPublishConflict("tooMany");
      await tx.insert(portfolioSetupMedia).values(staged.map((image, position) => ({ ...image, position: n + position })));
      await tx.update(portfolioSetups).set({ version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() }).where(eq(portfolioSetups.agencyId, agencyId));
    });
    return await mediaOf(agencyId);
  } catch (error) {
    await storage().remove(keys).catch(() => undefined);
    return { error: error instanceof SetupPublishConflict ? error.code : "media" };
  }
}

export async function removeSetupMedia(agencyId: string, id: string): Promise<SetupMediaView[]> {
  const db = await getDb();
  const gone = await db.transaction(async (tx) => {
    const [draft] = await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update");
    if (!draft || draft.status === "finished") return null;
    const [removed] = await tx.delete(portfolioSetupMedia).where(and(eq(portfolioSetupMedia.id, id), eq(portfolioSetupMedia.agencyId, agencyId))).returning();
    if (removed) await tx.update(portfolioSetups).set({ version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() }).where(eq(portfolioSetups.agencyId, agencyId));
    return removed;
  });
  if (gone) await storage().remove([gone.key]).catch(() => undefined);
  return mediaOf(agencyId);
}

/** The cover and order are one write, serialized with media changes/publication. */
export async function orderSetupMedia(agencyId: string, ids: string[]): Promise<SetupMediaView[] | { error: SetupError }> {
  const db = await getDb();
  const result = await db.transaction(async (tx): Promise<{ error: SetupError } | null> => {
    const [draft] = await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update");
    if (!draft || draft.status === "finished") return { error: "invalid" };
    const current = await tx.select({ id: portfolioSetupMedia.id }).from(portfolioSetupMedia).where(eq(portfolioSetupMedia.agencyId, agencyId));
    if (ids.length !== current.length || new Set(ids).size !== ids.length || !ids.every((id) => current.some((m) => m.id === id))) return { error: "invalid" };
    for (const [position, id] of ids.entries()) {
      await tx.update(portfolioSetupMedia).set({ position }).where(and(eq(portfolioSetupMedia.id, id), eq(portfolioSetupMedia.agencyId, agencyId)));
    }
    await tx.update(portfolioSetups).set({ version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() }).where(eq(portfolioSetups.agencyId, agencyId));
    return null;
  });
  return result ?? mediaOf(agencyId);
}
''' +s[b:]
p.write_text(s)
p=root/'app/[locale]/(main)/portfolio-setup/actions.ts';s=p.read_text().replace('return "error" in result ? { error: result.error } : { media: result };','return "error" in result ? { error: result.error } : { media: result, view: (await getSetup(agency.id)) ?? undefined };')
s=s.replace('  return { media: await removeSetupMedia(agency.id, uuid.parse(id)) };','  const media = await removeSetupMedia(agency.id, uuid.parse(id));\n  return { media, view: (await getSetup(agency.id)) ?? undefined };')
s=s.replace('  const source = formData.get("source") === "pdf" ? "pdf" : "upload";','  const source = formData.get("source") === "pdf" ? "pdf" : "upload";\n  if (source === "pdf" && !(await canUse("portfolio_import"))) return { error: "unavailable" };')
s=s.replace('  if (!canCreatePost(entitlementsFor(agency), agency.postCount)) return { error: "limit" };','  const existing = await getSetup(agency.id);\n  if (!existing?.postId && !canCreatePost(entitlementsFor(agency), agency.postCount)) return { error: "limit" };')
p.write_text(s)
p=root/'components/setup/wizard.tsx';s=p.read_text().replace('run(() => chooseSourceAction(view.version, "pdf"));','run(() => chooseSourceAction(r.view?.version ?? view.version, "pdf"));').replace('setView({ ...view, media: r.media });','setView(r.view ?? { ...view, media: r.media });');p.write_text(s)
