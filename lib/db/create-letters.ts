// Creates Founding Member letters for named prospects (docs/57) from Maintenance → pioneer-letters.
// LETTER_NAMES is a comma-separated list of names already on Admin → Prospects. A prospect that
// already has a letter keeps it (printed again, never duplicated). Prints each name, code and link.
import { appendFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { closeDb, getDb } from "./index";
import { auditLogs, pioneerInvitations, prospects } from "./schema";
import { inviteExpiry, newPioneerCode } from "../pioneers";
import { prospectKey } from "../prospects";

const site = (process.env.SITE_URL || "https://sawwiq.org").replace(/\/$/, "");

async function main() {
  const names = (process.env.LETTER_NAMES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!names.length) throw new Error("Set LETTER_NAMES (the workflow's names input).");
  const db = await getDb();
  const out: { name: string; code: string; expiresAt: string; created: boolean }[] = [];
  for (const wanted of names) {
    const [p] = await db.select().from(prospects).where(eq(prospects.nameKey, prospectKey(wanted)));
    if (!p) {
      console.log(`::warning::"${wanted}" is not on Admin → Prospects; add it there first.`);
      continue;
    }
    const [existing] = await db.select().from(pioneerInvitations).where(eq(pioneerInvitations.prospectId, p.id));
    if (existing) {
      out.push({ name: existing.name, code: existing.code, expiresAt: existing.expiresAt.toISOString(), created: false });
      continue;
    }
    const code = newPioneerCode();
    const [row] = await db.insert(pioneerInvitations).values({ code, name: p.name, prospectId: p.id, expiresAt: inviteExpiry() }).returning();
    await db.insert(auditLogs).values({ actorUserId: null, action: "pioneer.invited", entity: "pioneer_invitation", entityId: row.id, meta: { prospectId: p.id, via: "maintenance" } });
    out.push({ name: row.name, code: row.code, expiresAt: row.expiresAt.toISOString(), created: true });
  }
  for (const l of out) console.log(`${l.created ? "Created" : "Already had"} letter for ${l.name}: ${site}/i/${l.code} (valid until ${l.expiresAt.slice(0, 10)})`);
  console.log(`LETTERS_JSON=${JSON.stringify(out)}`);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, out.map((l) => `- ${l.name}: ${site}/i/${l.code} (until ${l.expiresAt.slice(0, 10)})`).join("\n") + "\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
