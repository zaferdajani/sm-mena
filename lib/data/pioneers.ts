import { existsSync } from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { agencies, packages, pioneerInvitations, postImages, posts, prospects, type PioneerInvitation } from "@/lib/db/schema";
import { PIONEER, inviteExpiry, invitationState, isPioneerCode, medalChecklist, medalReady, newPioneerCode, normalizePioneerCode, type InvitationState, type MedalInput, type MedalItem } from "@/lib/pioneers";
import { audit } from "./agencies";

// The Pioneer seal (docs/57): invitations, scans and claims.

export type InvitationView = PioneerInvitation & { state: InvitationState; claimedHandle: string | null; prospectName: string | null };

const view = (row: { invitation: PioneerInvitation; claimedHandle: string | null; prospectName: string | null }, left: number): InvitationView => ({
  ...row.invitation,
  state: invitationState(row.invitation, left),
  claimedHandle: row.claimedHandle,
  prospectName: row.prospectName,
});

/** Medals still available: the cap minus the numbers already given. */
export async function medalsLeft(): Promise<number> {
  const db = await getDb();
  const [{ n }] = (await db.select({ n: sql<number>`count(*)::int` }).from(pioneerInvitations).where(isNotNull(pioneerInvitations.number))) as { n: number }[];
  return Math.max(0, PIONEER.cap - n);
}

/** The introduction is required only once it is deployed (public/pioneers/intro.mp4). */
export const introVideoDeployed = () => existsSync(path.join(process.cwd(), "public", "pioneers", "intro.mp4"));

export async function listInvitations(): Promise<InvitationView[]> {
  const db = await getDb();
  const rows = await db
    .select({ invitation: pioneerInvitations, claimedHandle: agencies.handle, prospectName: prospects.name })
    .from(pioneerInvitations)
    .leftJoin(agencies, eq(pioneerInvitations.claimedAgencyId, agencies.id))
    .leftJoin(prospects, eq(pioneerInvitations.prospectId, prospects.id))
    .orderBy(asc(pioneerInvitations.createdAt));
  const left = await medalsLeft();
  return rows.map((r) => view(r, left));
}

export async function invitationByCode(raw: unknown): Promise<InvitationView | null> {
  const code = normalizePioneerCode(raw);
  if (!isPioneerCode(code)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ invitation: pioneerInvitations, claimedHandle: agencies.handle, prospectName: prospects.name })
    .from(pioneerInvitations)
    .leftJoin(agencies, eq(pioneerInvitations.claimedAgencyId, agencies.id))
    .leftJoin(prospects, eq(pioneerInvitations.prospectId, prospects.id))
    .where(eq(pioneerInvitations.code, code));
  return row ? view(row, await medalsLeft()) : null;
}

export async function invitationForProspect(prospectId: string): Promise<InvitationView | null> {
  const db = await getDb();
  const [row] = await db
    .select({ invitation: pioneerInvitations, claimedHandle: agencies.handle, prospectName: prospects.name })
    .from(pioneerInvitations)
    .leftJoin(agencies, eq(pioneerInvitations.claimedAgencyId, agencies.id))
    .leftJoin(prospects, eq(pioneerInvitations.prospectId, prospects.id))
    .where(eq(pioneerInvitations.prospectId, prospectId))
    .orderBy(desc(pioneerInvitations.createdAt));
  return row ? view(row, await medalsLeft()) : null;
}

/**
 * One letter per prospect. Letters carry no number: medals are numbered when they are claimed,
 * in claim order, so more letters than medals can go out (PIONEER.letterCap).
 */
export async function createInvitation(input: { name: string; prospectId?: string | null }, by: string): Promise<{ invitation: PioneerInvitation } | { error: "cap" | "exists" | "name" }> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) return { error: "name" };
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('pioneer_invitations'))`);
    if (input.prospectId) {
      const [dup] = await tx.select({ id: pioneerInvitations.id }).from(pioneerInvitations).where(eq(pioneerInvitations.prospectId, input.prospectId));
      if (dup) return { error: "exists" as const };
    }
    const [{ n }] = (await tx.select({ n: sql<number>`count(*)::int` }).from(pioneerInvitations)) as { n: number }[];
    if (n >= PIONEER.letterCap) return { error: "cap" as const };
    let code = newPioneerCode();
    for (let i = 0; i < 5; i++) {
      const [taken] = await tx.select({ id: pioneerInvitations.id }).from(pioneerInvitations).where(eq(pioneerInvitations.code, code));
      if (!taken) break;
      code = newPioneerCode();
    }
    const [invitation] = await tx
      .insert(pioneerInvitations)
      .values({ code, name, prospectId: input.prospectId ?? null, expiresAt: inviteExpiry(), createdBy: by })
      .returning();
    await tx.insert((await import("@/lib/db/schema")).auditLogs).values({ actorUserId: by, action: "pioneer.invited", entity: "pioneer_invitation", entityId: invitation.id, meta: { prospectId: input.prospectId ?? null } });
    return { invitation };
  });
}

/** Extends an open or expired letter's window (a late reply still counts). */
export async function extendInvitation(id: string, by: string): Promise<boolean> {
  const db = await getDb();
  const [row] = await db
    .update(pioneerInvitations)
    .set({ expiresAt: inviteExpiry() })
    .where(and(eq(pioneerInvitations.id, id), isNull(pioneerInvitations.claimedAgencyId)))
    .returning({ id: pioneerInvitations.id });
  if (!row) return false;
  await audit(by, "pioneer.extended", "pioneer_invitation", id);
  return true;
}

/** A scan of the letter's QR: a count and a time, nothing about the visitor. */
export async function recordScan(code: string): Promise<void> {
  const db = await getDb();
  await db.update(pioneerInvitations).set({ scans: sql`${pioneerInvitations.scans} + 1`, lastScanAt: new Date() }).where(eq(pioneerInvitations.code, code));
}

/** The visitor watched the introduction to the end (recorded once; no visitor data). */
export async function markWatched(raw: unknown): Promise<boolean> {
  const code = normalizePioneerCode(raw);
  if (!isPioneerCode(code)) return false;
  const db = await getDb();
  const [row] = await db
    .update(pioneerInvitations)
    .set({ watchedAt: new Date() })
    .where(and(eq(pioneerInvitations.code, code), isNull(pioneerInvitations.watchedAt)))
    .returning({ id: pioneerInvitations.id });
  return Boolean(row);
}

export type ClaimResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "claimed" | "expired" | "already" | "notWatched" | "full" };

/**
 * Registering from the letter links it to the new page (once; a page holds one letter). The
 * medal is not given here: it goes to the first PIONEER.cap linked pages that are complete
 * (`awardMedalIfComplete`), numbered in the order they finish.
 */
export async function claimPioneer(agencyId: string, raw: unknown, by: string | null, { requireWatched = introVideoDeployed() } = {}): Promise<ClaimResult> {
  const code = normalizePioneerCode(raw);
  if (!isPioneerCode(code)) return { ok: false, reason: "invalid" };
  const db = await getDb();
  const left = await medalsLeft();
  return db.transaction(async (tx) => {
    const [inv] = await tx.select().from(pioneerInvitations).where(eq(pioneerInvitations.code, code)).for("update");
    if (!inv) return { ok: false as const, reason: "invalid" as const };
    if (inv.claimedAgencyId) return { ok: false as const, reason: inv.claimedAgencyId === agencyId ? ("already" as const) : ("claimed" as const) };
    if (inv.expiresAt.getTime() < Date.now()) return { ok: false as const, reason: "expired" as const };
    if (requireWatched && !inv.watchedAt) return { ok: false as const, reason: "notWatched" as const };
    const [agency] = await tx.select({ id: agencies.id, pioneerNumber: agencies.pioneerNumber, isDemo: agencies.isDemo }).from(agencies).where(eq(agencies.id, agencyId)).for("update");
    // Demo pages never carry a medal, except for the live check's QA letter, which is deleted right after.
    if (!agency || (agency.isDemo && !inv.qa)) return { ok: false as const, reason: "invalid" as const };
    if (agency.pioneerNumber) return { ok: false as const, reason: "already" as const };
    const [linked] = await tx.select({ id: pioneerInvitations.id }).from(pioneerInvitations).where(eq(pioneerInvitations.claimedAgencyId, agencyId));
    if (linked) return { ok: false as const, reason: "already" as const };
    await tx.update(pioneerInvitations).set({ claimedAgencyId: agencyId, claimedAt: new Date() }).where(eq(pioneerInvitations.id, inv.id));
    if (inv.prospectId) await tx.update(prospects).set({ status: "joined", agencyId, updatedAt: new Date() }).where(eq(prospects.id, inv.prospectId));
    await tx.insert((await import("@/lib/db/schema")).auditLogs).values({ actorUserId: by, action: "pioneer.linked", entity: "agency", entityId: agencyId, meta: { invitationId: inv.id } });
    return left > 0 ? { ok: true as const } : { ok: false as const, reason: "full" as const };
  });
}

export type MedalStatus =
  | { state: "none" }
  | { state: "awarded"; number: number }
  | { state: "pending"; checklist: { item: MedalItem; done: boolean }[]; left: number }
  | { state: "late"; checklist: { item: MedalItem; done: boolean }[] };

async function medalInput(agencyId: string): Promise<MedalInput | null> {
  const db = await getDb();
  const [a] = await db.select().from(agencies).where(eq(agencies.id, agencyId));
  if (!a) return null;
  const [{ packageCount }] = (await db.select({ packageCount: sql<number>`count(*)::int` }).from(packages).where(eq(packages.agencyId, agencyId))) as { packageCount: number }[];
  const [{ projects }] = (await db
    .select({ projects: sql<number>`count(*)::int` })
    .from(posts)
    .where(and(eq(posts.agencyId, agencyId), eq(posts.status, "published"), sql`exists (select 1 from ${postImages} where ${postImages.postId} = ${posts.id})`))) as { projects: number }[];
  return { avatarKey: a.avatarKey, bio: a.bio, services: a.services, platforms: a.platforms, startingPriceJod: a.startingPriceJod, packageCount: Number(packageCount), whatsapp: a.whatsapp, projectCount: Number(projects) };
}

/**
 * Gives the medal to a linked page the moment it is complete, if medals are left: the next
 * number in finishing order, under a lock so two pages never share a number or exceed the cap.
 * Called when the Studio or the setup is shown, which is right after every save.
 */
export async function awardMedalIfComplete(agencyId: string): Promise<MedalStatus> {
  const db = await getDb();
  const [inv] = await db.select().from(pioneerInvitations).where(eq(pioneerInvitations.claimedAgencyId, agencyId));
  if (!inv) return { state: "none" };
  if (inv.number) return { state: "awarded", number: inv.number };
  const input = await medalInput(agencyId);
  if (!input) return { state: "none" };
  const checklist = medalChecklist(input);
  const left = await medalsLeft();
  if (left <= 0) return { state: "late", checklist };
  if (!medalReady(input)) return { state: "pending", checklist, left };
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('pioneer_medals'))`);
    const [fresh] = await tx.select().from(pioneerInvitations).where(eq(pioneerInvitations.id, inv.id)).for("update");
    if (fresh?.number) return { state: "awarded" as const, number: fresh.number };
    const [{ max, given }] = (await tx.select({ max: sql<number | null>`max(${pioneerInvitations.number})`, given: sql<number>`count(${pioneerInvitations.number})::int` }).from(pioneerInvitations)) as { max: number | null; given: number }[];
    if (given >= PIONEER.cap) return { state: "late" as const, checklist };
    const number = (max ?? 0) + 1;
    await tx.update(pioneerInvitations).set({ number }).where(eq(pioneerInvitations.id, inv.id));
    await tx.update(agencies).set({ pioneerNumber: number }).where(eq(agencies.id, agencyId));
    await tx.insert((await import("@/lib/db/schema")).auditLogs).values({ actorUserId: null, action: "pioneer.awarded", entity: "agency", entityId: agencyId, meta: { number, invitationId: inv.id } });
    return { state: "awarded" as const, number };
  });
}

/** After sign-up: the code the landing page left in the cookie, used once and cleared. */
export async function claimPioneerFromCookie(agencyId: string, userId: string): Promise<ClaimResult | null> {
  const jar = await cookies();
  const code = jar.get(PIONEER.cookie)?.value;
  if (!code) return null;
  const result = await claimPioneer(agencyId, code, userId);
  jar.delete(PIONEER.cookie);
  return result;
}
