import { and, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, portfolioClients } from "@/lib/db/schema";
import { toSummary, type AgencySummary } from "@/lib/data/agencies";
import { handleOfUrl, isLinkKind, kindOfUrl, linkHref, type LinkKind } from "@/lib/social-links";
import { mediaUrl } from "@/lib/storage";

// "Who runs this page?" (docs/28): a visitor types a page they admire (a
// handle or a link) and gets the agency behind it, when the client confirmed it.

export type AccountQuery = { handle: string; kind: LinkKind | null };
export type WhoRunsHit = { agency: AgencySummary; client: { id: string; name: string; logoUrl: string | null; kind: LinkKind; value: string; href: string | null; confirmedAt: Date | null } };

/** "@rose.cafe", "rose.cafe" or "https://instagram.com/rose.cafe" → the handle, and the network when the link says. */
export function parseAccountQuery(raw: string): AccountQuery | null {
  const q = raw.trim().slice(0, 300);
  if (!q) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(q) || /^[\w-]+(\.[\w-]+)+\//.test(q) || /^(www\.)?[\w-]+\.(com|net|co|me|tv)\b/i.test(q)) {
    const handle = handleOfUrl(q);
    return handle ? { handle, kind: kindOfUrl(q) } : null;
  }
  const handle = q.replace(/^@/, "");
  return /^[\p{L}\p{N}._-]{1,60}$/u.test(handle) ? { handle, kind: null } : null;
}

/** Agencies whose client confirmed they run that account. Demo agencies only in the demo view. */
export async function findWhoRuns(raw: string, { includeDemo = false } = {}): Promise<WhoRunsHit[]> {
  const q = parseAccountQuery(raw);
  if (!q) return [];
  const db = await getDb();
  const handle = q.handle.toLowerCase();
  // Exact match on any stored account value, case-insensitively (handles are stored as typed).
  const hasHandle = sql`exists (select 1 from jsonb_array_elements(${portfolioClients.links}) as l where lower(l->>'value') = ${handle})`;
  const rows = await db
    .select({ client: portfolioClients, agency: agencies })
    .from(portfolioClients)
    .innerJoin(agencies, eq(agencies.id, portfolioClients.agencyId))
    .where(and(isNotNull(portfolioClients.confirmedAt), eq(agencies.status, "active"), ...(includeDemo ? [] : [eq(agencies.isDemo, false)]), hasHandle))
    .limit(50);
  const hits: WhoRunsHit[] = [];
  for (const { client, agency } of rows) {
    const link = client.links.find((l) => l.value.toLowerCase() === q.handle.toLowerCase() && (!q.kind || l.kind === q.kind) && isLinkKind(l.kind));
    if (!link || !isLinkKind(link.kind)) continue;
    hits.push({ agency: toSummary(agency), client: { id: client.id, name: client.name, logoUrl: mediaUrl(client.logoKey), kind: link.kind, value: link.value, href: linkHref(link.kind, link.value), confirmedAt: client.confirmedAt } });
  }
  return hits;
}
