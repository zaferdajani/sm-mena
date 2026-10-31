/** Shared demo password for the isolated staging seed. Not a secret of the live site. */
export const STAGING_PASSWORD =
  process.env.STAGING_DEMO_PASSWORD && process.env.STAGING_DEMO_PASSWORD.length >= 12
    ? process.env.STAGING_DEMO_PASSWORD
    : "Staging-Qa-2026!";
