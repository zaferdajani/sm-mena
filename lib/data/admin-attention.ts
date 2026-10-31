import "server-only";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { bugCounts } from "./bugs";
import { disputesNeedingDecision } from "./contract-disputes";
import { pendingTagCount } from "@/lib/services/tags";

/**
 * What is waiting for the platform owner, each with the page that handles it: the admin menu badges and
 * the dashboard's "Needs your attention" list read the same numbers, so a badge always leads to its items.
 */
export async function adminAttention() {
  const db = await getDb();
  const [bugs, services, [openReports], disputes] = await Promise.all([
    bugCounts(),
    pendingTagCount(),
    db.select({ n: count() }).from(reports).where(and(eq(reports.status, "open"))),
    disputesNeedingDecision(),
  ]);
  return {
    supportReports: bugs.newReports,
    siteErrors: bugs.open + bugs.investigating,
    services,
    postReports: openReports.n,
    disputes: disputes.length,
  };
}

export type AdminAttention = Awaited<ReturnType<typeof adminAttention>>;
