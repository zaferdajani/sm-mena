// What /api/health says about file storage (configuration only, never secrets).
// Supabase without its keys fails every page that shows a photo. Local disk on
// Vercel is worse because it looks fine: each server has its own temporary
// folder, so a photo uploaded on one request is gone on the next and shows as a
// broken image (staging, 2026-10-29). Both make the check fail.
export function storageHealth(env: Record<string, string | undefined> = process.env): { ready: boolean; label: string } {
  if (env.STORAGE_PROVIDER === "supabase") {
    const ready = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
    return { ready, label: ready ? "supabase" : "supabase (keys missing)" };
  }
  if (env.VERCEL) return { ready: false, label: "local (temporary on Vercel: uploads vanish)" };
  return { ready: true, label: "local" };
}
