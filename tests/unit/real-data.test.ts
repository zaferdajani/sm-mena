import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { platformStats } from "@/lib/data/admin";
import { createAgency } from "@/lib/data/agencies";
import { marketplaceStats, recordPageView, trafficStats } from "@/lib/data/stats";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { agencies, events, inquiries, posts } from "@/lib/db/schema";

// The admin statistics count real activity only: a demo page, a page owned
// by a staff account (testing) and the admin console's own page views are
// left out (docs/51).

beforeAll(async () => {
  const db = await getDb();
  const make = async (email: string, handle: string, role?: "admin") => {
    const owner = await createUser(email, "password-1234", role);
    const agency = await createAgency(owner.id, { handle, name: handle, city: "amman", services: ["ads_meta"] });
    await db.update(agencies).set({ status: "active" }).where(eq(agencies.id, agency.id));
    const [post] = await db.insert(posts).values({ agencyId: agency.id, caption: handle }).returning({ id: posts.id });
    await db.insert(events).values([
      { type: "profile_view", agencyId: agency.id, visitorId: `v-${handle}` },
      { type: "contact_click", agencyId: agency.id, visitorId: `v-${handle}`, postId: post.id },
    ]);
    await db.insert(inquiries).values({ agencyId: agency.id, name: "Client", phone: "+962700000000", message: `Hello ${handle}`, consentVersion: "test" });
    return agency;
  };
  await make("real@t.jo", "real.one");
  const demo = await make("demo@t.jo", "demo.one");
  await db.update(agencies).set({ isDemo: true }).where(eq(agencies.id, demo.id));
  await make("staff@t.jo", "staff.test", "admin");
  // An assistant chat belongs to no agency and is real visitor activity.
  await db.insert(events).values({ type: "ai_chat", visitorId: "v-chat" });

  const view = (sessionId: string, path: string) =>
    recordPageView({ path, landing: false, sessionId, referrer: null, visitorId: sessionId, userAgent: "iPhone Mobile", ownHost: "sawwiq.org" });
  await view("visitor", "/ar/explore");
  await view("team", "/ar/admin");
  await view("team", "/en/admin/stats");
});
afterAll(() => closeDb());

describe("admin statistics show real data only", () => {
  it("counts only the real agency on the dashboard", async () => {
    const s = await platformStats();
    expect(s.agencies.total).toBe(1);
    expect(s.agencies.active).toBe(1);
    expect(s.posts.total).toBe(1);
    expect(s.contacts30d).toBe(1);
    expect(s.views30d).toBe(1);
    expect(s.contactsPerAgency).toBe(1);
    // the real agency's visitor and the assistant chat
    expect(s.visitors30d).toBe(2);
    expect(s).not.toHaveProperty("agencies.demo");
  });

  it("leaves admin pages out of visitor traffic", async () => {
    const t = await trafficStats(7);
    expect(t.totals).toEqual({ views: 1, visitors: 1, sessions: 1 });
    expect(t.pages.map((p) => p.key)).toEqual(["/ar/explore"]);
  });

  it("counts only real activity in the marketplace funnel", async () => {
    const m = await marketplaceStats(7);
    expect(m.funnel.find((f) => f.key === "browsed")?.n).toBe(1);
    expect(m.funnel.find((f) => f.key === "viewedAgency")?.n).toBe(1);
    expect(m.activity.newAgencies).toBe(1);
    expect(m.activity.newPosts).toBe(1);
    expect(m.activity.messages).toBe(1);
    expect(m.activity.aiChats).toBe(1);
  });
});
