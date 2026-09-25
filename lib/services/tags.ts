// Service tags in the database (docs/30-services-and-partners.md). No
// "server-only" here: the migrate and seed scripts run it too.
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, serviceTags, type ServiceTag } from "@/lib/db/schema";
import { isServiceKey } from "@/lib/taxonomy";
import { normalizeForSearch } from "@/lib/text";
import { BUILTIN_TAGS, exactTag, isKnownService, registerTags, withParents, type TagInfo } from "./catalog";

const searchOf = (t: { nameAr: string; nameEn: string; aliases: string[] }) => normalizeForSearch([t.nameAr, t.nameEn, ...t.aliases].join(" | "));

/**
 * Keeps the built-in tags in the database in step with the catalog file (new
 * ones added, names updated), so every service has a number. Idempotent; run
 * after migrations and by the seed.
 */
export async function syncServiceCatalog() {
  const db = await getDb();
  const existing = new Map((await db.select({ key: serviceTags.key, nameAr: serviceTags.nameAr, nameEn: serviceTags.nameEn, group: serviceTags.group, parent: serviceTags.parent, aliases: serviceTags.aliases, roles: serviceTags.roles }).from(serviceTags).where(eq(serviceTags.builtin, true))).map((r) => [r.key, r]));
  let added = 0;
  let updated = 0;
  for (const t of BUILTIN_TAGS) {
    const row = { nameAr: t.nameAr, nameEn: t.nameEn, group: t.group, parent: t.parent, aliases: t.aliases, roles: t.roles };
    const have = existing.get(t.key);
    if (!have) {
      await db
        .insert(serviceTags)
        .values({ key: t.key, ...row, status: "approved", builtin: true, searchText: searchOf(t) })
        .onConflictDoUpdate({ target: serviceTags.key, set: { ...row, status: "approved", builtin: true, searchText: searchOf(t) } });
      added++;
    } else if (JSON.stringify({ ...have, key: undefined }) !== JSON.stringify({ ...row, key: undefined })) {
      await db.update(serviceTags).set({ ...row, searchText: searchOf(t) }).where(eq(serviceTags.key, t.key));
      updated++;
    }
  }
  return { added, updated };
}

const toInfo = (r: ServiceTag): TagInfo => ({ key: r.key, nameAr: r.nameAr, nameEn: r.nameEn, group: r.group, parent: r.parent, aliases: r.aliases, roles: r.roles });

let cache: { at: number; tags: TagInfo[] } | null = null;

/**
 * Approved tags that aren't in the catalog file (approved by an admin), loaded
 * into the vocabulary. Cached for a minute per server instance.
 */
export async function customTags(): Promise<TagInfo[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.tags;
  try {
    const db = await getDb();
    const rows = await db.select().from(serviceTags).where(and(eq(serviceTags.status, "approved"), eq(serviceTags.builtin, false))).orderBy(asc(serviceTags.id));
    const tags = rows.map(toInfo);
    registerTags(tags);
    cache = { at: Date.now(), tags };
    return tags;
  } catch {
    return cache?.tags ?? [];
  }
}

const forget = () => {
  cache = null;
};

/**
 * What an agency picked: known tags (with their core parents added) and typed
 * texts. A text that matches a tag becomes that tag; one that matches a pending
 * proposal joins it; anything else becomes a new pending proposal. Returns the
 * services to store and the ids of pending proposals.
 */
export async function resolveServices(agencyId: string | null, keys: string[], texts: string[]): Promise<{ services: string[]; pending: number[] }> {
  await customTags();
  const picked = new Set(keys.filter(isKnownService));
  const pending = new Set<number>();
  const db = await getDb();
  for (const raw of texts.slice(0, 10)) {
    const text = raw.replace(/\s+/g, " ").trim().slice(0, 60);
    if (text.length < 2) continue;
    const known = exactTag(text);
    if (known) {
      picked.add(known.key);
      continue;
    }
    const norm = normalizeForSearch(text);
    const [same] = await db.select().from(serviceTags).where(and(eq(serviceTags.searchText, norm), inArray(serviceTags.status, ["pending", "approved"])));
    if (same) {
      if (same.status === "approved") picked.add(same.key);
      else pending.add(same.id);
      continue;
    }
    const [row] = await db
      .insert(serviceTags)
      .values({ key: `pending_${crypto.randomUUID().slice(0, 12)}`, nameAr: text, nameEn: text, status: "pending", proposedText: text, proposedByAgencyId: agencyId, searchText: norm })
      .returning({ id: serviceTags.id });
    pending.add(row.id);
  }
  return { services: withParents([...picked]), pending: [...pending] };
}

export type PendingTag = ServiceTag & { agencies: { id: string; name: string; handle: string }[] };

/** Admin → Services: proposals waiting for review, with the agencies that typed them. */
export async function listPendingTags(): Promise<PendingTag[]> {
  const db = await getDb();
  const rows = await db.select().from(serviceTags).where(eq(serviceTags.status, "pending")).orderBy(asc(serviceTags.createdAt));
  if (!rows.length) return [];
  const users = await db
    .select({ id: agencies.id, name: agencies.name, handle: agencies.handle, pending: agencies.pendingServices })
    .from(agencies)
    .where(sql`${agencies.pendingServices} && ${sql.raw(`ARRAY[${rows.map((r) => r.id).join(",")}]::integer[]`)}`);
  return rows.map((r) => ({ ...r, agencies: users.filter((u) => u.pending.includes(r.id)).map(({ id, name, handle }) => ({ id, name, handle })) }));
}

/** Moves agencies from a pending proposal to a tag (or drops it when `key` is null). */
async function settle(tagId: number, key: string | null) {
  const db = await getDb();
  const holders = await db.select({ id: agencies.id, services: agencies.services, pending: agencies.pendingServices }).from(agencies).where(sql`${tagId} = any(${agencies.pendingServices})`);
  for (const a of holders) {
    await db
      .update(agencies)
      .set({ pendingServices: a.pending.filter((p) => p !== tagId), ...(key ? { services: withParents([...a.services, key]) } : {}), updatedAt: new Date() })
      .where(eq(agencies.id, a.id));
  }
  return holders.length;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

export type TagDecision =
  | { action: "approve"; nameAr: string; nameEn: string; group: string; parent: string | null; roles: string[]; aliases: string[] }
  | { action: "merge"; into: string }
  | { action: "reject" };

/** An admin's decision on a pending proposal. Returns how many agencies were updated. */
export async function reviewTag(tagId: number, decision: TagDecision, reviewerId: string): Promise<{ ok: true; agencies: number; key?: string } | { error: string }> {
  const db = await getDb();
  const [tag] = await db.select().from(serviceTags).where(and(eq(serviceTags.id, tagId), eq(serviceTags.status, "pending")));
  if (!tag) return { error: "notFound" };
  const reviewed = { reviewedBy: reviewerId, reviewedAt: new Date() };
  if (decision.action === "approve") {
    const nameEn = decision.nameEn.trim().slice(0, 80);
    const nameAr = decision.nameAr.trim().slice(0, 80);
    if (nameEn.length < 2 || nameAr.length < 2) return { error: "names" };
    await customTags();
    if (exactTag(nameEn) || exactTag(nameAr)) return { error: "exists" };
    let key = slug(nameEn) || `tag_${tag.id}`;
    const [clash] = await db.select({ id: serviceTags.id }).from(serviceTags).where(eq(serviceTags.key, key));
    if (clash || isServiceKey(key)) key = `${key.slice(0, 32)}_${tag.id}`;
    const parent = decision.parent && isServiceKey(decision.parent) ? decision.parent : null;
    const aliases = [...new Set([...decision.aliases, tag.proposedText ?? ""].map((a) => a.trim()).filter((a) => a && a !== nameAr && a !== nameEn))].slice(0, 8);
    await db
      .update(serviceTags)
      .set({ key, nameAr, nameEn, group: decision.group || "other", parent, roles: decision.roles.slice(0, 6), aliases, status: "approved", searchText: searchOf({ nameAr, nameEn, aliases }), ...reviewed })
      .where(eq(serviceTags.id, tag.id));
    forget();
    await customTags();
    return { ok: true, agencies: await settle(tag.id, key), key };
  }
  if (decision.action === "merge") {
    await customTags();
    if (!isKnownService(decision.into)) return { error: "target" };
    const [target] = await db.select({ id: serviceTags.id }).from(serviceTags).where(eq(serviceTags.key, decision.into));
    // The typed text becomes another way to find the tag it was merged into.
    if (target && tag.proposedText) await db.update(serviceTags).set({ aliases: sql`array_append(${serviceTags.aliases}, ${tag.proposedText})` }).where(eq(serviceTags.id, target.id));
    await db.update(serviceTags).set({ status: "rejected", mergedIntoId: target?.id ?? null, ...reviewed }).where(eq(serviceTags.id, tag.id));
    forget();
    return { ok: true, agencies: await settle(tag.id, decision.into), key: decision.into };
  }
  await db.update(serviceTags).set({ status: "rejected", ...reviewed }).where(eq(serviceTags.id, tag.id));
  return { ok: true, agencies: await settle(tag.id, null) };
}

/** Texts of an agency's pending proposals (shown in its studio as "waiting for review"). */
export async function pendingTexts(ids: number[]): Promise<{ id: number; text: string }[]> {
  if (!ids.length) return [];
  const db = await getDb();
  const rows = await db.select({ id: serviceTags.id, text: serviceTags.proposedText, status: serviceTags.status }).from(serviceTags).where(inArray(serviceTags.id, ids));
  return rows.filter((r) => r.status === "pending").map((r) => ({ id: r.id, text: r.text ?? "" }));
}

/** Admin nav badge: proposals waiting for review. */
export async function pendingTagCount(): Promise<number> {
  const db = await getDb();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(serviceTags).where(eq(serviceTags.status, "pending"));
  return n;
}
