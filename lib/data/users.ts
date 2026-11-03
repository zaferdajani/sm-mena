import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import { consentLog, users } from "@/lib/db/schema";

export const CONSENT_VERSION = "2026-11";

/** `marketing`: the person ticked the optional emails box. `ageConfirmed`: the person confirmed at sign-up that they are 18 or older, or of age where they live if higher (docs/08). */
export async function createUser(email: string, password: string, role: (typeof users.role.enumValues)[number] = "agency", { ageConfirmed = false, marketing = false } = {}) {
  const db = await getDb();
  const [row] = await db
    .insert(users)
    .values({
      email: email.trim().toLowerCase(),
      passwordHash: await hashPassword(password),
      role,
      consentVersion: CONSENT_VERSION,
      consentAt: new Date(),
      ageConfirmedAt: ageConfirmed ? new Date() : null,
    })
    .returning();
  await recordConsent(row.id, [
    { kind: "privacy" },
    ...(ageConfirmed ? [{ kind: "age" }] : []),
    // The optional marketing box is never pre-ticked: only a ticked box leaves a row.
    ...(marketing ? [{ kind: "marketing" }] : []),
  ]);
  return row;
}

/** Writes consent rows (kind, current policy version, now) to the append-only log. */
export async function recordConsent(userId: string, entries: { kind: string; granted?: boolean }[]) {
  const db = await getDb();
  await db.insert(consentLog).values(entries.map((e) => ({ userId, kind: e.kind, policyVersion: CONSENT_VERSION, granted: e.granted ?? true })));
}

/** Records the 18+ declaration for an account made before the rule (docs/08). */
export async function confirmAge(userId: string) {
  const db = await getDb();
  await db.update(users).set({ ageConfirmedAt: new Date() }).where(eq(users.id, userId));
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
