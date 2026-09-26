import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { isCountryCode } from "@/lib/countries";
import { getDb } from "@/lib/db";
import { agencies, portfolioClients, postImages, posts, type Agency, type ClientTranslation, type PortfolioClient } from "@/lib/db/schema";
import { INDUSTRIES } from "@/lib/labels";
import { cleanLinks, type CleanLink } from "@/lib/social-links";
import { mediaUrl } from "@/lib/storage";

// Client businesses in an agency's portfolio (docs/28-portfolio-clients.md):
// the accounts the agency runs for each client, and the posts tagged with it.

export const MAX_CLIENTS = 60;

export type ClientInput = {
  name: string;
  industry?: string | null;
  country?: string | null;
  description?: string | null;
  links: { kind: string; value: string }[];
  /** Name and description in the agency's other language. */
  translation?: ClientTranslation;
};
export type ClientError = { error: "name" | "limit" | "generic" } | { error: "link"; index: number; kind: string };

function clean(raw: ClientInput): ClientError | { values: { name: string; industry: string | null; country: string | null; description: string; links: CleanLink[]; translation: ClientTranslation } } {
  const name = raw.name.trim().slice(0, 80);
  if (name.length < 2) return { error: "name" };
  const links = cleanLinks(raw.links);
  if ("error" in links) {
    const filled = raw.links.filter((l) => l.value?.trim());
    const bad = raw.links[links.error];
    return { error: "link", index: Math.max(0, filled.indexOf(bad)), kind: bad?.kind ?? "other" };
  }
  return {
    values: {
      name,
      industry: raw.industry && (INDUSTRIES as readonly string[]).includes(raw.industry) ? raw.industry : null,
      country: isCountryCode(raw.country ?? undefined) ? raw.country! : null,
      description: (raw.description ?? "").trim().slice(0, 500),
      links: links.links,
      translation: raw.translation ?? {},
    },
  };
}

export async function listClients(agencyId: string): Promise<(PortfolioClient & { postCount: number })[]> {
  const db = await getDb();
  const rows = await db.select().from(portfolioClients).where(eq(portfolioClients.agencyId, agencyId)).orderBy(asc(portfolioClients.position), asc(portfolioClients.createdAt));
  if (!rows.length) return [];
  const counts = await db
    .select({ clientId: posts.clientId, n: count() })
    .from(posts)
    .where(and(inArray(posts.clientId, rows.map((r) => r.id)), eq(posts.status, "published")))
    .groupBy(posts.clientId);
  const byId = new Map(counts.map((c) => [c.clientId, Number(c.n)]));
  return rows.map((r) => ({ ...r, postCount: byId.get(r.id) ?? 0 }));
}

export async function saveClient(agencyId: string, clientId: string | null, raw: ClientInput): Promise<ClientError | { ok: true; id: string }> {
  const cleaned = clean(raw);
  if ("error" in cleaned) return cleaned;
  const db = await getDb();
  if (clientId) {
    const [row] = await db
      .update(portfolioClients)
      .set({ ...cleaned.values, updatedAt: new Date() })
      .where(and(eq(portfolioClients.id, clientId), eq(portfolioClients.agencyId, agencyId)))
      .returning({ id: portfolioClients.id });
    return row ? { ok: true, id: row.id } : { error: "generic" };
  }
  const [{ n }] = await db.select({ n: count() }).from(portfolioClients).where(eq(portfolioClients.agencyId, agencyId));
  if (Number(n) >= MAX_CLIENTS) return { error: "limit" };
  const [row] = await db.insert(portfolioClients).values({ agencyId, ...cleaned.values, position: Number(n) }).returning({ id: portfolioClients.id });
  return { ok: true, id: row.id };
}

export async function deleteClient(agencyId: string, clientId: string) {
  const db = await getDb();
  await db.delete(portfolioClients).where(and(eq(portfolioClients.id, clientId), eq(portfolioClients.agencyId, agencyId)));
}

/** Whether a client belongs to the agency (a post can only be tagged with its own clients). */
export async function ownsClient(agencyId: string, clientId: string) {
  const db = await getDb();
  const [row] = await db.select({ id: portfolioClients.id }).from(portfolioClients).where(and(eq(portfolioClients.id, clientId), eq(portfolioClients.agencyId, agencyId)));
  return Boolean(row);
}

/** Sets or clears the account's logo; returns the key that was there, for the caller to remove from storage. */
export async function setClientLogo(agencyId: string, clientId: string, logoKey: string | null): Promise<string | null> {
  const db = await getDb();
  const [before] = await db.select({ logoKey: portfolioClients.logoKey }).from(portfolioClients).where(and(eq(portfolioClients.id, clientId), eq(portfolioClients.agencyId, agencyId)));
  if (!before) return null;
  await db.update(portfolioClients).set({ logoKey, updatedAt: new Date() }).where(eq(portfolioClients.id, clientId));
  return before.logoKey;
}

/** One client of an agency (its public account page), or null. */
export async function getClient(agencyId: string, clientId: string): Promise<(PortfolioClient & { postCount: number; logoUrl: string | null }) | null> {
  const db = await getDb();
  const [row] = await db.select().from(portfolioClients).where(and(eq(portfolioClients.id, clientId), eq(portfolioClients.agencyId, agencyId)));
  if (!row) return null;
  const [{ n }] = await db.select({ n: count() }).from(posts).where(and(eq(posts.clientId, row.id), eq(posts.status, "published")));
  return { ...row, postCount: Number(n), logoUrl: mediaUrl(row.logoKey) };
}

export type AccountTile = { id: string; name: string; translation: ClientTranslation; logoUrl: string | null; postCount: number; cover: { url: string; color: string } | null };

/**
 * The accounts shown on the agency's Work tab: every client with published
 * work, its logo, how many posts, and the latest post's picture as a cover.
 */
export async function accountTiles(agencyId: string): Promise<AccountTile[]> {
  const clients = (await listClients(agencyId)).filter((c) => c.postCount > 0);
  if (!clients.length) return [];
  const db = await getDb();
  const rows = await db
    .select({ clientId: posts.clientId, key: postImages.thumbKey, color: postImages.color })
    .from(posts)
    .innerJoin(postImages, and(eq(postImages.postId, posts.id), eq(postImages.position, 0)))
    .where(and(inArray(posts.clientId, clients.map((c) => c.id)), eq(posts.status, "published")))
    .orderBy(desc(posts.createdAt));
  const cover = new Map<string, { url: string; color: string }>();
  for (const r of rows) if (r.clientId && !cover.has(r.clientId)) cover.set(r.clientId, { url: mediaUrl(r.key)!, color: r.color });
  return clients.map((c) => ({ id: c.id, name: c.name, translation: c.translation ?? {}, logoUrl: mediaUrl(c.logoKey), postCount: c.postCount, cover: cover.get(c.id) ?? null }));
}

export type ClientShowcase = PortfolioClient & { postCount: number; logoUrl: string | null; thumbs: { postId: string; url: string; color: string }[] };

/** The public Clients tab: every client with its accounts and up to 6 recent work thumbnails. */
export async function clientShowcase(agencyId: string): Promise<ClientShowcase[]> {
  const clients = await listClients(agencyId);
  if (!clients.length) return [];
  const db = await getDb();
  const rows = await db
    .select({ clientId: posts.clientId, postId: posts.id, key: postImages.thumbKey, color: postImages.color })
    .from(posts)
    .innerJoin(postImages, and(eq(postImages.postId, posts.id), eq(postImages.position, 0)))
    .where(and(inArray(posts.clientId, clients.map((c) => c.id)), eq(posts.status, "published")))
    .orderBy(desc(posts.createdAt));
  const thumbs = new Map<string, ClientShowcase["thumbs"]>();
  for (const r of rows) {
    const list = thumbs.get(r.clientId!) ?? [];
    if (list.length < 6) list.push({ postId: r.postId, url: mediaUrl(r.key)!, color: r.color });
    thumbs.set(r.clientId!, list);
  }
  return clients.map((c) => ({ ...c, logoUrl: mediaUrl(c.logoKey), thumbs: thumbs.get(c.id) ?? [] }));
}

/** Client names for a set of posts (the post page and feed cards show "For {client}"), with the other-language name. */
export async function clientNames(ids: string[]): Promise<Map<string, { name: string; translation: ClientTranslation }>> {
  if (!ids.length) return new Map();
  const db = await getDb();
  const rows = await db
    .select({ id: portfolioClients.id, name: portfolioClients.name, translation: portfolioClients.translation })
    .from(portfolioClients)
    .where(inArray(portfolioClients.id, ids));
  return new Map(rows.map((r) => [r.id, { name: r.name, translation: r.translation ?? {} }]));
}

// --- Client confirmation (docs/28): the client says, through a private link
// the agency sends, that this agency runs its account. Confirmed accounts get
// a badge and are the only ones "Who runs this page?" answers with.

/** The account's confirmation link token, made on first use. Null when the client isn't the agency's. */
export async function ensureConfirmToken(agencyId: string, clientId: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db.select({ token: portfolioClients.confirmToken }).from(portfolioClients).where(and(eq(portfolioClients.id, clientId), eq(portfolioClients.agencyId, agencyId)));
  if (!row) return null;
  if (row.token) return row.token;
  const token = randomBytes(18).toString("base64url");
  await db.update(portfolioClients).set({ confirmToken: token }).where(eq(portfolioClients.id, clientId));
  return token;
}

/** What a confirmation link points at: the account and the agency that asks. */
export async function clientByConfirmToken(token: string): Promise<{ client: PortfolioClient & { logoUrl: string | null }; agency: Agency } | null> {
  if (!token || token.length > 64) return null;
  const db = await getDb();
  const [row] = await db
    .select({ client: portfolioClients, agency: agencies })
    .from(portfolioClients)
    .innerJoin(agencies, eq(agencies.id, portfolioClients.agencyId))
    .where(eq(portfolioClients.confirmToken, token));
  return row ? { client: { ...row.client, logoUrl: mediaUrl(row.client.logoKey) }, agency: row.agency } : null;
}

/** The client confirms. Idempotent: an already confirmed account stays confirmed. */
export async function confirmClient(token: string): Promise<boolean> {
  const db = await getDb();
  const rows = await db
    .update(portfolioClients)
    .set({ confirmedAt: sql`coalesce(${portfolioClients.confirmedAt}, now())`, updatedAt: new Date() })
    .where(eq(portfolioClients.confirmToken, token))
    .returning({ id: portfolioClients.id });
  return rows.length > 0;
}

/** The agency withdraws a confirmation (a client changed, a link leaked): a new link is needed afterwards. */
export async function resetConfirmation(agencyId: string, clientId: string) {
  const db = await getDb();
  await db.update(portfolioClients).set({ confirmedAt: null, confirmToken: null, updatedAt: new Date() }).where(and(eq(portfolioClients.id, clientId), eq(portfolioClients.agencyId, agencyId)));
}

/** How many client-confirmed accounts each agency has. */
export async function confirmedCounts(agencyIds: string[]): Promise<Map<string, number>> {
  if (!agencyIds.length) return new Map();
  const db = await getDb();
  const rows = await db
    .select({ agencyId: portfolioClients.agencyId, n: count() })
    .from(portfolioClients)
    .where(and(inArray(portfolioClients.agencyId, agencyIds), isNotNull(portfolioClients.confirmedAt)))
    .groupBy(portfolioClients.agencyId);
  return new Map(rows.map((r) => [r.agencyId, Number(r.n)]));
}
