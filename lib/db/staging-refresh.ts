// Staging builds only (vercel.json on the staging branch runs it after the
// migrations): makes sure the staging test accounts exist and are filled in as
// reference profiles, and redraws demo pictures missing from staging storage.
// Does nothing outside STAGING_MODE, refuses the production database, never
// prints the staging password, and never fails the build.
import { assertStagingDatabase, isStagingMode, usesProductionDatabase } from "@/lib/core/rules/staging";
import { closeDb } from "./index";

async function main() {
  if (!isStagingMode() || usesProductionDatabase()) {
    console.log("Staging refresh: not a staging build, nothing to do.");
    return;
  }
  assertStagingDatabase();
  const { seedStaging } = await import("./seed-staging");
  // seedStaging lists the accounts with their password: keep that out of the build log.
  await seedStaging((...a) => {
    const line = a.join(" ");
    if (!/password/i.test(line)) console.log(line);
  });
  // Demo agencies' texts in one language each (lib/db/demo-text-refresh.ts); once, flagged.
  const { refreshDemoTexts } = await import("./demo-text-refresh");
  const demo = await refreshDemoTexts(console.log);
  if (demo) console.log("Staging refresh: demo texts updated.");
  console.log("Staging refresh: done.");
}

main()
  .catch((error) => console.error("Staging refresh failed (build continues):", error instanceof Error ? error.message : error))
  .finally(() => closeDb().catch(() => undefined));
