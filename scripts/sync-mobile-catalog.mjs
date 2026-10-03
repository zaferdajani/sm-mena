// Copies the service taxonomy the web uses (data/service-taxonomy.json) into the app, so the service picker
// shows the same keys and names as the studio. Run after editing the taxonomy; a unit test fails when they differ.
import { readFileSync, writeFileSync } from "node:fs";
const src = JSON.parse(readFileSync(new URL("../data/service-taxonomy.json", import.meta.url), "utf8"));
const out = { version: src.version, categories: src.categories.map((c) => ({ key: c.key, name_ar: c.name_ar, name_en: c.name_en, services: c.services.map((s) => ({ key: s.key, name_ar: s.name_ar, name_en: s.name_en })) })) };
writeFileSync(new URL("../mobile/src/catalog/services.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`mobile/src/catalog/services.json: ${out.categories.length} categories, ${out.categories.reduce((n, c) => n + c.services.length, 0)} services`);
