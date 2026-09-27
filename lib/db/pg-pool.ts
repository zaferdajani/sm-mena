import type { PoolConfig } from "pg";

/**
 * node-postgres settings for Supabase's transaction pooler (docs/27).
 * Supabase requires TLS but signs with its own CA, which Node does not
 * trust; postgres.js with sslmode=require encrypts without verifying, and
 * this keeps that behaviour (node-postgres would otherwise treat sslmode in
 * the URL as verify-full and refuse the connection). The connection string's
 * sslmode is dropped so it cannot override the ssl option below.
 */
export function pgPoolConfig(url: string): PoolConfig {
  let connectionString = url;
  let ssl: PoolConfig["ssl"];
  try {
    const u = new URL(url);
    const mode = u.searchParams.get("sslmode");
    u.searchParams.delete("sslmode");
    connectionString = u.toString();
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    ssl = mode === "disable" || (local && !mode) ? false : { rejectUnauthorized: false };
  } catch {
    // Not a URL we can read; use it as given.
  }
  return {
    connectionString,
    ssl,
    max: 3,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    // A stalled query fails the request instead of holding it open.
    query_timeout: 25_000,
  };
}
