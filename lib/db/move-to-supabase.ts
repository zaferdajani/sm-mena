// One-time move from the embedded database (PGlite on the Fly volume) and the
// local upload folder to Postgres (Supabase) and Supabase Storage.
// docs/25-supabase.md. Run automatically by scripts/docker-entrypoint.sh on
// the first boot that has DATABASE_URL; safe to run again (it refuses to copy
// into a database that already has data, and re-uploads are idempotent).
//
//   DATABASE_URL=postgres://… PGLITE_DIR=/data/pglite UPLOADS_DIR=/data/uploads \
//   STORAGE_PROVIDER=supabase SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
//   npm run db:move-to-supabase
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MIGRATIONS_DIR } from "./index";

const log = (...a: unknown[]) => console.log("[move]", ...a);

type Sql = import("postgres").Sql;

/** Tables in an order where every foreign key points at a table already copied. */
async function tableOrder(query: (sql: string) => Promise<Record<string, unknown>[]>) {
  const tables = (await query(`select table_name as t from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`)).map((r) => String(r.t));
  const deps = await query(`
    select c.conrelid::regclass::text as child, c.confrelid::regclass::text as parent
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public'`);
  const needs = new Map(tables.map((t) => [t, new Set<string>()]));
  for (const d of deps) {
    const child = String(d.child).replace(/"/g, "");
    const parent = String(d.parent).replace(/"/g, "");
    if (child !== parent) needs.get(child)?.add(parent);
  }
  const order: string[] = [];
  while (needs.size) {
    const ready = [...needs].filter(([, n]) => [...n].every((p) => !needs.has(p))).map(([t]) => t);
    if (!ready.length) throw new Error(`Circular foreign keys between: ${[...needs.keys()].join(", ")}`);
    for (const t of ready.sort()) {
      order.push(t);
      needs.delete(t);
    }
  }
  return order;
}

async function moveDatabase(target: Sql, pgliteDir: string) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: pgliteDrizzle } = await import("drizzle-orm/pglite");
  const { migrate: pgliteMigrate } = await import("drizzle-orm/pglite/migrator");
  const { drizzle: pgDrizzle } = await import("drizzle-orm/postgres-js");
  const { migrate: pgMigrate } = await import("drizzle-orm/postgres-js/migrator");

  // Both sides on the same schema version first.
  await pgMigrate(pgDrizzle(target), { migrationsFolder: MIGRATIONS_DIR });
  const source = new PGlite(pgliteDir);
  await pgliteMigrate(pgliteDrizzle(source), { migrationsFolder: MIGRATIONS_DIR });

  const [{ n }] = await target<{ n: number }[]>`select (select count(*) from users)::int + (select count(*) from agencies)::int as n`;
  if (n > 0) {
    log("Target database already has data; not copying (already moved?).");
    await source.close();
    return false;
  }

  const order = await tableOrder(async (q) => (await source.query<Record<string, unknown>>(q)).rows);
  log(`Copying ${order.length} tables…`);
  const counts: Record<string, number> = {};
  await target.begin(async (tx) => {
    for (const table of order) {
      const total = Number((await source.query<{ n: number }>(`select count(*)::int as n from "${table}"`)).rows[0].n);
      counts[table] = total;
      for (let offset = 0; offset < total; offset += 500) {
        // Rows travel as JSON and are rebuilt with the target's column types, so
        // enums, arrays, jsonb and timestamps round-trip exactly.
        const { rows } = await source.query<{ j: unknown[] }>(`select coalesce(json_agg(t), '[]'::json) as j from (select * from "${table}" order by ctid limit 500 offset ${offset}) t`);
        await tx.unsafe(`insert into "${table}" select * from json_populate_recordset(null::"${table}", $1::json)`, [JSON.stringify(rows[0].j)]);
      }
    }
    // Serial / identity columns continue after the copied rows.
    const serials = await tx<{ t: string; c: string }[]>`
      select table_name as t, column_name as c from information_schema.columns
      where table_schema = 'public' and (column_default like 'nextval(%' or is_identity = 'YES')`;
    for (const { t, c } of serials) {
      await tx.unsafe(`select setval(pg_get_serial_sequence('"${t}"', '${c}'), coalesce((select max("${c}") from "${t}"), 0) + 1, false)`);
    }
    // Check every table arrived whole before committing.
    for (const table of order) {
      const [{ n: got }] = await tx.unsafe<{ n: number }[]>(`select count(*)::int as n from "${table}"`);
      if (got !== counts[table]) throw new Error(`${table}: copied ${got} of ${counts[table]} rows`);
    }
  });
  await source.close();
  log("Rows copied:", Object.entries(counts).filter(([, c]) => c).map(([t, c]) => `${t}=${c}`).join(" "));
  return true;
}

function* walk(dir: string, base = dir): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full, base);
    else yield path.relative(base, full).split(path.sep).join("/");
  }
}

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", mp4: "video/mp4", webm: "video/webm" };

async function moveFiles(uploadsDir: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "media";
  if (!url || !key) {
    log("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set; files stay on the volume.");
    return;
  }
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, key, { auth: { persistSession: false } });
  // Public bucket: post photos, avatars and backgrounds are public anyway;
  // contracts, NDAs and signatures live in the database, never in storage.
  const { error: getErr } = await client.storage.getBucket(bucket);
  if (getErr) {
    const { error } = await client.storage.createBucket(bucket, { public: true });
    if (error) throw error;
    log(`Created public bucket "${bucket}".`);
  }
  const { isSafeKey } = await import("../storage");
  let uploaded = 0;
  let skipped = 0;
  const keys = [...walk(uploadsDir)];
  for (let i = 0; i < keys.length; i += 8) {
    await Promise.all(
      keys.slice(i, i + 8).map(async (k) => {
        if (!isSafeKey(k)) return skipped++;
        const body = readFileSync(path.join(uploadsDir, k));
        const { error } = await client.storage.from(bucket).upload(k, body, { contentType: TYPES[k.split(".").pop() ?? ""] ?? "application/octet-stream", upsert: true, cacheControl: "31536000" });
        if (error) throw new Error(`${k}: ${error.message}`);
        uploaded++;
      }),
    );
  }
  log(`Uploaded ${uploaded} files to Supabase Storage${skipped ? ` (skipped ${skipped} unexpected files)` : ""}.`);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const pgliteDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  const uploadsDir = process.env.UPLOADS_DIR ?? path.join(process.cwd(), ".data", "uploads");
  const done = path.join(path.dirname(pgliteDir), ".moved-to-supabase");
  if (!databaseUrl) throw new Error("DATABASE_URL is not set.");
  if (existsSync(done)) return log("Already moved (marker file present).");
  if (!existsSync(path.join(pgliteDir, "PG_VERSION"))) return log(`No embedded database at ${pgliteDir}; nothing to move.`);

  const { default: postgres } = await import("postgres");
  const target = postgres(databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await moveDatabase(target, pgliteDir);
  } finally {
    await target.end();
  }
  if (existsSync(uploadsDir)) await moveFiles(uploadsDir);
  // The embedded database and files stay on the volume as a backup.
  writeFileSync(done, new Date().toISOString());
  log("Done. The old data stays on the volume as a backup.");
}

main().catch((error) => {
  console.error("[move] failed:", error);
  process.exit(1);
});
