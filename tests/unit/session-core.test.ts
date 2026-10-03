import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashToken, issueSession, pendingMfaUserByToken, revokeAllForUser, revokeToken, rotateSession, sessionUserByToken } from "@/lib/auth/session-core";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";

// Sessions without a transport (roadmap §3 step 6): the cookie and the bearer API share these rows.

let owner: { id: string };
let staff: { id: string };

beforeAll(async () => {
  owner = await createUser("session-owner@t.jo", "password-1234");
  staff = await createUser("session-staff@t.jo", "password-1234", "support");
});
afterAll(async () => {
  await closeDb();
});

describe("session core", () => {
  it("issues a token, stores only its hash and finds the user by the raw token", async () => {
    const issued = await issueSession(owner.id);
    expect(issued.mfaPending).toBe(false);
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);
    const db = await getDb();
    const rows = await db.select().from(sessions).where(eq(sessions.id, hashToken(issued.token)));
    expect(rows).toHaveLength(1);
    expect(rows[0].id).not.toBe(issued.token);
    const user = await sessionUserByToken(issued.token);
    expect(user).toMatchObject({ id: owner.id, email: "session-owner@t.jo", role: "agency", mfaEnabled: false });
    expect(await sessionUserByToken("not-a-token")).toBeNull();
    expect(await sessionUserByToken(null)).toBeNull();
  });

  it("a pending two-factor session grants nothing until it is completed", async () => {
    const pending = await issueSession(owner.id, { mfaPending: true });
    expect(pending.expiresAt.getTime()).toBeLessThan(Date.now() + 11 * 60 * 1000);
    expect(await sessionUserByToken(pending.token)).toBeNull();
    expect((await pendingMfaUserByToken(pending.token))?.id).toBe(owner.id);
  });

  it("expired, disabled and lapsed-staff sessions are invalid", async () => {
    const db = await getDb();
    const expired = await issueSession(owner.id);
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(sessions.id, hashToken(expired.token)));
    expect(await sessionUserByToken(expired.token)).toBeNull();

    const lapsed = await issueSession(staff.id);
    await db.update(users).set({ staffExpiresAt: new Date(Date.now() - 1000) }).where(eq(users.id, staff.id));
    expect(await sessionUserByToken(lapsed.token)).toBeNull();
    await db.update(users).set({ staffExpiresAt: null }).where(eq(users.id, staff.id));
    expect((await sessionUserByToken(lapsed.token))?.id).toBe(staff.id);

    await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, staff.id));
    expect(await sessionUserByToken(lapsed.token)).toBeNull();
    await db.update(users).set({ disabledAt: null }).where(eq(users.id, staff.id));
  });

  it("revokes one token, rotates a token, and revokes every session of a user", async () => {
    const a = await issueSession(owner.id);
    const b = await issueSession(owner.id);
    await revokeToken(a.token);
    expect(await sessionUserByToken(a.token)).toBeNull();
    expect((await sessionUserByToken(b.token))?.id).toBe(owner.id);

    const rotated = await rotateSession(b.token);
    expect(rotated?.token).not.toBe(b.token);
    expect(await sessionUserByToken(b.token)).toBeNull();
    expect((await sessionUserByToken(rotated!.token))?.id).toBe(owner.id);
    expect(await rotateSession(b.token)).toBeNull();

    await issueSession(owner.id);
    await revokeAllForUser(owner.id);
    const db = await getDb();
    expect(await db.select().from(sessions).where(eq(sessions.userId, owner.id))).toHaveLength(0);
    await revokeToken(undefined); // a no-op, never a throw
  });
});
