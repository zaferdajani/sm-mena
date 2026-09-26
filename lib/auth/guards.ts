import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { adminMfaRequired } from "./mfa";
import { isStaffRole, type Permission } from "./permissions";
import { adminAccess } from "./policy";
import { getCurrentAgency, getSessionUser } from "./session";

export { adminAccess };

/** Signed-in agency owner, or redirect to login. */
export async function requireAgency() {
  const locale = await getLocale();
  const user = await getSessionUser();
  if (!user) return redirect({ href: "/login", locale });
  const agency = await getCurrentAgency();
  // Staff go to the console; client accounts (docs/41) to their saved list.
  if (!agency) return redirect({ href: isStaffRole(user.role) ? "/admin" : user.role === "client" ? "/saved" : "/login", locale });
  return { user, agency };
}

/**
 * Signed-in staff member with the given permission, or redirect. Enforced on
 * the server for every admin page, action and export: when two-factor sign-in
 * is required, staff without it can only reach the enrolment page
 * (allowEnroll); staff without the permission go back to the dashboard.
 */
export async function requireStaff(permission: Permission = "dashboard.view", { allowEnroll = false } = {}) {
  const locale = await getLocale();
  const user = await getSessionUser();
  const access = adminAccess(user, adminMfaRequired(), permission);
  if (access === "login") return redirect({ href: "/login", locale });
  if (access === "forbidden") return redirect({ href: user && isStaffRole(user.role) && permission !== "dashboard.view" ? "/admin" : "/", locale });
  if (access === "enroll" && !allowEnroll) return redirect({ href: "/admin/security", locale });
  return user!;
}

/** Any staff member (the dashboard permission). */
export const requireAdmin = (options: { allowEnroll?: boolean } = {}) => requireStaff("dashboard.view", options);

/** Any signed-in account (agency or staff), or redirect to login. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return redirect({ href: "/login", locale: await getLocale() });
  return user;
}
