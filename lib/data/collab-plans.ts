import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, collabPlans, type Agency, type CollabPlan, type DeliverableLine, type PlanPackage, type PlanSource } from "@/lib/db/schema";
import { coverPackages, draftPackages, openRoles, type DraftPackage } from "@/lib/collab/planner";
import { redactBrief } from "@/lib/collab/redact";
import { structureBrief, type PlannerBrief, type PlannerCall, type ReserveCall } from "@/lib/ai/planner";
import { discoverCollaborators, partnerIdsOf } from "./collab-discovery";
import { rosterIds } from "./collab-roster";

// Scope-to-team plans (docs/50 §planner). Every input to coverage is an
// authorized read the agency could make itself; the optional model sees the
// redacted brief and catalogue keys only. Saving a plan books nobody.
//
// Private notes are structurally excluded from the model: the request is built
// from a `PlannerBrief` that only ever holds title, scope and deliverables, and
// `plannerRequest` refuses any object carrying other keys. The agency record,
// roster and partner data are read only after the model step, for coverage.

export type PlanInput = { title: string; scope: string; deliverables: DeliverableLine[]; useAssistant: boolean; privateNotes?: string };

export type PlanView = CollabPlan & { people: Map<string, { id: string; name: string; handle: string; kind: "agency" | "freelancer" }> };

export async function createPlan(me: Agency, input: PlanInput, call?: PlannerCall, reserve?: ReserveCall): Promise<{ id: string; assistant: string; reason: string }> {
  const db = await getDb();
  // Only these three fields exist on the object the planner request is built from.
  const brief: PlannerBrief = { title: input.title.trim().slice(0, 120), scope: redactBrief(input.scope), deliverables: input.deliverables };
  const privateNotes = (input.privateNotes ?? "").trim().slice(0, 3000);
  let packages: DraftPackage[] = draftPackages(brief.deliverables);
  let assistant = "none";
  let reason = "rules";
  if (input.useAssistant) {
    // The daily budget is reserved atomically inside structureBrief (collab_ai_usage), not counted here.
    const r = await structureBrief(me.id, brief, [...new Set(packages.flatMap((p) => p.roles))], call, reserve);
    assistant = r.packages ? r.assistant : "none";
    reason = r.reason;
    if (r.packages) packages = r.packages;
  }
  const wanted = [...new Set(packages.flatMap((p) => p.roles))].filter((r) => !me.teamRoles.includes(r));
  const [partnerSet, rosterSet] = await Promise.all([partnerIdsOf(me.id), rosterIds(me.id)]);
  const ids = [...new Set([...partnerSet, ...rosterSet])];
  const known = ids.length ? await db.select({ id: agencies.id, roles: agencies.teamRoles, status: agencies.status }).from(agencies).where(and(inArray(agencies.id, ids), eq(agencies.status, "active"))) : [];
  const roleOf = new Map(known.map((k) => [k.id, k.roles]));
  const discovered = wanted.length ? await discoverCollaborators(me, { roles: wanted }, { includeDemo: me.isDemo }) : { items: [] };
  const sources: PlanSource[] = [
    { tool: "partners", query: {}, ids: [...partnerSet].filter((id) => roleOf.has(id)) },
    { tool: "roster", query: {}, ids: [...rosterSet].filter((id) => roleOf.has(id) && !partnerSet.has(id)) },
    { tool: "discover", query: { roles: wanted }, ids: discovered.items.map((i) => i.candidate.id) },
  ];
  const covered: PlanPackage[] = coverPackages(packages, {
    teamRoles: me.teamRoles,
    partners: [...partnerSet].filter((id) => roleOf.has(id)).map((id) => ({ id, roles: roleOf.get(id)! })),
    roster: [...rosterSet].filter((id) => roleOf.has(id) && !partnerSet.has(id)).map((id) => ({ id, roles: roleOf.get(id)! })),
    discovered: discovered.items.map((i) => ({ id: i.candidate.id, roles: i.matchedRoles, reasons: i.reasons })),
  });
  const [row] = await db.insert(collabPlans).values({ agencyId: me.id, title: brief.title, brief: brief.scope, deliverables: brief.deliverables, packages: covered, sources, assistant, assistantRequested: input.useAssistant, privateNotes }).returning({ id: collabPlans.id });
  return { id: row.id, assistant, reason };
}

export async function listPlans(agencyId: string) {
  const db = await getDb();
  return db.select().from(collabPlans).where(eq(collabPlans.agencyId, agencyId)).orderBy(desc(collabPlans.createdAt)).limit(50);
}

export async function getPlan(agencyId: string, id: string): Promise<PlanView | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [plan] = await db.select().from(collabPlans).where(and(eq(collabPlans.id, id), eq(collabPlans.agencyId, agencyId)));
  if (!plan) return null;
  const ids = [...new Set(plan.packages.flatMap((p) => p.coverage.flatMap((c) => c.candidates.map((x) => x.agencyId))))];
  const rows = ids.length ? await db.select({ id: agencies.id, name: agencies.name, handle: agencies.handle, kind: agencies.kind }).from(agencies).where(inArray(agencies.id, ids)) : [];
  return { ...plan, people: new Map(rows.map((r) => [r.id, r])) };
}

export async function deletePlan(agencyId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return false;
  const db = await getDb();
  const rows = await db.delete(collabPlans).where(and(eq(collabPlans.id, id), eq(collabPlans.agencyId, agencyId))).returning({ id: collabPlans.id });
  return rows.length > 0;
}

export { openRoles };
