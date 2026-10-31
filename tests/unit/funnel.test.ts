import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createAgency } from "@/lib/data/agencies";
import { funnelSummary, recordFunnel } from "@/lib/data/funnel";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";

afterAll(() => closeDb());

describe("onboarding funnel (docs/65 stage 5)", () => {
  it("counts steps and pages published within 24 hours of their account, without storing who", async () => {
    const stamp = Date.now().toString(36);
    const db = await getDb();
    const before = await funnelSummary();
    const u1 = await createUser(`fun-1-${stamp}@test.jo`, "x".repeat(24), "agency");
    const u2 = await createUser(`fun-2-${stamp}@test.jo`, "x".repeat(24), "agency");
    const fast = await createAgency(u1.id, { name: "Fast", handle: `fast${stamp}`, city: "amman", services: [] } as never);
    const slow = await createAgency(u2.id, { name: "Slow", handle: `slow${stamp}`, city: "amman", services: [] } as never);
    await recordFunnel("join_view");
    await recordFunnel("join_view");
    await recordFunnel("account_created", fast.id);
    await recordFunnel("account_created", slow.id);
    await recordFunnel("first_photo_uploaded", fast.id);
    await recordFunnel("page_published", fast.id);
    await recordFunnel("page_published", slow.id);
    // The slow page's account was created two days before it published.
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
    await db.update(events).set({ createdAt: twoDaysAgo }).where(eq(events.agencyId, slow.id)).catch(() => undefined);
    await db.update(events).set({ createdAt: new Date() }).where(eq(events.type, "page_published")).catch(() => undefined);
    const after = await funnelSummary();
    expect(after.join_view - before.join_view).toBe(2);
    expect(after.account_created - before.account_created).toBe(2);
    expect(after.first_photo_uploaded - before.first_photo_uploaded).toBe(1);
    expect(after.page_published - before.page_published).toBe(2);
    expect(after.activated24h - before.activated24h).toBe(1);
    const rows = await db.select().from(events).where(eq(events.agencyId, fast.id));
    expect(rows.every((r) => r.visitorId === null && r.detail === null)).toBe(true);
  });
});
