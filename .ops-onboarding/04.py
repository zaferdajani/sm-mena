from pathlib import Path
root=Path('.')
p=root/'lib/data/agencies.ts';s=p.read_text().replace('import { getDb } from "@/lib/db";', 'import { getDb, type DB } from "@/lib/db";');s=s.replace('input: Partial<AgencyInput> & { avatarKey?: string | null }) {\n  const db = await getDb();','input: Partial<AgencyInput> & { avatarKey?: string | null }, connection?: Pick<DB, "select" | "update">) {\n  const db = connection ?? await getDb();');p.write_text(s)
p=root/'lib/data/portfolio-clients.ts';s=p.read_text().replace('import { getDb } from "@/lib/db";', 'import { getDb, type DB } from "@/lib/db";');s=s.replace('raw: ClientInput): Promise<ClientError | { ok: true; id: string }> {','raw: ClientInput, connection?: Pick<DB, "select" | "insert" | "update">): Promise<ClientError | { ok: true; id: string }> {');s=s.replace('  const cleaned = clean(raw);\n  if ("error" in cleaned) return cleaned;\n  const db = await getDb();','  const cleaned = clean(raw);\n  if ("error" in cleaned) return cleaned;\n  const db = connection ?? await getDb();');p.write_text(s)
p=root/'lib/data/portfolio-setup.ts';s=p.read_text().replace('getClient, listClients, saveClient','getClient, saveClient').replace('import { auditLogs,','import { agencies, auditLogs,')
s=s.replace('  input: { name?: string; bio?: string; services?: string[]; pendingServices?: number[]; avatar?: Buffer | null },\n): Promise<{ ok: true; changed: string[] } | { error: "avatar" }> {','  input: { name?: string; bio?: string; services?: string[]; pendingServices?: number[]; avatar?: Buffer | null },\n  checkpoint?: { version: number; userId: string },\n): Promise<{ ok: true; changed: string[] } | { error: "avatar" | "stale" }> {')
s=s.replace('''  if (Object.keys(patch).length) await updateAgency(agency.id, patch);
  if (avatarKey && agency.avatarKey)''','''  try {
    if (checkpoint) {
      const db = await getDb();
      await db.transaction(async (tx) => {
        const [claimed] = await tx.update(portfolioSetups)
          .set({ step: 2, status: "in_progress", version: sql`${portfolioSetups.version} + 1`, updatedAt: new Date() })
          .where(and(eq(portfolioSetups.agencyId, agency.id), eq(portfolioSetups.version, checkpoint.version), ne(portfolioSetups.status, "finished"))).returning({ agencyId: portfolioSetups.agencyId });
        if (!claimed) throw new SetupPublishConflict("stale");
        if (Object.keys(patch).length) await updateAgency(agency.id, patch, tx);
        if (changed.length) await tx.insert(auditLogs).values({ actorUserId: checkpoint.userId, action: "agency.update", entity: "agency", entityId: agency.id, meta: { via: "setup", fields: changed } });
      });
    } else if (Object.keys(patch).length) await updateAgency(agency.id, patch);
  } catch (error) {
    if (avatarKey) await storage().remove([avatarKey]).catch(() => undefined);
    if (error instanceof SetupPublishConflict) return { error: "stale" };
    throw error;
  }
  if (avatarKey && agency.avatarKey)''')
a=s.index('export async function addClientOnce(');b=s.index('\n// ---------------------------------------------------------------------------',a)
s=s[:a]+'''export async function addClientOnce(agencyId: string, name: string, checkpoint?: { version: number }): Promise<{ id: string } | { error: SetupError }> {
  const clean = name.trim().slice(0, 80);
  if (clean.length < 2) return { error: "invalid" };
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [draft] = checkpoint ? await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update") : [];
    if (checkpoint && (!draft || draft.version !== checkpoint.version || draft.status === "finished")) return { error: "stale" };
    const [owner] = await tx.select({ id: agencies.id }).from(agencies).where(eq(agencies.id, agencyId)).for("update");
    if (!owner) return { error: "client" };
    const wanted = normalizeForSearch(clean);
    const clients = await tx.select().from(portfolioClients).where(eq(portfolioClients.agencyId, agencyId));
    const existing = clients.find((c) => normalizeForSearch(c.name) === wanted);
    const saved = existing ? { ok: true as const, id: existing.id } : await saveClient(agencyId, null, { name: clean, industry: null, country: null, description: "", links: [] }, tx);
    if (!("ok" in saved)) return { error: "client" };
    if (checkpoint && draft) await tx.update(portfolioSetups).set({ step: 4, status: "in_progress", version: draft.version + 1,
      data: { ...draft.data, client: { mode: "existing", clientId: saved.id } }, updatedAt: new Date() }).where(eq(portfolioSetups.agencyId, agencyId));
    return { id: saved.id };
  });
}
''' +s[b:]
a=s.index('export async function restartSetup(');b=s.index('\n/** Daily:',a)
s=s[:a]+'''export async function restartSetup(agencyId: string, userId: string) {
  const db = await getDb();
  await db.insert(portfolioSetups).values({ agencyId, userId, step: 2 }).onConflictDoNothing();
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(portfolioSetups).where(eq(portfolioSetups.agencyId, agencyId)).for("update");
    if (!current || current.status !== "finished") return;
    await tx.update(portfolioSetups).set({ status: "in_progress", step: 2, data: {}, postId: null, version: current.version + 1, updatedAt: new Date() })
      .where(eq(portfolioSetups.agencyId, agencyId));
  });
}
''' +s[b:]
a=s.index('async function clearSetupMedia(');b=s.index('/** Starts a new project',a);s=s[:a]+s[b:]
p.write_text(s)
p=root/'app/[locale]/(main)/portfolio-setup/actions.ts';s=p.read_text().replace('import { audit } from "@/lib/data/agencies";\n','')
s=s.replace('''  const services = formData.getAll("services")''','''  const currentDraft = await getSetup(agency.id);
  if (!currentDraft || currentDraft.version !== parsed.data.version || currentDraft.status === "finished") return { error: "stale" };
  const services = formData.getAll("services")''',1)
s=s.replace('''  });
  if ("error" in result) return { error: "avatar" };
  if (result.changed.length) await audit(user.id, "agency.update", "agency", agency.id, { via: "setup", fields: result.changed });
  revalidatePath("/[locale]", "layout");
  return done(await writeSetup(agency.id, parsed.data.version, { step: 2 }));''','''  }, { version: parsed.data.version, userId: user.id });
  if ("error" in result) return { error: result.error };
  revalidatePath("/[locale]", "layout");
  return { view: (await getSetup(agency.id)) ?? undefined };''')
s=s.replace('const added = await addClientOnce(agency.id, c.name ?? "");','const added = await addClientOnce(agency.id, c.name ?? "", { version: c.version });').replace('    client = { mode: "existing", clientId: added.id };','    return { view: (await getSetup(agency.id)) ?? undefined };')
p.write_text(s)
