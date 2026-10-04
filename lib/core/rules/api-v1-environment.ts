/** M3 is staging-only. Hosting production markers veto even a copied staging opt-in.
 * NODE_ENV=production also describes a staging Next build, so use an explicit scope.
 * This is a deployment guard, not proof that database/storage credentials are isolated.
 */
export function apiV1Allowed(env: Record<string, string | undefined>): boolean {
  if (env.API_V1_ENABLED !== "true") return false;
  if (env.VERCEL_ENV === "production" || env.VERCEL_TARGET_ENV === "production") return false;
  if (env.API_V1_ENVIRONMENT === "production") return false;
  return env.API_V1_ENVIRONMENT === "staging" ||
    (!env.VERCEL && !env.VERCEL_ENV && !env.VERCEL_TARGET_ENV &&
      (env.NODE_ENV === "development" || env.NODE_ENV === "test"));
}
