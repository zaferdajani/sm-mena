// Bug agent, step 3 (docs/61): opens the Bug queue artifact with this run's
// private key. Writes queue.json and the screenshots (shots/<REF>-n.png, PNG so
// they can be viewed) to <dir> and prints a short index.
// Usage: npx tsx scripts/bug-agent/open.ts <dir> <bug-queue.sealed.json>
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { open, type SealedBundle } from "../../lib/bug-queue";

async function main() {
  const [dir, sealedPath] = process.argv.slice(2);
  if (!dir || !sealedPath) throw new Error("Usage: open.ts <dir> <bug-queue.sealed.json>");
  const bundle = open(JSON.parse(readFileSync(sealedPath, "utf8")) as SealedBundle, readFileSync(path.join(dir, "run-key.pem"), "utf8"));
  mkdirSync(path.join(dir, "shots"), { recursive: true });
  const png = (name: string) => path.join(dir, "shots", name.replace(/\.webp$/, ".png"));
  for (const r of bundle.reports) {
    for (const s of r.screenshots) await sharp(Buffer.from(s.base64, "base64")).png().toFile(png(s.name));
  }
  const slim = { ...bundle, reports: bundle.reports.map((r) => ({ ...r, screenshots: r.screenshots.map((s) => png(s.name)) })) };
  writeFileSync(path.join(dir, "queue.json"), JSON.stringify(slim, null, 2));
  console.log(`Exported ${bundle.exportedAt}: ${bundle.reports.length} report(s), ${bundle.errors.length} error(s)${bundle.waitingOnOwner ? "; some reports wait on the owner" : ""}.`);
  for (const r of slim.reports) console.log(`report ${r.ref} [${r.kind}] ${r.path ?? "-"} ${r.viewport ?? ""} shots=${r.screenshots.length}: ${r.message.slice(0, 120).replace(/\s+/g, " ")}`);
  for (const e of bundle.errors) console.log(`error ${e.id} [${e.source}/${e.kind}] ×${e.occurrences} ${e.path ?? "-"}: ${e.message.slice(0, 120)}`);
  console.log(`Full queue: ${path.join(dir, "queue.json")}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
