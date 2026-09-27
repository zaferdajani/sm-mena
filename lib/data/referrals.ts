import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, appSettings, referralAgents, referralPayouts, users, type ReferralAgent } from "@/lib/db/schema";
import { DEFAULT_TIERS, earnings, isActiveReferral, missingForActive, normalizeCode, REFERRAL_CODE, tiersSchema, type Tier } from "@/lib/referrals";
import { audit } from "./agencies";
import { createUser, getUserByEmail } from "./users";

// Field marketing agents and the providers they bring (docs/42).

const TIERS_KEY = "referral_tiers";

export async function getTiers(): Promise<Tier[]> {
  const db = await getDb();
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, TIERS_KEY));
  const parsed = tiersSchema.safeParse(row?.value);
  return parsed.success && parsed.data.length ? parsed.data : DEFAULT_TIERS;
}

export async function setTiers(tiers: Tier[], by: string) {
  const clean = tiersSchema.parse(tiers).sort((a, b) => a.at - b.at);
  const db = await getDb();
  await db
    .insert(appSettings)
    .values({ key: TIERS_KEY, value: clean, updatedBy: by })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: clean, updatedAt: new Date(), updatedBy: by } });
  await audit(by, "referrals.tiers", "app_settings", TIERS_KEY);
}

export type NewAgent = { name: string; email: string; phone: string | null; code: string; rateFils: number; currency: string; note: string | null };

/**
 * Admin adds an agent: an account with the "agent" role and a one-time
 * password to hand over (they can also sign in with an emailed code and change
 * it on their page).
 */
export async function createAgent(input: NewAgent, by: string): Promise<{ error: "codeInvalid" | "codeTaken" | "emailTaken" } | { agent: ReferralAgent; password: string }> {
  const code = normalizeCode(input.code);
  if (!REFERRAL_CODE.test(code)) return { error: "codeInvalid" };
  const db = await getDb();
  const [taken] = await db.select({ id: referralAgents.id }).from(referralAgents).where(eq(referralAgents.code, code));
  if (taken) return { error: "codeTaken" };
  if (await getUserByEmail(input.email)) return { error: "emailTaken" };
  const password = randomBytes(9).toString("base64url");
  const user = await createUser(input.email, password, "agent");
  const [agent] = await db
    .insert(referralAgents)
    .values({ userId: user.id, name: input.name.trim(), code, phone: input.phone, rateFils: input.rateFils, currency: input.currency, note: input.note, createdBy: by })
    .returning();
  await audit(by, "referrals.agent_created", "referral_agent", agent.id);
  return { agent, password };
}

export async function agentForUser(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(referralAgents).where(eq(referralAgents.userId, userId));
  return row ?? null;
}

export async function activeAgentByCode(raw: unknown) {
  const code = normalizeCode(raw);
  if (!REFERRAL_CODE.test(code)) return null;
  const db = await getDb();
  const [row] = await db.select().from(referralAgents).where(and(eq(referralAgents.code, code), eq(referralAgents.active, true)));
  return row ?? null;
}

/**
 * At sign-up: credit the provider to the agent whose code it used. Never the
 * agent's own sign-up, never a demo agency, and only once.
 */
export async function attributeReferral(agencyId: string, rawCode: unknown, signupEmail: string) {
  const agent = await activeAgentByCode(rawCode);
  if (!agent) return false;
  const db = await getDb();
  const [agentUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, agent.userId));
  if (agentUser?.email === signupEmail.trim().toLowerCase()) return false;
  const [row] = await db
    .update(agencies)
    .set({ referredByAgentId: agent.id })
    .where(and(eq(agencies.id, agencyId), eq(agencies.isDemo, false), sql`${agencies.referredByAgentId} is null`))
    .returning({ id: agencies.id });
  return Boolean(row);
}

/** Everything an agent (or an admin) sees about one agent's referrals and money. */
export async function agentStats(agent: ReferralAgent, tiers?: Tier[]) {
  const db = await getDb();
  const [rows, [paid]] = await Promise.all([
    db
      .select({
        id: agencies.id,
        name: agencies.name,
        handle: agencies.handle,
        city: agencies.city,
        kind: agencies.kind,
        isDemo: agencies.isDemo,
        status: agencies.status,
        bio: agencies.bio,
        services: agencies.services,
        postCount: agencies.postCount,
        referralVoidReason: agencies.referralVoidReason,
        createdAt: agencies.createdAt,
      })
      .from(agencies)
      .where(eq(agencies.referredByAgentId, agent.id))
      .orderBy(desc(agencies.createdAt)),
    db.select({ n: sql<number>`coalesce(sum(${referralPayouts.amountFils}), 0)::int` }).from(referralPayouts).where(eq(referralPayouts.agentId, agent.id)),
  ]);
  const referred = rows.map((r) => ({ ...r, active: isActiveReferral(r), missing: missingForActive(r) }));
  const active = referred.filter((r) => r.active).length;
  const money = earnings(active, agent.rateFils, tiers ?? (await getTiers()));
  return { referred, signedUp: referred.filter((r) => !r.referralVoidReason).length, active, money, paid: paid.n, owed: Math.max(0, money.total - paid.n) };
}

/** Admin: every agent with their numbers, most active providers first (also the agents' leaderboard). */
export async function listAgentsWithStats() {
  const db = await getDb();
  const tiers = await getTiers();
  const agents = await db.select().from(referralAgents).orderBy(desc(referralAgents.createdAt));
  const out = await Promise.all(agents.map(async (a) => ({ agent: a, stats: await agentStats(a, tiers) })));
  return out.sort((x, y) => y.stats.active - x.stats.active || y.stats.signedUp - x.stats.signedUp);
}

export async function recordPayout(agentId: string, amountFils: number, note: string | null, by: string) {
  const db = await getDb();
  const [row] = await db.insert(referralPayouts).values({ agentId, amountFils, note, createdBy: by }).returning();
  await audit(by, "referrals.payout", "referral_agent", agentId, { amountFils });
  return row;
}

export async function listPayouts(agentId: string) {
  const db = await getDb();
  return db.select().from(referralPayouts).where(eq(referralPayouts.agentId, agentId)).orderBy(desc(referralPayouts.createdAt));
}

/** Admin: a referral doesn't count (duplicate, fake, not the agent's). Empty reason restores it. */
export async function voidReferral(agencyId: string, reason: string | null, by: string) {
  const db = await getDb();
  await db.update(agencies).set({ referralVoidReason: reason?.trim() ? reason.trim().slice(0, 200) : null }).where(and(eq(agencies.id, agencyId), isNotNull(agencies.referredByAgentId)));
  await audit(by, reason ? "referrals.void" : "referrals.restore", "agency", agencyId);
}

export async function updateAgent(agentId: string, patch: { active?: boolean; rateFils?: number }, by: string) {
  const db = await getDb();
  await db.update(referralAgents).set(patch).where(eq(referralAgents.id, agentId));
  await audit(by, "referrals.agent_updated", "referral_agent", agentId, patch);
}

export async function getAgent(agentId: string) {
  if (!/^[0-9a-f-]{36}$/.test(agentId)) return null;
  const db = await getDb();
  const [row] = await db.select().from(referralAgents).where(eq(referralAgents.id, agentId));
  return row ?? null;
}
