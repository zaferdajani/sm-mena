// Adds the researched launch prospects (data/prospects-jordan.json) to the live
// database without touching rows that already exist. Actions → Maintenance →
// seed-prospects (docs/55). Admin → Prospects has the same button.
import { closeDb } from "./index";
import { importResearched, linkJoinedProspects } from "../data/prospects";

async function main() {
  const r = await importResearched(null);
  const linked = await linkJoinedProspects();
  console.log(`Prospects: ${r.added} added, ${r.skipped} already there, ${linked} linked to pages that joined.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
