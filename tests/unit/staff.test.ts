import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { confirmEnrollment, startEnrollment } from "@/lib/auth/mfa";
import { ASSIGNABLE_ROLES, PERMISSIONS, STAFF_ROLES, can, isStaffRole, permissionsOf } from "@/lib/auth/permissions";
import { adminAccess } from "@/lib/auth/policy";
import { verifyPassword } from "@/lib/auth/password";
import { currentStep, totpAt } from "@/lib/auth/totp";
import {
  acceptStaffInvite,
  createStaffInvite,
  ensureOwner,
  getInviteByToken,
  getOwner,
  listPendingInvites,
  listStaff,
  revokeStaffInvite,
  setStaffDisabled,
  setStaffExpiry,
  setStaffRole,
  transferOwnership,
} from "@/lib/data/staff";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { auditLogs, sessions, users } from "@/lib/db/schema";

afterAll(() => closeDb());

describe("permission matrix", () => {
  it("gives the owner everything and keeps staff management owner-only", () => {
    expect(permissionsOf("owner")).toEqual([...PERMISSIONS]);
    for (const role of ASSIGNABLE_ROLES) {
      expect(can(role, "staff.manage")).toBe(false);
      expect(can(role, "payments.export")).toBe(false);
      expect(can(role, "demo.remove")).toBe(false);
      expect(can(role, "dashboard.view")).toBe(true);
    }
    expect(ASSIGNABLE_ROLES).not.toContain("owner");
  });

  it("scopes each team to its job", () => {
    expect(can("support", "support.manage")).toBe(true);
    expect(can("support", "content.moderate")).toBe(true);
    expect(can("support", "payments.view")).toBe(false);
    expect(can("support", "system.view")).toBe(false);
    expect(can("support", "bugs.manage")).toBe(false);

    expect(can("maintenance", "system.view")).toBe(true);
    expect(can("maintenance", "bugs.manage")).toBe(true);
    expect(can("maintenance", "users.view")).toBe(false);
    expect(can("maintenance", "payments.view")).toBe(false);

    expect(can("backbone", "audit.view")).toBe(true);
    expect(can("backbone", "agencies.view")).toBe(true);
    expect(can("backbone", "agencies.moderate")).toBe(false);
    expect(can("backbone", "escrow.resolve")).toBe(false);

    expect(can("admin", "escrow.resolve")).toBe(true);
    expect(can("agency", "dashboard.view")).toBe(false);
    expect(can(undefined, "dashboard.view")).toBe(false);
  });

  it("checks two-factor first, then the permission", () => {
    expect(STAFF_ROLES.every(isStaffRole)).toBe(true);
    expect(isStaffRole("agency")).toBe(false);
    expect(adminAccess({ role: "support", mfaEnabled: false }, true, "support.manage")).toBe("enroll");
    expect(adminAccess({ role: "support", mfaEnabled: true }, true, "support.manage")).toBe("ok");
    expect(adminAccess({ role: "support", mfaEnabled: true }, true, "payments.view")).toBe("forbidden");
    expect(adminAccess({ role: "maintenance", mfaEnabled: true }, true, "system.view")).toBe("ok");
    expect(adminAccess({ role: "admin", mfaEnabled: true }, true, "staff.manage")).toBe("forbidden");
    expect(adminAccess({ role: "owner", mfaEnabled: true }, true, "staff.manage")).toBe("ok");
  });
});

describe("team access", () => {
  let ownerId: string;
  beforeAll(async () => {
    // The seed's safety net: the configured admin becomes the one owner.
    const admin = await createUser("boss@t.jo", "password-1234", "admin");
    await createUser("other-admin@t.jo", "password-1234", "admin");
    expect(await ensureOwner("boss@t.jo")).toBe("boss@t.jo");
    expect(await ensureOwner("other-admin@t.jo")).toBeNull(); // never a second owner
    ownerId = admin.id;
    expect((await getOwner())?.id).toBe(ownerId);
  });

  it("invites with a single-use link and creates the staff account", async () => {
    const until = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    const { token } = await createStaffInvite(ownerId, { email: "Help@T.jo", role: "support", accessUntil: until });
    expect((await listPendingInvites()).map((i) => i.email)).toContain("help@t.jo");
    expect(await getInviteByToken("wrong-token-value")).toBeNull();
    await expect(createStaffInvite(ownerId, { email: "x@t.jo", role: "owner", accessUntil: null })).rejects.toThrow("role");

    const user = await acceptStaffInvite(token, "a-long-password-1");
    expect(user).toMatchObject({ email: "help@t.jo", role: "support", invitedBy: ownerId });
    expect(user.staffExpiresAt?.getTime()).toBe(until.getTime());
    expect(await verifyPassword("a-long-password-1", user.passwordHash)).toBe(true);
    await expect(acceptStaffInvite(token, "a-long-password-1")).rejects.toThrow("expired"); // once only
    await expect(createStaffInvite(ownerId, { email: "help@t.jo", role: "admin", accessUntil: null })).rejects.toThrow("emailTaken");
  });

  it("cancelled invitations stop working and a new one replaces the old link", async () => {
    const first = await createStaffInvite(ownerId, { email: "dev@t.jo", role: "backbone", accessUntil: null });
    const second = await createStaffInvite(ownerId, { email: "dev@t.jo", role: "backbone", accessUntil: null });
    expect(await getInviteByToken(first.token)).toBeNull();
    await revokeStaffInvite(ownerId, second.invite.id);
    await expect(acceptStaffInvite(second.token, "a-long-password-1")).rejects.toThrow("expired");
  });

  it("changes roles, time-boxes and switches staff off, signing them out", async () => {
    const { token } = await createStaffInvite(ownerId, { email: "ops@t.jo", role: "maintenance", accessUntil: null });
    const ops = await acceptStaffInvite(token, "a-long-password-1");
    const db = await getDb();
    const addSession = () => db.insert(sessions).values({ id: `s-${Math.random()}`, userId: ops.id, expiresAt: new Date(Date.now() + 3600_000) });
    const sessionCount = async () => (await db.select().from(sessions).where(eq(sessions.userId, ops.id))).length;

    await addSession();
    await setStaffRole(ownerId, ops.id, "backbone");
    expect(await sessionCount()).toBe(0);

    await addSession();
    await setStaffDisabled(ownerId, ops.id, true);
    expect(await sessionCount()).toBe(0);
    expect((await listStaff()).find((s) => s.id === ops.id)?.disabledAt).toBeTruthy();
    await setStaffDisabled(ownerId, ops.id, false);

    await addSession();
    await setStaffExpiry(ownerId, ops.id, new Date(Date.now() - 1000));
    expect(await sessionCount()).toBe(0);

    const actions = (await db.select().from(auditLogs).where(eq(auditLogs.entityId, ops.id))).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["staff.accept", "staff.role", "staff.disable", "staff.enable", "staff.expiry"]));
  });

  it("never lets anyone demote, disable or time-box the owner", async () => {
    const [admin] = await (await getDb()).select().from(users).where(eq(users.email, "other-admin@t.jo"));
    await expect(setStaffRole(admin.id, ownerId, "support")).rejects.toThrow("owner");
    await expect(setStaffDisabled(admin.id, ownerId, true)).rejects.toThrow("owner");
    await expect(setStaffExpiry(admin.id, ownerId, new Date())).rejects.toThrow("owner");
    await expect(setStaffRole(ownerId, ownerId, "admin")).rejects.toThrow("self");
    // Only the owner can hand over ownership.
    await expect(transferOwnership(admin.id, ownerId)).rejects.toThrow("owner");
  });

  it("hands over ownership only to an active member with two-factor on", async () => {
    const { token } = await createStaffInvite(ownerId, { email: "next@t.jo", role: "admin", accessUntil: null });
    const next = await acceptStaffInvite(token, "a-long-password-1");
    await expect(transferOwnership(ownerId, next.id)).rejects.toThrow("needsMfa");

    const { secret } = await startEnrollment(next.id, next.email);
    await confirmEnrollment(next.id, totpAt(secret, currentStep()));
    await transferOwnership(ownerId, next.id);

    const staff = await listStaff();
    expect(staff.filter((s) => s.role === "owner").map((s) => s.id)).toEqual([next.id]);
    expect(staff.find((s) => s.id === ownerId)?.role).toBe("admin");
    expect(await ensureOwner("boss@t.jo")).toBeNull(); // the seed doesn't take it back
  });
});

describe("owner recovery", () => {
  it("clears only the owner's two-factor sign-in and can set a new password", async () => {
    const { recoverOwner } = await import("@/lib/data/staff");
    const owner = (await getOwner())!;
    expect(owner.totpEnabledAt).toBeTruthy();
    expect(await recoverOwner("boss@t.jo", "a-brand-new-password")).toBe(false); // an admin now, not the owner
    expect(await recoverOwner(owner.email, "a-brand-new-password")).toBe(true);
    const after = (await getOwner())!;
    expect(after.totpEnabledAt).toBeNull();
    expect(await verifyPassword("a-brand-new-password", after.passwordHash)).toBe(true);
  });
});
