// Rehearsal on a disposable Postgres after migration 0026: the daily assistant budget under real
// concurrency. Two separate connection pools stand in for two serverless instances; 25 reservations
// race per instance (50 in all) and exactly the budget must win, with the row ending at the budget.
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { expect, it } from "vitest";
import { getAgencyByHandle } from "@/lib/data/agencies";
import { ASSISTANT_DAILY_BUDGET, assistantCallsUsed, reserveAssistantCall } from "@/lib/data/collab-ai-usage";
import { createPlan, deletePlan } from "@/lib/data/collab-plans";
import { TEMPLATES } from "@/lib/collab/templates";
import { closeDb, getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { collabAiUsage, contracts } from "@/lib/db/schema";

const URL = process.env.DATABASE_URL!;
// The same statement lib/data/collab-ai-usage.ts issues, on an independent pool (a second "instance").
async function reserveOn(db: ReturnType<typeof drizzle<typeof schema>>, agencyId: string, day: string) {
  const rows = await db.insert(collabAiUsage).values({ agencyId, day, used: 1, updatedAt: new Date() }).onConflictDoUpdate({ target: [collabAiUsage.agencyId, collabAiUsage.day], set: { used: sql`${collabAiUsage.used} + 1`, updatedAt: new Date() }, setWhere: sql`${collabAiUsage.used} < ${ASSISTANT_DAILY_BUDGET}` }).returning({ used: collabAiUsage.used });
  return rows.length > 0;
}

it("rehearses the hardening migration and the atomic budget on Postgres", async () => {
  const db = await getDb();
  const r = (await db.execute(sql`select count(*)::int as n from information_schema.tables where table_schema='public'`)) as unknown as { rows?: { n: number }[] } & { n: number }[];
  const tables = (r.rows ?? r)[0];
  const before = JSON.parse(readFileSync("/tmp/pg-before.json", "utf8"));
  const [legacy] = await db.select({ termsHash: contracts.termsHash, status: contracts.status }).from(contracts).where(eq(contracts.id, before.contractId));
  const a = (await getAgencyByHandle("legacy.agency"))!;
  const day = "2030-01-01";
  const at = new Date(`${day}T12:00:00Z`);
  await db.delete(collabAiUsage).where(eq(collabAiUsage.agencyId, a.id));
  const poolA = new Pool({ connectionString: URL, max: 10 });
  const poolB = new Pool({ connectionString: URL, max: 10 });
  const dbA = drizzle(poolA, { schema });
  const dbB = drizzle(poolB, { schema });
  const results = await Promise.all([
    ...Array.from({ length: 25 }, () => reserveOn(dbA, a.id, day)),
    ...Array.from({ length: 25 }, () => reserveOn(dbB, a.id, day)),
  ]);
  const granted = results.filter(Boolean).length;
  const usedAfter = await assistantCallsUsed(a.id, at);
  const refused = await reserveAssistantCall(a.id, at);
  // A plan that used the assistant on a day still within budget, then deleted: the row does not move.
  const plan = await createPlan(a, { title: "Launch", scope: "Shoot (private: RATE-SYN)", deliverables: TEMPLATES.shoot.deliverables, useAssistant: true, privateNotes: "NOTES-SYN" }, async () => `[{"title":"All","deliverableKeys":["photo_session","feed_posts"],"roles":["photographer"]}]`, () => reserveAssistantCall(a.id, new Date("2030-01-02T01:00:00Z")));
  const usedNext = await assistantCallsUsed(a.id, new Date("2030-01-02T23:00:00Z"));
  await deletePlan(a.id, plan.id);
  const usedNextAfterDelete = await assistantCallsUsed(a.id, new Date("2030-01-02T23:00:00Z"));
  await poolA.end();
  await poolB.end();
  console.log(JSON.stringify({ tables, legacyIntact: legacy.termsHash === before.termsHash && legacy.status === "active", racers: results.length, granted, usedAfter, refused, plan: [plan.assistant, plan.reason], usedNext, usedNextAfterDelete }));
  expect(granted).toBe(ASSISTANT_DAILY_BUDGET);
  expect(usedAfter).toBe(ASSISTANT_DAILY_BUDGET);
  expect(refused).toBe(false);
  expect(plan.reason).toBe("ok");
  expect(usedNext).toBe(1);
  expect(usedNextAfterDelete).toBe(1);
  await closeDb();
});
