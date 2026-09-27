import { getSessionUser } from "@/lib/auth/session";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { adminAccess } from "@/lib/auth/policy";
import { listAgentsWithStats } from "@/lib/data/referrals";

/** Admin → Agents → export: one row per agent with what they're owed (CSV, JOD). */
export async function GET() {
  const user = await getSessionUser();
  if (adminAccess(user, adminMfaRequired(), "agents.manage") !== "ok") return new Response("Forbidden", { status: 403 });
  const rows = await listAgentsWithStats();
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    ["name", "code", "phone", "active", "signed_up", "active_providers", "earned_jod", "paid_jod", "owed_jod"].join(","),
    ...rows.map(({ agent, stats }) =>
      [agent.name, agent.code, agent.phone ?? "", agent.active ? "yes" : "no", stats.signedUp, stats.active, stats.money.total / 1000, stats.paid / 1000, stats.owed / 1000].map(cell).join(","),
    ),
  ];
  return new Response(`﻿${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sawwiq-agents-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
