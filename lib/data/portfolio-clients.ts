import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { isCountryCode } from "@/lib/countries";
import { getDb } from "@/lib/db";
import { portfolioClients, postImages, posts, type PortfolioClient } from "@/lib/db/schema";
import { INDUSTRIES } from "@/lib/labels";
import { cleanLinks, type CleanLink } from "@/lib/social-links";
import { mediaUrl } from "@/lib/storage";

// Client businesses in an agency's portfolio (docs/28-portfolio-clients.md):
// the accounts the agency runs for each client, and the posts tagged with it.

export const MAX_CLIENTS = 60;

export type ClientInput = { name: string; industry?: string | null; country?: string | null; description?: string | null; links: { kind: string; value: string }[] };
export type ClientError = { error: "name" | "limit" | "generic" } | { error: "link"; index: number; kind: string };

function clean(raw: ClientInput): ClientError | { values: { name: string; industry: string | null; country: string | null; description: string; links: CleanLink[] } } {
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

export type ClientShowcase = PortfolioClient & { postCount: number; thumbs: { postId: string; url: string; color: string }[] };

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
  return clients.map((c) => ({ ...c, thumbs: thumbs.get(c.id) ?? [] }));
}

/** Client names for a set of posts (the post page and feed cards show "For {client}"). */
export async function clientNames(ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const db = await getDb();
  const rows = await db.select({ id: portfolioClients.id, name: portfolioClients.name }).from(portfolioClients).where(inArray(portfolioClients.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}
