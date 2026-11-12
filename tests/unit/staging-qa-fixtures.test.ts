import "./setup-db";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/lib/db";
import { profilePublications } from "@/lib/db/schema";
import { createAgency } from "@/lib/data/agencies";
import { createUser } from "@/lib/data/users";
import { hideQaFixtures } from "@/lib/db/staging-qa-fixtures";

afterAll(() => closeDb());

async function agencyWith(handle: string, visibility?: "public" | "private") {
  const user = await createUser(`${handle}@example.test`, "password-123", "agency");
  const agency = await createAgency(user.id, { handle, name: handle, city: "amman", services: ["photography"] });
  if (visibility) await (await getDb()).insert(profilePublications).values({ agencyId: agency.id, visibility, consentVersion: "v" }).onConflictDoUpdate({ target: profilePublications.agencyId, set: { visibility } });
  return agency;
}
const visibilityOf = async (id: string) => (await (await getDb()).select().from(profilePublications).where(eq(profilePublications.agencyId, id)))[0]?.visibility;

describe("staging QA fixtures (QA H-05)", () => {
  it("makes qa.* pages private, leaves other agencies and already-private pages alone", async () => {
    const suffix = Date.now().toString(36);
    const fixture = await agencyWith(`qa.storage.${suffix}`, "public");
    const unlisted = await agencyWith(`qa.app.${suffix}`);
    const real = await agencyWith(`studio.${suffix}`, "public");
    expect(await hideQaFixtures()).toBeGreaterThanOrEqual(2);
    expect(await visibilityOf(fixture.id)).toBe("private");
    expect(await visibilityOf(unlisted.id)).toBe("private");
    expect(await visibilityOf(real.id)).toBe("public");
    expect(await hideQaFixtures()).toBe(0);
  });
});
