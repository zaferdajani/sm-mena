"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/guards";
import { internationalPhone } from "@/lib/dial-codes";
import { createAgent, recordPayout, setTiers, updateAgent, voidReferral } from "@/lib/data/referrals";

// Admin → Agents (docs/42).

export type AgentFormState = { error?: string; created?: { name: string; email: string; password: string; code: string } } | undefined;
const refresh = () => revalidatePath("/[locale]/admin/agents", "layout");
const jod = (v: number) => Math.round(v * 1000);

const agentSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().max(30).optional().default(""),
  phoneCountry: z.string().max(3).optional().default(""),
  code: z.string().trim().max(24),
  rate: z.coerce.number().min(0).max(1000),
  note: z.string().trim().max(500).optional().default(""),
});

export async function createAgentAction(_: AgentFormState, formData: FormData): Promise<AgentFormState> {
  const staff = await requireStaff("agents.manage");
  const parsed = agentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  const d = parsed.data;
  const r = await createAgent(
    { name: d.name, email: d.email, phone: d.phone ? internationalPhone(d.phoneCountry, d.phone) : null, code: d.code, rateFils: jod(d.rate), currency: "JOD", note: d.note || null },
    staff.id,
  );
  refresh();
  if ("error" in r) return { error: r.error };
  // The one-time password is shown to the admin once, to hand to the agent.
  return { created: { name: r.agent.name, email: d.email, password: r.password, code: r.agent.code } };
}

export async function recordPayoutAction(_: AgentFormState, formData: FormData): Promise<AgentFormState> {
  const staff = await requireStaff("agents.manage");
  const parsed = z.object({ agentId: z.string().uuid(), amount: z.coerce.number().positive().max(1_000_000), note: z.string().trim().max(300).optional().default("") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  await recordPayout(parsed.data.agentId, jod(parsed.data.amount), parsed.data.note || null, staff.id);
  refresh();
  return {};
}

export async function updateAgentAction(formData: FormData) {
  const staff = await requireStaff("agents.manage");
  const parsed = z.object({ agentId: z.string().uuid(), active: z.enum(["1", "0"]).optional(), rate: z.coerce.number().min(0).max(1000).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const patch: { active?: boolean; rateFils?: number } = {};
  if (parsed.data.active) patch.active = parsed.data.active === "1";
  if (parsed.data.rate !== undefined) patch.rateFils = jod(parsed.data.rate);
  await updateAgent(parsed.data.agentId, patch, staff.id);
  refresh();
}

export async function voidReferralAction(formData: FormData) {
  const staff = await requireStaff("agents.manage");
  const parsed = z.object({ agencyId: z.string().uuid(), reason: z.string().trim().max(200).optional().default("") }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await voidReferral(parsed.data.agencyId, parsed.data.reason || null, staff.id);
  refresh();
}

export async function saveTiersAction(_: AgentFormState, formData: FormData): Promise<AgentFormState> {
  const staff = await requireStaff("agents.manage");
  // One "at:bonus" pair per line, e.g. "25: 30" (25 active providers → 30 JOD).
  const lines = String(formData.get("tiers") ?? "").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const tiers = lines.map((l) => l.split(/[:=,\s]+/).map(Number)).filter(([at, bonus]) => Number.isFinite(at) && Number.isFinite(bonus) && at > 0 && bonus >= 0).map(([at, bonus]) => ({ at: Math.round(at), bonusFils: jod(bonus) }));
  if (tiers.length !== lines.length) return { error: "tiers" };
  await setTiers(tiers, staff.id);
  refresh();
  return {};
}
