import "./setup-db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { agentStats, attributeReferral, createAgent, recordPayout, voidReferral } from "@/lib/data/referrals";
import { createUser } from "@/lib/data/users";
import { getDb } from "@/lib/db";
import { agencies } from "@/lib/db/schema";

describe("referral agents", () => {
  it("credits sign-ups to the agent, pays only active ones, and tracks payouts", async () => {
    const admin = await createUser("admin@agents.jo", "password-1234", "admin");
    const made = await createAgent({ name: "Ahmad Saleh", email: "ahmad@agents.jo", phone: null, code: "Ahmad", rateFils: 5000, currency: "JOD", note: null }, admin.id);
    if (!("agent" in made)) throw new Error(made.error);
    expect(made.agent.code).toBe("ahmad");
    expect(made.password.length).toBeGreaterThan(8);
    expect(await createAgent({ name: "Other", email: "o@agents.jo", phone: null, code: "ahmad", rateFils: 1, currency: "JOD", note: null }, admin.id)).toEqual({ error: "codeTaken" });

    const mk = async (handle: string, extra: Record<string, unknown> = {}) => {
      const u = await createUser(`${handle}@agents.jo`, "password-1234");
      return createAgency(u.id, { handle, name: handle, city: "amman", services: ["ads_meta"], ...extra } as never);
    };
    const complete = await mk("ref.complete");
    const empty = await mk("ref.empty", { services: [] });
    expect(await attributeReferral(complete.id, "AHMAD", "ref.complete@agents.jo")).toBe(true);
    expect(await attributeReferral(empty.id, "ahmad", "ref.empty@agents.jo")).toBe(true);
    // Only once, never with an unknown code, never the agent's own sign-up.
    expect(await attributeReferral(complete.id, "ahmad", "ref.complete@agents.jo")).toBe(false);
    const other = await mk("ref.other");
    expect(await attributeReferral(other.id, "nobody", "x@agents.jo")).toBe(false);
    expect(await attributeReferral(other.id, "ahmad", "ahmad@agents.jo")).toBe(false);

    // Active = bio, services and a first post.
    const db = await getDb();
    await db.update(agencies).set({ bio: "Reels for cafés", postCount: 1 }).where(eq(agencies.id, complete.id));
    let s = await agentStats(made.agent);
    expect(s.signedUp).toBe(2);
    expect(s.active).toBe(1);
    expect(s.money.total).toBe(5000);
    expect(s.referred.find((r) => r.id === empty.id)?.missing).toEqual(["bio", "services", "post"]);

    await recordPayout(made.agent.id, 3000, "cash", admin.id);
    s = await agentStats(made.agent);
    expect(s.paid).toBe(3000);
    expect(s.owed).toBe(2000);

    // A voided referral stops counting and paying; restoring brings it back.
    await voidReferral(complete.id, "duplicate", admin.id);
    s = await agentStats(made.agent);
    expect(s.active).toBe(0);
    expect(s.signedUp).toBe(1);
    expect(s.owed).toBe(0);
    await voidReferral(complete.id, null, admin.id);
    expect((await agentStats(made.agent)).active).toBe(1);
  });
});
