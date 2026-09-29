import "server-only";
import { discoverableProfiles } from "@/lib/data/publication";
import { isRegistrationPhase } from "@/lib/launch-phase";
import { and, asc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, collabProfiles, partnerRequests, posts, type Agency } from "@/lib/db/schema";
import { inCountry } from "@/lib/data/agency-filters";
import { page, rank, type Candidate, type Ranked } from "@/lib/collab/discovery";
import { rangeIn } from "@/lib/collab/time";
import { countryOf } from "@/lib/countries";
import type { WorkMode } from "@/lib/collab/types";
import { rolesOf, ROLE_KEYS } from "@/lib/services/catalog";
import { mediaUrl } from "@/lib/storage";
import { availabilityStates } from "./collab-availability";
import { blockedSet } from "./collab-blocks";
import { rosterIds } from "./collab-roster";

// Collaborator discovery for agencies (docs/48 §discovery). The database
// applies the cheap hard filters and a bounded, ordered fetch; lib/collab/
// discovery.ts ranks with reasons. Client matching (lib/matching) is untouched.

export type DiscoverQuery = {
  roles: string[];
  services?: string[];
  kind?: "agency" | "freelancer" | null;
  city?: string | null;
  workMode?: WorkMode | null;
  languages?: string[];
  from?: string | null;
  to?: string | null;
  confirmedOnly?: boolean;
  cursor?: number;
};

export type DiscoverCard = Ranked & { card: { id: string; handle: string; name: string; kind: "agency" | "freelancer"; city: string; country: string; avatarUrl: string | null; isVerified: boolean; languages: string[]; postCount: number } };

const FETCH_CAP = 500;

export async function partnerIdsOf(agencyId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db
    .select({ a: partnerRequests.fromAgencyId, b: partnerRequests.toAgencyId })
    .from(partnerRequests)
    .where(and(eq(partnerRequests.status, "accepted"), or(eq(partnerRequests.fromAgencyId, agencyId), eq(partnerRequests.toAgencyId, agencyId))));
  return new Set(rows.map((r) => (r.a === agencyId ? r.b : r.a)));
}

export async function discoverCollaborators(me: Agency, q: DiscoverQuery, { includeDemo = false } = {}) {
  if (isRegistrationPhase() && !(await (await import("@/lib/launch-access")).canBrowseDirectory())) return { items: [] as DiscoverCard[], next: null as number | null, total: 0, truncated: false };
  const roles = q.roles.filter((r) => ROLE_KEYS.includes(r));
  const db = await getDb();
  const conditions = [discoverableProfiles(), eq(agencies.status, "active"), ne(agencies.id, me.id), inCountry(me.country)];
  if (q.kind) conditions.push(eq(agencies.kind, q.kind));
  if (!includeDemo) conditions.push(eq(agencies.isDemo, false));
  const rows = await db
    .select({ a: agencies, p: collabProfiles })
    .from(agencies)
    .leftJoin(collabProfiles, eq(collabProfiles.agencyId, agencies.id))
    .where(and(...conditions))
    .orderBy(asc(agencies.id))
    .limit(FETCH_CAP);
  if (!rows.length) return { items: [] as DiscoverCard[], next: null as number | null, total: 0, truncated: false };
  const ids = rows.map((r) => r.a.id);
  const [blocked, partners, saved] = await Promise.all([blockedSet(me.id), partnerIdsOf(me.id), rosterIds(me.id)]);
  const period = q.from && q.to ? rangeIn(q.from, q.to, countryOf(me.country).timeZones[0] ?? "Asia/Amman") : null;
  const availability = await availabilityStates(ids, period, { partnerIds: partners });
  // Portfolio evidence: published posts per service, one grouped query.
  const evidence = await db
    .select({ agencyId: posts.agencyId, service: sql<string>`unnest(${posts.services})`, n: sql<number>`count(*)::int` })
    .from(posts)
    .where(and(inArray(posts.agencyId, ids), eq(posts.status, "published")))
    .groupBy(posts.agencyId, sql`unnest(${posts.services})`);
  const byAgency = new Map<string, Record<string, number>>();
  for (const e of evidence) byAgency.set(e.agencyId, { ...(byAgency.get(e.agencyId) ?? {}), [e.service]: e.n });
  const candidates: Candidate[] = rows.map(({ a, p }) => ({
    id: a.id,
    kind: a.kind,
    country: a.country,
    servesCountries: a.servesCountries,
    city: a.city,
    languages: a.languages,
    roles: [...new Set([...a.teamRoles, ...rolesOf(a.services)])],
    services: a.services,
    postsByService: byAgency.get(a.id) ?? {},
    postCount: a.postCount,
    isVerified: a.isVerified,
    isDemo: a.isDemo,
    status: a.status,
    openToWork: p?.openToWork ?? null,
    workModes: (p?.workModes ?? []) as WorkMode[],
    availability: availability.get(a.id) ?? "unknown",
    partner: partners.has(a.id),
    saved: saved.has(a.id),
  }));
  const ranked = rank(candidates, {
    askerId: me.id,
    askerCountry: me.country,
    askerCity: me.city,
    roles,
    services: q.services,
    languages: q.languages,
    workMode: q.workMode ?? null,
    city: q.city ?? null,
    kind: q.kind ?? null,
    confirmedOnly: Boolean(q.confirmedOnly),
    blocked,
    includeDemo,
  });
  const byId = new Map(rows.map((r) => [r.a.id, r.a]));
  const paged = page(ranked, q.cursor ?? 0);
  return {
    ...paged,
    truncated: rows.length === FETCH_CAP,
    items: paged.items.map((r) => {
      const a = byId.get(r.candidate.id)!;
      return { ...r, card: { id: a.id, handle: a.handle, name: a.name, kind: a.kind, city: a.city, country: a.country, avatarUrl: mediaUrl(a.avatarKey), isVerified: a.isVerified, languages: a.languages, postCount: a.postCount } };
    }),
  };
}
