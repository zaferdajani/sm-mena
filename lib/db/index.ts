import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_DIR = path.join(process.cwd(), "lib", "db", "migrations");

type Cache = { db?: Promise<DB>; close?: () => Promise<void> };
const globalCache = globalThis as unknown as { __sawwiqDb?: Cache };
const cache: Cache = (globalCache.__sawwiqDb ??= {});

/**
 * Returns the database.
 * - DATABASE_URL set: PostgreSQL via postgres-js (run `npm run db:migrate` first).
 * - Otherwise: PGlite (Postgres in WebAssembly) stored in PGLITE_DIR
 *   (default .data/pglite; "memory://" for tests). Migrations run automatically.
 * The instance is cached on globalThis so Next.js never opens the same
 * PGlite directory twice in one process.
 */
export function getDb(): Promise<DB> {
  cache.db ??= connect();
  return cache.db;
}

async function connect(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const client = postgres(url, { prepare: false, max: 10 });
    cache.close = () => client.end();
    const db = drizzle(client, { schema });
    // drizzle turns postgres-js's date serializers into pass-throughs (it maps
    // column values itself), so a Date used directly in a sql`` template
    // would reach the driver unconverted. Send those as ISO strings.
    const toText = (v: unknown) => (v instanceof Date ? v.toISOString() : v);
    for (const oid of [1082, 1083, 1114, 1184, 1266]) client.options.serializers[oid] = toText;
    return db as unknown as DB;
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (!dir.startsWith("memory://")) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(path.dirname(dir), { recursive: true });
  }
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  cache.close = () => client.close();
  return db as unknown as DB;
}

/** Closes the connection (scripts and tests). */
export async function closeDb() {
  if (cache.close) await cache.close();
  cache.db = undefined;
  cache.close = undefined;
}

export { schema };
