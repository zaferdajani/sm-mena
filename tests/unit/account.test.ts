import "./setup-db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { verifyPassword } from "@/lib/auth/password";
import { changeEmailSchema, changePasswordSchema } from "@/lib/account-schema";
import { changeEmail, changePassword } from "@/lib/data/account";
import { createUser, getUserByEmail } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";

describe("sign-in details", () => {
  it("changes the email only with the right password and never onto another account's address", async () => {
    const me = await createUser("owner-old@account.jo", "password-123", "admin");
    await createUser("someone@account.jo", "password-123");
    expect(await changeEmail(me.id, { email: "owner-new@account.jo", password: "wrong-pass", code: "" })).toBe("badPassword");
    expect(await changeEmail(me.id, { email: "someone@account.jo", password: "password-123", code: "" })).toBe("emailTaken");
    expect(await changeEmail(me.id, { email: "owner-new@account.jo", password: "password-123", code: "" })).toBeNull();
    expect((await getUserByEmail("owner-new@account.jo"))?.id).toBe(me.id);
    // The audit entry records the change but not the addresses.
    const logs = await (await getDb()).select().from(auditLogs).where(eq(auditLogs.entityId, me.id));
    const entry = logs.find((l) => l.action === "account.email_changed");
    expect(entry).toBeTruthy();
    expect(JSON.stringify(entry?.meta)).not.toContain("@");
  });

  it("changes the password after checking the current one", async () => {
    const me = await createUser("pass@account.jo", "password-123");
    expect(await changePassword(me.id, { password: "nope-nope", newPassword: "new-password-1", code: "" })).toBe("badPassword");
    expect(await changePassword(me.id, { password: "password-123", newPassword: "password-123", code: "" })).toBe("samePassword");
    expect(await changePassword(me.id, { password: "password-123", newPassword: "new-password-1", code: "" })).toBeNull();
    const [row] = await (await getDb()).select({ hash: users.passwordHash }).from(users).where(eq(users.id, me.id));
    expect(await verifyPassword("new-password-1", row.hash)).toBe(true);
  });

  it("validates the forms", () => {
    expect(changeEmailSchema.safeParse({ email: " New@Mail.JO ", password: "x" }).data?.email).toBe("new@mail.jo");
    expect(changePasswordSchema.safeParse({ password: "x", newPassword: "short", confirm: "short" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ password: "x", newPassword: "long-enough", confirm: "different" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ password: "x", newPassword: "long-enough", confirm: "long-enough" }).success).toBe(true);
  });
});
