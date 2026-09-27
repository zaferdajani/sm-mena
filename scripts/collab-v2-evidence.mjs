// Writes docs/upgrades/collaboration-v2/release-evidence.<date>-<release>.json from observed facts passed in
// as a JSON file, and marks the backlog tasks. It records only what it is given; nothing is inferred.
//   node scripts/collab-v2-evidence.mjs facts.json
import { readFile, writeFile } from "node:fs/promises";

const [factsPath] = process.argv.slice(2);
if (!factsPath) throw new Error("usage: node scripts/collab-v2-evidence.mjs facts.json");
const facts = JSON.parse(await readFile(factsPath, "utf8"));
const dir = new URL("../docs/upgrades/collaboration-v2/", import.meta.url);
const template = JSON.parse(await readFile(new URL("release-evidence.template.json", dir), "utf8"));
const record = { ...template, template: false, ...facts };
const out = new URL(`release-evidence.${facts.recorded_at_utc.slice(0, 10)}-${facts.release}.json`, dir);
await writeFile(out, JSON.stringify(record, null, 2) + "\n");

const backlogUrl = new URL("backlog.json", dir);
const backlog = JSON.parse(await readFile(backlogUrl, "utf8"));
for (const t of backlog.tasks) {
  const update = facts.task_updates?.[t.id];
  if (!update) continue;
  t.status = update.status;
  t.implementation_commit = update.commit ?? t.implementation_commit;
  if (update.evidence) t.evidence = [...new Set([...t.evidence, ...update.evidence])];
}
await writeFile(backlogUrl, JSON.stringify(backlog, null, 2) + "\n");
console.log(`wrote ${out.pathname.split("/").pop()} and updated ${Object.keys(facts.task_updates ?? {}).length} backlog tasks`);
