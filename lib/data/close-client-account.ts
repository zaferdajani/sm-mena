import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { destroyAllSessions } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ownerMatches, ownerNeeds, users } from "@/lib/db/schema";
import { audit } from "./agencies";

// A business owner closes their account (docs/08). They sign in with an email
// code, so there is no password to confirm; they type their email instead.
// The account can't sign in again (support can reopen it). What they told us
// about their needs is deleted, and providers they had not yet been introduced
// to are no longer offered them. Saved work and follows stay with the closed
// account, out of sight, so support can reopen it as it was.

/** Closes a business owner's (client) account. Returns false when it isn't one. */
export async function closeClientAccount(userId: string) {
  const db = await getDb();
  const closed = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(users)
      .set({ disabledAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.role, "client")))
      .returning({ id: users.id });
    if (!row) return false;
    await tx.delete(ownerNeeds).where(eq(ownerNeeds.userId, userId));
    await tx.delete(ownerMatches).where(and(eq(ownerMatches.ownerUserId, userId), inArray(ownerMatches.status, ["suggested", "sent"])));
    return true;
  });
  if (!closed) return false;
  await destroyAllSessions(userId);
  await audit(userId, "account.close", "user", userId, { by: "self", role: "client" });
  return true;
}
