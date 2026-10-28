import "./setup-db";
import { afterAll, describe, expect, it } from "vitest";
import { confirmAge, createUser, getUserByEmail } from "@/lib/data/users";
import { closeDb } from "@/lib/db";

afterAll(async () => closeDb());

// docs/08: the 18+ declaration is stored with its time; accounts made by staff carry none.
describe("the 18+ declaration", () => {
  it("is recorded when the person confirmed it at sign-up", async () => {
    const u = await createUser(`adult-yes-${Date.now()}@test.jo`, "x".repeat(24), "agency", { ageConfirmed: true });
    expect(u.ageConfirmedAt).toBeInstanceOf(Date);
  });

  it("is empty for an account made without it, until the person confirms at sign-in", async () => {
    const email = `adult-later-${Date.now()}@test.jo`;
    const u = await createUser(email, "x".repeat(24), "client");
    expect(u.ageConfirmedAt).toBeNull();
    await confirmAge(u.id);
    expect((await getUserByEmail(email))?.ageConfirmedAt).toBeInstanceOf(Date);
  });
});
