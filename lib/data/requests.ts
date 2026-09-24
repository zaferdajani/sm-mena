import { randomBytes } from "node:crypto";
import { and, arrayOverlaps, desc, eq, gt, inArray, isNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, events, projectRequests, proposals, requestMatches, type ProjectRequest } from "@/lib/db/schema";
import { toSummary } from "./agencies";
import { addNotifications, type NewNotification } from "./notifications";
import { hashToken } from "./reviews";
import { CONSENT_VERSION } from "./users";

const DAY = 24 * 3600 * 1000;
export const REQUEST_DAYS = 14;
export const MAX_PROPOSALS = 10;
export const INVITED = 5;

export type RequestInput = {
  clientName: string;
  phone: string;
  businessName?: string | null;
  businessType?: string | null;
  services: string[];
  platforms: string[];
  city?: string | null;
  country?: string;
  budgetMinJod?: number | null;
  budgetMaxJod?: number | null;
  timeline?: string | null;
  description: string;
  fullService?: boolean;
  brands?: string | null;
  source: "form" | "ai" | "demo"; // "demo": seeded pilot data, shown to demo agencies only
  visitorId: string | null;
};

/** Stores a request and its ranked matches (top INVITED are invited). Returns the raw client token. */
export async function createProjectRequest(input: RequestInput, matches: { agencyId: string; score: number }[]) {
  const db = await getDb();
  const token = randomBytes(18).toString("base64url");
  const request = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(projectRequests)
      .values({ ...input, tokenHash: hashToken(token), consentVersion: CONSENT_VERSION, expiresAt: new Date(Date.now() + REQUEST_DAYS * DAY) })
      .returning();
    if (matches.length) {
      await tx.insert(requestMatches).values(matches.map((m, i) => ({ requestId: row.id, agencyId: m.agencyId, score: m.score, invited: i < INVITED })));
      await tx.insert(events).values(matches.slice(0, INVITED).map((m) => ({ type: "recommended" as const, agencyId: m.agencyId, visitorId: input.visitorId })));
      // Invited agencies hear about it in the studio. Demo requests only ever reach demo agencies.
      let invited = matches.slice(0, INVITED).map((m) => m.agencyId);
      if (row.source === "demo") {
        const demo = await tx.select({ id: agencies.id }).from(agencies).where(and(inArray(agencies.id, invited), eq(agencies.isDemo, true)));
        invited = demo.map((a) => a.id);
      }
      await addNotifications(
        invited.map((agencyId) => ({ agencyId, kind: "request_invited" as const, href: `/studio/opportunities/${row.id}`, params: { services: row.services.join(",") }, requestId: row.id })),
        tx,
      );
    }
    return row;
  });
  return { token, request };
}

export type ProposalView = {
  id: string;
  priceJod: number;
  billing: "monthly" | "one_off";
  timeline: string;
  message: string;
  status: "sent" | "shortlisted" | "accepted" | "declined";
  createdAt: Date;
  agency: ReturnType<typeof toSummary>;
};

async function proposalsFor(requestId: string): Promise<ProposalView[]> {
  const db = await getDb();
  const rows = await db
    .select({ proposal: proposals, agency: agencies })
    .from(proposals)
    .innerJoin(agencies, eq(proposals.agencyId, agencies.id))
    .where(eq(proposals.requestId, requestId))
    .orderBy(desc(sql`${proposals.status} = 'accepted'`), desc(sql`${proposals.status} = 'shortlisted'`), proposals.priceJod);
  return rows.map(({ proposal: p, agency }) => ({ ...p, agency: toSummary(agency) }));
}

/** Client view by private token. */
export async function getRequestByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const db = await getDb();
  const [request] = await db.select().from(projectRequests).where(eq(projectRequests.tokenHash, hashToken(token)));
  if (!request) return null;
  return { request, proposals: await proposalsFor(request.id), invitedCount: await invitedCount(request.id) };
}

/** Client view by visitor cookie (same device that posted it). */
export async function getRequestForVisitor(requestId: string, visitorId: string | null) {
  if (!visitorId || !/^[0-9a-f-]{36}$/i.test(requestId)) return null;
  const db = await getDb();
  const [request] = await db.select().from(projectRequests).where(and(eq(projectRequests.id, requestId), eq(projectRequests.visitorId, visitorId)));
  if (!request) return null;
  return { request, proposals: await proposalsFor(request.id), invitedCount: await invitedCount(request.id) };
}

async function invitedCount(requestId: string) {
  const db = await getDb();
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(requestMatches).where(and(eq(requestMatches.requestId, requestId), eq(requestMatches.invited, true)));
  return row.n;
}

export async function listVisitorRequests(visitorId: string) {
  const db = await getDb();
  return db
    .select({ request: projectRequests, proposals: sql<number>`(select count(*)::int from proposals p where p.request_id = ${projectRequests.id})` })
    .from(projectRequests)
    .where(eq(projectRequests.visitorId, visitorId))
    .orderBy(desc(projectRequests.createdAt))
    .limit(20);
}

/** Client decisions on a proposal. Accepting closes the request and declines the rest. */
export async function setProposalStatus(requestId: string, proposalId: string, status: "shortlisted" | "accepted" | "declined" | "sent") {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [before] = await tx.select({ status: proposals.status }).from(proposals).where(and(eq(proposals.id, proposalId), eq(proposals.requestId, requestId)));
    const rows = await tx.update(proposals).set({ status }).where(and(eq(proposals.id, proposalId), eq(proposals.requestId, requestId))).returning({ id: proposals.id, agencyId: proposals.agencyId });
    if (!rows.length) return false;
    const [request] = await tx.select({ clientName: projectRequests.clientName }).from(projectRequests).where(eq(projectRequests.id, requestId));
    const decided = (agencyId: string, kind: "proposal_accepted" | "proposal_declined"): NewNotification => ({
      agencyId,
      kind,
      href: `/studio/opportunities/${requestId}`,
      params: { name: request?.clientName ?? "" },
      requestId,
    });
    const notes: NewNotification[] = [];
    if (status === "accepted" && before?.status !== "accepted") notes.push(decided(rows[0].agencyId, "proposal_accepted"));
    if (status === "declined" && before?.status !== "declined") notes.push(decided(rows[0].agencyId, "proposal_declined"));
    if (status === "accepted") {
      const others = await tx
        .update(proposals)
        .set({ status: "declined" })
        .where(and(eq(proposals.requestId, requestId), sql`${proposals.id} <> ${proposalId}`, sql`${proposals.status} <> 'declined'`))
        .returning({ agencyId: proposals.agencyId });
      notes.push(...others.map((o) => decided(o.agencyId, "proposal_declined")));
      await tx.update(projectRequests).set({ status: "closed" }).where(eq(projectRequests.id, requestId));
    }
    await addNotifications(notes, tx);
    return true;
  });
}

export async function closeRequest(requestId: string) {
  const db = await getDb();
  await db.update(projectRequests).set({ status: "closed" }).where(eq(projectRequests.id, requestId));
}

// ---------------------------------------------------------------------------
// Agency side
// ---------------------------------------------------------------------------

export type Opportunity = {
  request: ProjectRequest;
  invited: boolean;
  score: number | null;
  proposalCount: number;
  myProposal: typeof proposals.$inferSelect | null;
  /** Matched to this agency and not opened yet. */
  isNew: boolean;
};

/** The agency fields opportunities depend on. Demo requests are shown to demo agencies only. */
export type OpportunityAgency = { id: string; services: string[]; isDemo?: boolean };

/** Seeded demo requests stay invisible to real agencies. */
const demoVisibility = (agency: OpportunityAgency) => (agency.isDemo ? undefined : ne(projectRequests.source, "demo"));

/** Open requests an agency can bid on: invited ones first, then any with overlapping services. */
export async function listOpportunities(agency: OpportunityAgency, only?: { requestId: string }): Promise<Opportunity[]> {
  const db = await getDb();
  const now = new Date();
  const conditions = [eq(projectRequests.status, "open"), gt(projectRequests.expiresAt, now), demoVisibility(agency), only ? eq(projectRequests.id, only.requestId) : undefined];
  const rows = await db
    .select({ request: projectRequests, match: requestMatches })
    .from(projectRequests)
    .leftJoin(requestMatches, and(eq(requestMatches.requestId, projectRequests.id), eq(requestMatches.agencyId, agency.id)))
    .where(
      and(
        ...conditions,
        agency.services.length
          ? sql`(${requestMatches.agencyId} is not null or ${arrayOverlaps(projectRequests.services, agency.services)})`
          : sql`${requestMatches.agencyId} is not null`,
      ),
    )
    .orderBy(desc(sql`coalesce(${requestMatches.invited}, false)`), desc(projectRequests.createdAt))
    .limit(50);
  const ids = rows.map((r) => r.request.id);
  const [counts, mine] = ids.length
    ? await Promise.all([
        db.select({ requestId: proposals.requestId, n: sql<number>`count(*)::int` }).from(proposals).where(inArray(proposals.requestId, ids)).groupBy(proposals.requestId),
        db.select().from(proposals).where(and(inArray(proposals.requestId, ids), eq(proposals.agencyId, agency.id))),
      ])
    : [[], []];
  const countBy = new Map(counts.map((c) => [c.requestId, c.n]));
  const mineBy = new Map(mine.map((p) => [p.requestId, p]));
  return rows.map((r) => ({
    request: r.request,
    invited: r.match?.invited ?? false,
    score: r.match?.score ?? null,
    proposalCount: countBy.get(r.request.id) ?? 0,
    myProposal: mineBy.get(r.request.id) ?? null,
    isNew: Boolean(r.match && !r.match.viewedAt),
  }));
}

/** Matched requests the agency has not opened yet (the Opportunities tab badge). */
export async function newOpportunityCount(agency: OpportunityAgency) {
  const db = await getDb();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(requestMatches)
    .innerJoin(projectRequests, eq(requestMatches.requestId, projectRequests.id))
    .where(and(eq(requestMatches.agencyId, agency.id), isNull(requestMatches.viewedAt), eq(projectRequests.status, "open"), gt(projectRequests.expiresAt, new Date()), demoVisibility(agency)));
  return row?.n ?? 0;
}

/** The agency opened the request: it no longer counts as new. */
export async function markOpportunityViewed(agencyId: string, requestId: string) {
  const db = await getDb();
  await db
    .update(requestMatches)
    .set({ viewedAt: new Date() })
    .where(and(eq(requestMatches.agencyId, agencyId), eq(requestMatches.requestId, requestId), isNull(requestMatches.viewedAt)));
}

export async function getOpportunity(agency: OpportunityAgency, requestId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return null;
  return (await listOpportunities(agency, { requestId }))[0] ?? (await closedOpportunity(agency.id, requestId));
}

/** An agency that already proposed can still view a closed request. */
async function closedOpportunity(agencyId: string, requestId: string): Promise<Opportunity | null> {
  const db = await getDb();
  const [row] = await db
    .select({ request: projectRequests, proposal: proposals })
    .from(proposals)
    .innerJoin(projectRequests, eq(proposals.requestId, projectRequests.id))
    .where(and(eq(proposals.agencyId, agencyId), eq(proposals.requestId, requestId)));
  return row ? { request: row.request, invited: false, score: null, proposalCount: 0, myProposal: row.proposal, isNew: false } : null;
}

export type ProposalInput = { priceJod: number; billing: "monthly" | "one_off"; timeline: string; message: string };

export async function submitProposal(agency: OpportunityAgency, requestId: string, input: ProposalInput) {
  const opp = await getOpportunity(agency, requestId);
  if (!opp || opp.request.status !== "open" || opp.request.expiresAt < new Date()) return { error: "closed" as const };
  if (opp.myProposal) return { error: "exists" as const };
  if (opp.proposalCount >= MAX_PROPOSALS) return { error: "full" as const };
  const db = await getDb();
  const [row] = await db.insert(proposals).values({ requestId, agencyId: agency.id, ...input }).onConflictDoNothing().returning();
  if (!row) return { error: "exists" as const };
  await db.insert(events).values({ type: "proposal", agencyId: agency.id, visitorId: null });
  // The client's device hears about the new quote.
  if (opp.request.visitorId) {
    const [sender] = await db.select({ name: agencies.name }).from(agencies).where(eq(agencies.id, agency.id));
    await addNotifications([
      { visitorId: opp.request.visitorId, kind: "proposal_received", href: `/requests/${requestId}`, params: { name: sender?.name ?? "" }, requestId },
    ]);
  }
  return { proposal: row };
}

/** Proposals an agency sent this calendar month (for plan limits). */
export async function proposalsThisMonth(agencyId: string) {
  const db = await getDb();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(proposals).where(and(eq(proposals.agencyId, agencyId), gt(proposals.createdAt, start)));
  return row.n;
}
