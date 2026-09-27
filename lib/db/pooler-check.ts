// Maintenance → pooler-check: runs the same small read-only queries the admin
// pages run, several at a time, through Supabase's transaction pooler (port
// 6543) with both database drivers, and reports how many stall. Reads counts
// only; never row data.
import pg from "pg";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set.");
const pooled = new URL(url);
if (pooled.hostname.endsWith(".pooler.supabase.com")) pooled.port = "6543";

const ROUNDS = 15;
const PARALLEL = 6;
const TIMEOUT_MS = 8000;

const withTimeout = <T>(p: Promise<T>) =>
  Promise.race([p.then(() => "ok" as const), new Promise<"stalled">((r) => setTimeout(() => r("stalled"), TIMEOUT_MS))]).catch(() => "error" as const);

async function run(name: string, query: (i: number) => Promise<unknown>, close: () => Promise<unknown>) {
  const tally = { ok: 0, stalled: 0, error: 0 };
  const started = Date.now();
  for (let round = 0; round < ROUNDS; round++) {
    const results = await Promise.all(Array.from({ length: PARALLEL }, (_, i) => withTimeout(query(i))));
    for (const r of results) tally[r]++;
  }
  console.log(`${name}: ${JSON.stringify(tally)} in ${Math.round((Date.now() - started) / 1000)} s`);
  await Promise.race([close(), new Promise((r) => setTimeout(r, 3000))]);
}

async function main() {
  const since = new Date(Date.now() - 30 * 86_400_000);
  console.log(`Transaction pooler port ${pooled.port}; ${ROUNDS} rounds × ${PARALLEL} parallel parameterized queries.`);

  const pj = postgres(pooled.toString(), { prepare: false, max: 3, max_pipeline: 1, connect_timeout: 10 } as postgres.Options<Record<string, never>>);
  await run(
    "postgres.js (prepare: false)",
    (i) => (i % 2 ? pj`select count(*)::int from service_tags where status = ${"pending"}` : pj`select count(*)::int from posts where created_at >= ${since}`),
    () => pj.end({ timeout: 1 }),
  );

  const pool = new pg.Pool({ connectionString: pooled.toString(), max: 3, connectionTimeoutMillis: 10_000 });
  await run(
    "pg (node-postgres)",
    (i) => (i % 2 ? pool.query("select count(*)::int from service_tags where status = $1", ["pending"]) : pool.query("select count(*)::int from posts where created_at >= $1", [since])),
    () => pool.end(),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
