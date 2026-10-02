import { existsSync } from "node:fs";
import path from "node:path";
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { agencies, pioneerInvitations, prospects, type PioneerInvitation } from "@/lib/db/schema";
import { PIONEER, inviteExpiry, invitationState, isPioneerCode, newPioneerCode, normalizePioneerCode, type InvitationState } from "@/lib/pioneers";
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
  | { ok: true; number: number }
  | { ok: false; reason: "invalid" | "claimed" | "expired" | "already" | "notWatched" | "full" };

/**
 * The medal goes from the letter to the page once, numbered in claim order. The first
 * PIONEER.cap invited names who finished the video and registered get №1…№cap; anyone
 * after that still joins (early-member benefits) and the letter is recorded as "late".
 */
export async function claimPioneer(agencyId: string, raw: unknown, by: string | null, { requireWatched = introVideoDeployed() } = {}): Promise<ClaimResult> {
  const code = normalizePioneerCode(raw);
  if (!isPioneerCode(code)) return { ok: false, reason: "invalid" };
  const db = await getDb();
  return db.transaction(async (tx) => {
    // One claim at a time, so two people can never get the same number or the 51st medal.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('pioneer_medals'))`);
    const [inv] = await tx.select().from(pioneerInvitations).where(eq(pioneerInvitations.code, code)).for("update");
    if (!inv) return { ok: false as const, reason: "invalid" as const };
    if (inv.claimedAgencyId) return { ok: false as const, reason: inv.claimedAgencyId === agencyId ? ("already" as const) : ("claimed" as const) };
    if (inv.expiresAt.getTime() < Date.now()) return { ok: false as const, reason: "expired" as const };
    if (requireWatched && !inv.watchedAt) return { ok: false as const, reason: "notWatched" as const };
    const [agency] = await tx.select({ id: agencies.id, pioneerNumber: agencies.pioneerNumber, isDemo: agencies.isDemo }).from(agencies).where(eq(agencies.id, agencyId)).for("update");
    if (!agency || agency.isDemo) return { ok: false as const, reason: "invalid" as const };
    if (agency.pioneerNumber) return { ok: false as const, reason: "already" as const };
    const [{ max }] = (await tx.select({ max: sql<number | null>`max(${pioneerInvitations.number})` }).from(pioneerInvitations)) as { max: number | null }[];
    const number = (max ?? 0) + 1;
    const late = number > PIONEER.cap;
    await tx.update(pioneerInvitations).set({ claimedAgencyId: agencyId, claimedAt: new Date(), number: late ? null : number }).where(eq(pioneerInvitations.id, inv.id));
    if (!late) await tx.update(agencies).set({ pioneerNumber: number }).where(eq(agencies.id, agencyId));
    if (inv.prospectId) await tx.update(prospects).set({ status: "joined", agencyId, updatedAt: new Date() }).where(eq(prospects.id, inv.prospectId));
    await tx.insert((await import("@/lib/db/schema")).auditLogs).values({ actorUserId: by, action: late ? "pioneer.late" : "pioneer.claimed", entity: "agency", entityId: agencyId, meta: { number: late ? null : number, invitationId: inv.id } });
    return late ? { ok: false as const, reason: "full" as const } : { ok: true as const, number };
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
