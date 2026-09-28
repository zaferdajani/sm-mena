import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { collabAiUsage } from "@/lib/db/schema";

// The planner's daily assistant budget (docs/50, AC23): one row per agency
// and UTC day, reserved with a single atomic upsert before any model call.
// It lives in its own table, so deleting plans never refunds calls, and it is
// the same row for every serverless instance.

export const ASSISTANT_DAILY_BUDGET = 20;

export const usageDay = (now = new Date()) => now.toISOString().slice(0, 10);

/**
 * Reserves one call for today. Returns true when the reservation fits the
 * budget and false when the day's budget is already spent. Concurrent calls
 * serialise on the row: at most `budget` reservations succeed per day.
 */
export async function reserveAssistantCall(agencyId: string, now = new Date(), budget = ASSISTANT_DAILY_BUDGET): Promise<boolean> {
  if (budget <= 0) return false;
  const db = await getDb();
  const day = usageDay(now);
  const rows = await db
    .insert(collabAiUsage)
    .values({ agencyId, day, used: 1, updatedAt: now })
    .onConflictDoUpdate({
      target: [collabAiUsage.agencyId, collabAiUsage.day],
      set: { used: sql`${collabAiUsage.used} + 1`, updatedAt: now },
      setWhere: sql`${collabAiUsage.used} < ${budget}`,
    })
    .returning({ used: collabAiUsage.used });
  return rows.length > 0;
}

/** Calls already reserved today (for the form's hint); never used to decide a reservation. */
export async function assistantCallsUsed(agencyId: string, now = new Date()) {
  const db = await getDb();
  const [row] = await db.select({ used: collabAiUsage.used }).from(collabAiUsage).where(and(eq(collabAiUsage.agencyId, agencyId), eq(collabAiUsage.day, usageDay(now))));
  return row?.used ?? 0;
}
