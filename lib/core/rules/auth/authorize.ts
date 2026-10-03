import { isStaffRole, type Permission } from "./permissions";
import { adminAccess } from "./policy";

// Authorization as decisions (docs/architecture/mobile-and-api-roadmap.md §3 step 7). The web guards
// (lib/auth/guards.ts) redirect on a deny; the bearer API answers with the matching error code. Both
// read the same table, so a native client can never reach more than a browser.

export type Deny = "unauthenticated" | "forbidden" | "mfa_enroll" | "wrong_role";
export type Decision<T> = ({ ok: true } & T) | { ok: false; deny: Deny; /** Where the web sends the person (locale-less path). */ redirectTo: string };

type User = { id: string; role: string; mfaEnabled: boolean } | null;

/** A signed-in agency owner. Staff, client and agent accounts are the wrong role here. */
export function authorizeAgency<U extends NonNullable<User>, A extends object>(user: U | null, agency: A | null): Decision<{ user: U; agency: A }> {
  if (!user) return { ok: false, deny: "unauthenticated", redirectTo: "/login" };
  if (!agency) {
    const redirectTo = isStaffRole(user.role) ? "/admin" : user.role === "client" ? "/saved" : user.role === "agent" ? "/agent" : "/login";
    return { ok: false, deny: "wrong_role", redirectTo };
  }
  return { ok: true, user, agency };
}

/**
 * A staff member holding `permission`. When two-factor sign-in is required, staff without it may
 * only reach the enrolment page (allowEnroll); staff without the permission go back to the dashboard.
 */
export function authorizeStaff<U extends NonNullable<User>>(user: U | null, mfaRequired: boolean, permission: Permission = "dashboard.view", { allowEnroll = false } = {}): Decision<{ user: U }> {
  const access = adminAccess(user, mfaRequired, permission);
  if (access === "login") return { ok: false, deny: "unauthenticated", redirectTo: "/login" };
  if (access === "forbidden") return { ok: false, deny: "forbidden", redirectTo: user && isStaffRole(user.role) && permission !== "dashboard.view" ? "/admin" : "/" };
  if (access === "enroll" && !allowEnroll) return { ok: false, deny: "mfa_enroll", redirectTo: "/admin/security" };
  return { ok: true, user: user! };
}
