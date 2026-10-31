import { and, gte, inArray, sql } from "drizzle-orm";
import { getDb, type DB } from "@/lib/db";
import { events } from "@/lib/db/schema";

// Onboarding funnel (docs/65 stage 5): a count per step, never who. Rows carry at most the agency id
// (so "published within 24 h of sign-up" can be measured) and never a name, email or phone.

export const FUNNEL_STEPS = ["join_view", "account_created", "first_photo_uploaded", "page_published", "link_shared"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

type Executor = Pick<DB, "insert" | "select">;

export async function recordFunnel(step: FunnelStep, agencyId: string | null = null, ex?: Executor) {
  const db = ex ?? (await getDb());
  await db.insert(events).values({ type: step, agencyId }).catch(() => undefined);
}

export type FunnelSummary = Record<FunnelStep, number> & {
  /** Pages published within 24 hours of their account being created (the activation target in docs/65). */
  activated24h: number;
};

export async function funnelSummary(days = 30, now = new Date()): Promise<FunnelSummary> {
  const db = await getDb();
  const since = new Date(now.getTime() - days * 86_400_000);
  const rows = await db
    .select({ type: events.type, n: sql<number>`count(*)::int` })
    .from(events)
    .where(and(gte(events.createdAt, since), inArray(events.type, [...FUNNEL_STEPS])))
    .groupBy(events.type);
  const counts = Object.fromEntries(FUNNEL_STEPS.map((s) => [s, 0])) as Record<FunnelStep, number>;
  for (const r of rows) counts[r.type as FunnelStep] = r.n;
  const [fast] = await db
    .select({ n: sql<number>`count(distinct p.agency_id)::int` })
    .from(sql`${events} p`)
    .where(sql`p.type = 'page_published' and p.created_at >= ${since} and exists (select 1 from ${events} c where c.type = 'account_created' and c.agency_id = p.agency_id and p.created_at <= c.created_at + interval '24 hours')`);
  return { ...counts, activated24h: fast?.n ?? 0 };
}
