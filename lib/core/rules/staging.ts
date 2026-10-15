/**
 * Staging / QA deployment gate. Production stays on its own defaults:
 * missing or invalid flags never open staging. VERCEL_ENV=production ignores
 * STAGING_MODE, and so does a local process whose SITE_URL is the live host.
 * A Vercel preview may copy that SITE_URL and still be staging.
 *
 * The live database project is sm-mena (dzedhnmxywtteeduwpby). Staging must
 * use a different DATABASE_URL; the server refuses to boot otherwise.
 */

const PRODUCTION_HOSTS = new Set(["sawwiq.org", "www.sawwiq.org", "sm-mena.vercel.app"]);
/** Supabase project ref of the live sawwiq.org database. Never point staging at it. */
export const PRODUCTION_DB_REF = "dzedhnmxywtteeduwpby";

export type Env = Record<string, string | undefined>;

export function isProductionDeployment(env: Env = process.env): boolean {
  if (env.VERCEL_ENV === "production") return true;
  // A preview or `vercel dev` copy of production config still has
  // NEXT_PUBLIC_SITE_URL=https://sawwiq.org. That host must not hide staging
  // mode. A local process with no VERCEL_ENV keeps the host check below, so
  // pointing SITE_URL at sawwiq.org does not turn this machine into staging.
  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") return false;
  const site = env.NEXT_PUBLIC_SITE_URL;
  if (!site) return false;
  try {
    return PRODUCTION_HOSTS.has(new URL(site).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** True only for an explicit staging deployment that is not the live site. */
export function isStagingMode(env: Env = process.env): boolean {
  return env.STAGING_MODE === "true" && !isProductionDeployment(env);
}

export function usesProductionDatabase(env: Env = process.env): boolean {
  return (env.DATABASE_URL ?? "").includes(PRODUCTION_DB_REF);
}

/**
 * Virtual cards, wallets and the "TEST MODE - virtual money" checkout.
 * Refuses the live site, live protected payments, and any non-sandbox value.
 */
export function virtualPaymentsAllowed(env: Env = process.env): boolean {
  return isStagingMode(env) && env.VIRTUAL_PAYMENTS === "sandbox" && env.PROTECTED_PAYMENTS_LIVE?.trim() !== "true";
}

/** Fail closed before any query when staging is aimed at the live database. */
export function assertStagingDatabase(env: Env = process.env) {
  if (isStagingMode(env) && usesProductionDatabase(env)) {
    throw new Error(
      `STAGING_MODE is on but DATABASE_URL contains the production project ${PRODUCTION_DB_REF}. Refusing to start so staging cannot read or write live data.`,
    );
  }
}

/** Hostnames that must serve only the isolated staging deployment. */
const STAGING_HOSTS = new Set([
  "staging.sawwiq.org",
  "www.staging.sawwiq.org",
  "test.sawwiq.org",
  "www.test.sawwiq.org",
]);

/** First host in a Host or X-Forwarded-Host header, without the port. */
export function requestHost(headerHost: string | null | undefined): string {
  if (!headerHost) return "";
  const first = headerHost.split(",")[0]?.trim() ?? "";
  return first.replace(/:\d+$/, "").toLowerCase();
}

/**
 * staging.sawwiq.org and test.sawwiq.org return 503 unless this process is
 * staging, is not the Vercel production deployment, and is not using the live
 * database. Any other host is left to the normal app.
 */
export function stagingHostMisconfigured(headerHost: string | null | undefined, env: Env = process.env): boolean {
  if (!STAGING_HOSTS.has(requestHost(headerHost))) return false;
  if (env.VERCEL_ENV === "production") return true;
  if (env.STAGING_MODE !== "true") return true;
  if (usesProductionDatabase(env)) return true;
  return false;
}
