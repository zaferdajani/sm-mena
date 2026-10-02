// The live medal check (Actions → Medal journey, docs/57). `create` adds one QA letter that only
// the demo provider will use; `cleanup` removes every QA letter and takes back the medal number it
// gave, so no medal, seat or real account is used up. Never touches real letters.
import { appendFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb } from "./index";
import { agencies, pioneerInvitations } from "./schema";
import { newPioneerCode } from "../pioneers";

async function create() {
  const db = await getDb();
  const code = newPioneerCode();
  await db.insert(pioneerInvitations).values({ code, name: "QA live check (deleted after the run)", qa: true, expiresAt: new Date(Date.now() + 3600_000) });
  console.log(`QA letter created: ${code}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `code=${code}\n`);
}

async function cleanup() {
  const db = await getDb();
  const rows = await db.select().from(pioneerInvitations).where(eq(pioneerInvitations.qa, true));
  for (const r of rows) {
    if (r.claimedAgencyId && r.number) {
      await db.update(agencies).set({ pioneerNumber: null }).where(and(eq(agencies.id, r.claimedAgencyId), eq(agencies.pioneerNumber, r.number)));
    }
    await db.delete(pioneerInvitations).where(eq(pioneerInvitations.id, r.id));
  }
  console.log(`QA letters removed: ${rows.length}${rows.some((r) => r.number) ? `; medal numbers taken back: ${rows.filter((r) => r.number).map((r) => r.number).join(", ")}` : ""}.`);
}

(process.argv[2] === "cleanup" ? cleanup() : create())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
