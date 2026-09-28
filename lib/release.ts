/** Public, non-secret identifiers. A missing SHA stays unknown, never inferred. */
export const UI_REVISION = "collaboration-v2-r3.2";

export function releaseInfo() {
  const candidate = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "";
  const commit = /^[a-f0-9]{40}$/i.test(candidate) ? candidate.toLowerCase() : null;
  const configured = process.env.VERCEL_ENV;
  const environment = configured === "production" || configured === "preview" || configured === "development"
    ? configured
    : "unknown";
  return { revision: UI_REVISION, commit, environment };
}
