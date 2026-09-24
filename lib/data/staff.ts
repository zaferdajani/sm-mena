import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull, ne } from "drizzle-orm";
import { ASSIGNABLE_ROLES, STAFF_ROLES, type AssignableRole } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/data/agencies";
import { CONSENT_VERSION } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { auditLogs, sessions, staffInvites, users } from "@/lib/db/schema";

/**
 * Team access. The owner invites staff with a role (admin, backbone,
 * maintenance, support), can time-box their access, change roles and disable
 * accounts. Nobody can demote, disable or reset the owner, and there is always
 * exactly one owner: ownership only moves by an explicit transfer the owner
 * confirms with their password and an authenticator code.
 */

export const INVITE_DAYS = 7;
const DAY = 24 * 3600 * 1000;
const hashToken = (token: string) => createHash("sha256").update(`sawwiq-staff:${token}`).digest("hex");

export type StaffError = "notFound" | "owner" | "self" | "role" | "emailTaken" | "expired" | "needsMfa" | "inactive";
export class StaffActionError extends Error {
  constructor(public code: StaffError) {
    super(code);
  }
}

const isAssignable = (role: string): role is AssignableRole => (ASSIGNABLE_ROLES as readonly string[]).includes(role);

async function staffMember(userId: string) {
  const db = await getDb();
  const [u] = await db.select().from(users).where(and(eq(users.id, userId), inArray(users.role, [...STAFF_ROLES])));
  if (!u) throw new StaffActionError("notFound");
  return u;
}

/** Guards every change to someone else's account: never the owner, never yourself. */
async function changeable(actorId: string, userId: string) {
  if (actorId === userId) throw new StaffActionError("self");
  const u = await staffMember(userId);
  if (u.role === "owner") throw new StaffActionError("owner");
  return u;
}

async function signOutEverywhere(userId: string) {
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function listStaff() {
  const db = await getDb();
  return db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      mfa: users.totpEnabledAt,
      lastLoginAt: users.lastLoginAt,
      staffExpiresAt: users.staffExpiresAt,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(inArray(users.role, [...STAFF_ROLES]))
    .orderBy(asc(users.createdAt));
}

export async function getOwner() {
  const db = await getDb();
  const [u] = await db.select().from(users).where(eq(users.role, "owner")).orderBy(asc(users.createdAt)).limit(1);
  return u ?? null;
}

// ---------- invitations ----------

export async function createStaffInvite(actorId: string, input: { email: string; role: string; accessUntil: Date | null }) {
  if (!isAssignable(input.role)) throw new StaffActionError("role");
  const email = input.email.trim().toLowerCase();
  const db = await getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) throw new StaffActionError("emailTaken");
  // One live invitation per address: a new one replaces the old link.
  await db.update(staffInvites).set({ revokedAt: new Date() }).where(and(eq(staffInvites.email, email), isNull(staffInvites.acceptedAt), isNull(staffInvites.revokedAt)));
  const token = randomBytes(24).toString("base64url");
  const [invite] = await db
    .insert(staffInvites)
    .values({ email, role: input.role, tokenHash: hashToken(token), accessUntil: input.accessUntil, expiresAt: new Date(Date.now() + INVITE_DAYS * DAY), createdBy: actorId })
    .returning();
  await audit(actorId, "staff.invite", "staff_invite", invite.id, { email, role: input.role, accessUntil: input.accessUntil?.toISOString() ?? null });
  return { invite, token };
}

export async function listPendingInvites() {
  const db = await getDb();
  return db
    .select()
    .from(staffInvites)
    .where(and(isNull(staffInvites.acceptedAt), isNull(staffInvites.revokedAt), gt(staffInvites.expiresAt, new Date())))
    .orderBy(desc(staffInvites.createdAt));
}

export async function revokeStaffInvite(actorId: string, inviteId: string) {
  const db = await getDb();
  await db.update(staffInvites).set({ revokedAt: new Date() }).where(and(eq(staffInvites.id, inviteId), isNull(staffInvites.acceptedAt)));
  await audit(actorId, "staff.invite_revoke", "staff_invite", inviteId);
}

/** A usable invitation (not accepted, revoked or expired), or null. */
export async function getInviteByToken(token: string) {
  if (!token || token.length > 100) return null;
  const db = await getDb();
  const [invite] = await db
    .select()
    .from(staffInvites)
    .where(and(eq(staffInvites.tokenHash, hashToken(token)), isNull(staffInvites.acceptedAt), isNull(staffInvites.revokedAt), gt(staffInvites.expiresAt, new Date())));
  if (!invite || !isAssignable(invite.role)) return null;
  return invite;
}

/** Creates the staff account from an invitation. The link works once. */
export async function acceptStaffInvite(token: string, password: string) {
  const invite = await getInviteByToken(token);
  if (!invite) throw new StaffActionError("expired");
  if (invite.accessUntil && invite.accessUntil < new Date()) throw new StaffActionError("expired");
  const db = await getDb();
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, invite.email));
  if (taken) throw new StaffActionError("emailTaken");
  const passwordHash = await hashPassword(password);
  const user = await db.transaction(async (tx) => {
    const claimed = await tx
      .update(staffInvites)
      .set({ acceptedAt: new Date() })
      .where(and(eq(staffInvites.id, invite.id), isNull(staffInvites.acceptedAt)))
      .returning({ id: staffInvites.id });
    if (!claimed.length) throw new StaffActionError("expired");
    const [row] = await tx
      .insert(users)
      .values({
        email: invite.email,
        passwordHash,
        role: invite.role,
        staffExpiresAt: invite.accessUntil,
        invitedBy: invite.createdBy,
        consentVersion: CONSENT_VERSION,
        consentAt: new Date(),
      })
      .returning();
    return row;
  });
  await audit(user.id, "staff.accept", "user", user.id, { role: user.role, invitedBy: invite.createdBy });
  return user;
}

// ---------- changes to staff accounts (owner only; enforced in the actions) ----------

export async function setStaffRole(actorId: string, userId: string, role: string) {
  if (!isAssignable(role)) throw new StaffActionError("role");
  const u = await changeable(actorId, userId);
  if (u.role === role) return;
  const db = await getDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
  await signOutEverywhere(userId); // new permissions apply from the next sign-in
  await audit(actorId, "staff.role", "user", userId, { from: u.role, to: role });
}

export async function setStaffDisabled(actorId: string, userId: string, disabled: boolean) {
  await changeable(actorId, userId);
  const db = await getDb();
  await db.update(users).set({ disabledAt: disabled ? new Date() : null }).where(eq(users.id, userId));
  if (disabled) await signOutEverywhere(userId);
  await audit(actorId, disabled ? "staff.disable" : "staff.enable", "user", userId);
}

export async function setStaffExpiry(actorId: string, userId: string, until: Date | null) {
  await changeable(actorId, userId);
  const db = await getDb();
  await db.update(users).set({ staffExpiresAt: until }).where(eq(users.id, userId));
  if (until && until <= new Date()) await signOutEverywhere(userId);
  await audit(actorId, "staff.expiry", "user", userId, { until: until?.toISOString() ?? null });
}

/**
 * Hands ownership to another active staff member who has two-factor sign-in
 * on. The previous owner stays on as admin. The caller must have checked the
 * owner's password and authenticator code.
 */
export async function transferOwnership(ownerId: string, targetId: string) {
  if (ownerId === targetId) throw new StaffActionError("self");
  const owner = await staffMember(ownerId);
  if (owner.role !== "owner") throw new StaffActionError("owner");
  const target = await staffMember(targetId);
  if (target.disabledAt || (target.staffExpiresAt && target.staffExpiresAt < new Date())) throw new StaffActionError("inactive");
  if (!target.totpEnabledAt) throw new StaffActionError("needsMfa");
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.update(users).set({ role: "admin" }).where(eq(users.id, ownerId));
    await tx.update(users).set({ role: "owner", staffExpiresAt: null, disabledAt: null }).where(eq(users.id, targetId));
  });
  await signOutEverywhere(targetId);
  await audit(ownerId, "ownership.transfer", "user", targetId, { from: owner.email, to: target.email });
}

/**
 * Boot-time safety net (runs with the seed): the platform always has one
 * owner. Promotes the configured admin email, else the oldest admin. Never
 * creates a second owner.
 */
export async function ensureOwner(preferredEmail?: string) {
  if (await getOwner()) return null;
  const db = await getDb();
  const email = preferredEmail?.trim().toLowerCase();
  const [preferred] = email ? await db.select().from(users).where(and(eq(users.email, email), ne(users.role, "agency"))) : [];
  const [oldest] = preferred ? [preferred] : await db.select().from(users).where(eq(users.role, "admin")).orderBy(asc(users.createdAt)).limit(1);
  if (!oldest) return null;
  await db.update(users).set({ role: "owner", staffExpiresAt: null, disabledAt: null }).where(eq(users.id, oldest.id));
  await audit(null, "ownership.assign", "user", oldest.id, { email: oldest.email });
  return oldest.email;
}

/**
 * Break-glass for a locked-out owner, run at boot by the seed when the
 * OWNER_RECOVERY_EMAIL secret is set (only whoever controls the hosting
 * secrets can do this). Clears the owner's two-factor sign-in, optionally sets
 * a new password, and signs them out everywhere. Only ever touches the owner.
 */
export async function recoverOwner(email: string, newPassword?: string) {
  const db = await getDb();
  const [owner] = await db.select().from(users).where(and(eq(users.email, email.trim().toLowerCase()), eq(users.role, "owner")));
  if (!owner) return false;
  const patch: Partial<typeof users.$inferInsert> = { totpSecretEnc: null, totpPendingEnc: null, totpEnabledAt: null, totpLastStep: 0, backupCodeHashes: [], disabledAt: null };
  if (newPassword && newPassword.length >= 12) patch.passwordHash = await hashPassword(newPassword);
  await db.update(users).set(patch).where(eq(users.id, owner.id));
  await signOutEverywhere(owner.id);
  await db.insert(auditLogs).values({ actorUserId: null, action: "ownership.recovery", entity: "user", entityId: owner.id, meta: { password: Boolean(patch.passwordHash) } });
  return true;
}
