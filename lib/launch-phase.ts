/**
 * A reversible release boundary, not an account type or a second application.
 * Server deployment setting only. Missing/invalid configuration fails closed.
 * Stage changes never rewrite feature settings, memberships or commercial terms.
 */
export const LAUNCH_PHASES = ["registration", "discovery", "full"] as const;
export type LaunchPhase = (typeof LAUNCH_PHASES)[number];
export function launchPhase(): LaunchPhase {
  const raw = process.env.LAUNCH_PHASE;
  return LAUNCH_PHASES.find((p) => p === raw) ?? "registration";
}
export const isRegistrationPhase = () => launchPhase() === "registration";
export const documentsOpen = () => launchPhase() === "full";

// Independent of feature flags: a saved 'on' cannot accidentally open stage 3.
const TRANSACTION_FEATURES = new Set(["contracts", "ndas", "protected_payments", "paid_plans"]);
const DISCOVERY_FEATURES = new Set(["quote_requests", "ai_matchmaker", "messaging", "reviews", "partners", "collaboration", "demo_view"]);
export function launchAllowsFeature(key: string, who: { staff?: boolean; agencyHandle?: string | null } = {}): boolean {
  const phase = launchPhase();
  if (TRANSACTION_FEATURES.has(key)) return phase === "full";
  if (phase === "registration" && DISCOVERY_FEATURES.has(key)) return Boolean(who.staff || isLaunchPilot(who.agencyHandle));
  return true;
}
/** Explicit, server-configured test cohort. A query parameter or demo cookie cannot enroll a pilot. */
export function isLaunchPilot(handle?: string | null): boolean {
  if (!handle) return false;
  const allowed = (process.env.LAUNCH_PILOT_HANDLES ?? "").split(",").map((v) => v.trim().toLowerCase()).filter((v) => /^[a-z0-9._]{2,40}$/.test(v));
  return allowed.includes(handle.toLowerCase());
}

export const PROFILE_VISIBILITIES = ["private", "unlisted", "public"] as const;
export type ProfileVisibility = (typeof PROFILE_VISIBILITIES)[number];
export const PUBLICATION_CONSENT_VERSION = "profile-publication-v1";
/** Authenticated owner/staff can preview; launch participation never overrides privacy. */
export function canReadProfile(visibility: ProfileVisibility, owner: boolean, staff: boolean): boolean {
  return owner || staff || visibility !== "private";
}
export function profileIndexable(visibility: ProfileVisibility, isDemo = false): boolean {
  return !isRegistrationPhase() && visibility === "public" && !isDemo;
}
