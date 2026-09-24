import "server-only";
import { listStripAgencies, toSummary, type AgencySummary } from "@/lib/data/agencies";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";
import { activePromotions } from "@/lib/monetization/promotions";
import { PROMOTION_RULES } from "@/lib/monetization/plans";
import { inArray } from "drizzle-orm";

/** Strip agencies with at most one sponsored agency after the first organic ones. */
export async function stripAgencies(country?: string): Promise<(AgencySummary & { sponsored?: boolean })[]> {
  const organic = await listStripAgencies(20, country);
  const promos = await activePromotions("strip", { country });
  if (!promos.length) return organic;
  const pick = promos[Math.floor(Math.random() * promos.length)];
  const db = await getDb();
  const [row] = await db.select().from(agencies).where(inArray(agencies.id, [pick.agencyId]));
  if (!row) return organic;
  const rest = organic.filter((a) => a.id !== row.id);
  return [...rest.slice(0, PROMOTION_RULES.stripAfter), { ...toSummary(row), sponsored: true }, ...rest.slice(PROMOTION_RULES.stripAfter)];
}
