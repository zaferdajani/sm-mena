import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createAgency } from "@/lib/data/agencies";
import { closeClientAccount } from "@/lib/data/close-client-account";
import { getOwnerNeed, saveOwnerNeed } from "@/lib/data/owner-needs";
import { createUser } from "@/lib/data/users";
import { closeDb, getDb } from "@/lib/db";
import { auditLogs, ownerMatches, users } from "@/lib/db/schema";
import { ownerNeedFromForm, ownerNeedSchema } from "@/lib/validation/owner-needs";

afterAll(async () => closeDb());

const need = () => {
  const f = new FormData();
  for (const [k, v] of Object.entries({ country: "jo", city: "amman", services: "social_media", timing: "month" })) f.append(k, v);
  return ownerNeedSchema.parse(ownerNeedFromForm(f));
};

describe("a business owner closes their account (docs/08)", () => {
  it("disables sign-in, deletes their needs and unanswered matches, keeps introductions, and logs it", async () => {
    const stamp = Date.now();
    const owner = await createUser(`close-owner-${stamp}@test.jo`, "x".repeat(24), "client");
    await saveOwnerNeed(owner.id, need(), "ar");
    const db = await getDb();
    const ids: string[] = [];
    for (const n of [1, 2]) {
      const u = await createUser(`close-agency-${stamp}-${n}@test.jo`, "x".repeat(24));
      const a = await createAgency(u.id, { handle: `close${stamp}${n}`, name: `Close ${n}`, city: "amman", whatsapp: "+962791112233", phone: "+962791112233", services: ["social_media"] });
      ids.push(a.id);
    }
    await db.insert(ownerMatches).values([
      { ownerUserId: owner.id, agencyId: ids[0], score: 80, batchId: "t", status: "suggested" },
      { ownerUserId: owner.id, agencyId: ids[1], score: 70, batchId: "t", status: "introduced" },
    ]);

    expect(await closeClientAccount(owner.id)).toBe(true);
    const [row] = await db.select({ disabledAt: users.disabledAt }).from(users).where(eq(users.id, owner.id));
    expect(row.disabledAt).toBeInstanceOf(Date);
    expect(await getOwnerNeed(owner.id)).toBeNull();
    const left = await db.select({ status: ownerMatches.status }).from(ownerMatches).where(eq(ownerMatches.ownerUserId, owner.id));
    expect(left.map((m) => m.status)).toEqual(["introduced"]);
    const logged = await db.select({ action: auditLogs.action }).from(auditLogs).where(eq(auditLogs.entityId, owner.id));
    expect(logged.map((l) => l.action)).toContain("account.close");
  });

  it("does not close an agency or staff account through this path", async () => {
    const u = await createUser(`close-not-client-${Date.now()}@test.jo`, "x".repeat(24));
    expect(await closeClientAccount(u.id)).toBe(false);
    const [row] = await (await getDb()).select({ disabledAt: users.disabledAt }).from(users).where(eq(users.id, u.id));
    expect(row.disabledAt).toBeNull();
  });
});
