import { can, isStaffRole, type Permission } from "./permissions";

/**
 * What a staff member may do right now: two-factor policy first, then the
 * permission. Pure for testing. "forbidden" = signed in but not allowed.
 */
export function adminAccess(
  user: { role: string; mfaEnabled: boolean } | null,
  mfaRequired: boolean,
  permission: Permission = "dashboard.view",
): "login" | "forbidden" | "enroll" | "ok" {
  if (!user) return "login";
  if (!isStaffRole(user.role)) return "forbidden";
  if (mfaRequired && !user.mfaEnabled) return "enroll";
  return can(user.role, permission) ? "ok" : "forbidden";
}
