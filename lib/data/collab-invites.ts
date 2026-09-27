import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, collabInvites, collabRoster, partnerRequests, type Agency } from "@/lib/db/schema";
import { addDays } from "@/lib/collab/time";
import { COOLDOWN_DAYS, INVITE_DAYS } from "@/lib/collab/types";
import { isBlockedEitherWay } from "./collab-blocks";
import { addNotifications } from "./notifications";
import { ROLE_KEYS } from "@/lib/services/catalog";

// Invitation links (docs/48 §invites). The sender hands a link to someone
// they already work with; Sawwiq stores only a hash, and accepting makes the
// two accepted partners through the existing partner request, never a new
// or duplicate provider record.

const hash = (token: string) => createHash("sha256").update(`collab-invite:${token}`).digest("hex");

export async function createInvite(from: Agency, input: { label: string; roles: string[] }) {
  const token = randomBytes(24).toString("base64url");
  const db = await getDb();
  const [row] = await db
    .insert(collabInvites)
    .values({ fromAgencyId: from.id, tokenHash: hash(token), label: input.label.slice(0, 60), roles: input.roles.filter((r) => ROLE_KEYS.includes(r)).slice(0, 6), expiresAt: addDays(new Date(), INVITE_DAYS) })
    .returning();
  return { invite: row, token };
}

export async function listInvites(fromId: string) {
  const db = await getDb();
  return db.select().from(collabInvites).where(eq(collabInvites.fromAgencyId, fromId)).orderBy(desc(collabInvites.createdAt)).limit(50);
}

export async function revokeInvite(fromId: string, id: string) {
  const db = await getDb();
  const rows = await db
    .update(collabInvites)
    .set({ status: "revoked", respondedAt: new Date() })
    .where(and(eq(collabInvites.id, id), eq(collabInvites.fromAgencyId, fromId), eq(collabInvites.status, "pending")))
    .returning({ id: collabInvites.id });
  return rows.length > 0;
}

export type InviteView = { id: string; status: "pending" | "accepted" | "declined" | "expired" | "revoked"; roles: string[]; from: { id: string; name: string; handle: string; kind: "agency" | "freelancer"; city: string } };

/** What the link shows anyone who opens it: who invites, for which roles, and whether it is still open. */
export async function inviteByToken(token: string): Promise<InviteView | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ invite: collabInvites, from: { id: agencies.id, name: agencies.name, handle: agencies.handle, kind: agencies.kind, city: agencies.city } })
    .from(collabInvites)
    .innerJoin(agencies, eq(collabInvites.fromAgencyId, agencies.id))
    .where(eq(collabInvites.tokenHash, hash(token)));
  if (!row) return null;
  const status = row.invite.status === "pending" && row.invite.expiresAt <= new Date() ? "expired" : (row.invite.status as InviteView["status"]);
  return { id: row.invite.id, status, roles: row.invite.roles, from: row.from };
}

export type AcceptResult = { ok: true; fromId: string; alreadyPartners: boolean } | { error: "notFound" | "expired" | "self" | "blocked" | "cooldown" };

/**
 * The invited provider, signed in, accepts: the two become accepted partners
 * (one existing partner-request row, reused if present) and the sender's
 * roster gets the provider. Retrying the same acceptance returns the same
 * outcome; nobody is created twice.
 */
export async function acceptInvite(me: Agency, token: string): Promise<AcceptResult> {
  const db = await getDb();
  const [inv] = await db.select().from(collabInvites).where(eq(collabInvites.tokenHash, hash(token)));
  if (!inv) return { error: "notFound" };
  if (inv.fromAgencyId === me.id) return { error: "self" };
  if (inv.status === "accepted" && inv.acceptedAgencyId === me.id) return { ok: true, fromId: inv.fromAgencyId, alreadyPartners: true };
  if (inv.status !== "pending") return { error: "notFound" };
  if (inv.expiresAt <= new Date()) {
    await db.update(collabInvites).set({ status: "expired" }).where(eq(collabInvites.id, inv.id));
    return { error: "expired" };
  }
  if (await isBlockedEitherWay(me.id, inv.fromAgencyId)) return { error: "blocked" };
  const [recentDecline] = await db
    .select({ id: partnerRequests.id })
    .from(partnerRequests)
    .where(and(eq(partnerRequests.status, "declined"), gt(partnerRequests.respondedAt, addDays(new Date(), -COOLDOWN_DAYS)), or(and(eq(partnerRequests.fromAgencyId, me.id), eq(partnerRequests.toAgencyId, inv.fromAgencyId)), and(eq(partnerRequests.fromAgencyId, inv.fromAgencyId), eq(partnerRequests.toAgencyId, me.id)))));
  if (recentDecline) return { error: "cooldown" };
  const pair = or(and(eq(partnerRequests.fromAgencyId, me.id), eq(partnerRequests.toAgencyId, inv.fromAgencyId)), and(eq(partnerRequests.fromAgencyId, inv.fromAgencyId), eq(partnerRequests.toAgencyId, me.id)));
  let alreadyPartners = false;
  await db.transaction(async (tx) => {
    const [claimed] = await tx
      .update(collabInvites)
      .set({ status: "accepted", acceptedAgencyId: me.id, respondedAt: new Date() })
      .where(and(eq(collabInvites.id, inv.id), eq(collabInvites.status, "pending")))
      .returning({ id: collabInvites.id });
    if (!claimed) throw new Error("raced");
    const [accepted] = await tx.select({ id: partnerRequests.id }).from(partnerRequests).where(and(eq(partnerRequests.status, "accepted"), pair)).limit(1);
    if (accepted) alreadyPartners = true;
    else {
      const [pending] = await tx.select({ id: partnerRequests.id }).from(partnerRequests).where(and(eq(partnerRequests.status, "pending"), pair)).limit(1);
      if (pending) await tx.update(partnerRequests).set({ status: "accepted", respondedAt: new Date() }).where(eq(partnerRequests.id, pending.id));
      else await tx.insert(partnerRequests).values({ fromAgencyId: inv.fromAgencyId, toAgencyId: me.id, roles: inv.roles, message: "", status: "accepted", respondedAt: new Date() });
    }
    await tx.insert(collabRoster).values({ ownerAgencyId: inv.fromAgencyId, providerAgencyId: me.id, groupName: "", tags: inv.roles }).onConflictDoNothing();
    await addNotifications([{ agencyId: inv.fromAgencyId, kind: "invite_accepted", href: "/studio/collab/network", params: { name: me.name } }], tx);
  }).catch((e) => {
    if (!(e instanceof Error && e.message === "raced")) throw e;
  });
  const [after] = await db.select({ status: collabInvites.status, acceptedAgencyId: collabInvites.acceptedAgencyId }).from(collabInvites).where(eq(collabInvites.id, inv.id));
  if (after?.status === "accepted" && after.acceptedAgencyId === me.id) return { ok: true, fromId: inv.fromAgencyId, alreadyPartners };
  return { error: "notFound" };
}

export async function declineInvite(me: Agency, token: string) {
  const db = await getDb();
  const rows = await db
    .update(collabInvites)
    .set({ status: "declined", respondedAt: new Date() })
    .where(and(eq(collabInvites.tokenHash, hash(token)), eq(collabInvites.status, "pending"), ne(collabInvites.fromAgencyId, me.id)))
    .returning({ id: collabInvites.id });
  return rows.length > 0;
}
