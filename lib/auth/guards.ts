import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { authorizeAgency, authorizeStaff } from "@/lib/core/rules/auth/authorize";
import { adminMfaRequired } from "./mfa";
import type { Permission } from "./permissions";
import { adminAccess } from "./policy";
import { getCurrentAgency, getSessionUser } from "./session";

export { adminAccess };

// Web binding of lib/core/rules/auth/authorize.ts: the same decisions, answered with a redirect.

/** Signed-in agency owner, or redirect to login (staff to the console, clients to their saved list, agents to their page). */
export async function requireAgency() {
  const locale = await getLocale();
  const user = await getSessionUser();
  const decision = authorizeAgency(user, user ? await getCurrentAgency() : null);
  if (!decision.ok) return redirect({ href: decision.redirectTo, locale });
  return { user: decision.user, agency: decision.agency };
}

/**
 * Signed-in staff member with the given permission, or redirect. Enforced on
 * the server for every admin page, action and export: when two-factor sign-in
 * is required, staff without it can only reach the enrolment page
 * (allowEnroll); staff without the permission go back to the dashboard.
 */
export async function requireStaff(permission: Permission = "dashboard.view", { allowEnroll = false } = {}) {
  const locale = await getLocale();
  const decision = authorizeStaff(await getSessionUser(), adminMfaRequired(), permission, { allowEnroll });
  if (!decision.ok) return redirect({ href: decision.redirectTo, locale });
  return decision.user;
}

/** Any staff member (the dashboard permission). */
export const requireAdmin = (options: { allowEnroll?: boolean } = {}) => requireStaff("dashboard.view", options);

/** Any signed-in account (agency or staff), or redirect to login. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return redirect({ href: "/login", locale: await getLocale() });
  return user;
}

/** A signed-in referral agent (docs/42), or redirect. */
export async function requireAgent() {
  const locale = await getLocale();
  const user = await getSessionUser();
  if (!user) return redirect({ href: "/login", locale });
  const { agentForUser } = await import("@/lib/data/referrals");
  const agent = user.role === "agent" ? await agentForUser(user.id) : null;
  if (!agent) return redirect({ href: "/", locale });
  return { user, agent };
}
