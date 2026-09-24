import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const CONSENT_VERSION = "2026-09";

export async function createUser(email: string, password: string, role: (typeof users.role.enumValues)[number] = "agency") {
  const db = await getDb();
  const [row] = await db
    .insert(users)
    .values({
      email: email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      role,
      consentVersion: CONSENT_VERSION,
      consentAt: new Date(),
    })
    .returning();
  return row;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  return row ?? null;
}

export async function deleteUser(userId: string) {
  const db = await getDb();
  await db.delete(users).where(eq(users.id, userId));
}
