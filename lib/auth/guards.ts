import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { adminMfaRequired } from "./mfa";
import { adminAccess } from "./policy";

export { adminAccess };
import { getCurrentAgency, getSessionUser } from "./session";

/** Signed-in agency owner, or redirect to login. */
export async function requireAgency() {
  const locale = await getLocale();
  const user = await getSessionUser();
  if (!user) return redirect({ href: "/login", locale });
  const agency = await getCurrentAgency();
  if (!agency) return redirect({ href: user.role === "admin" ? "/admin" : "/login", locale });
  return { user, agency };
}

/**
 * Signed-in admin, or redirect. Enforced on the server for every admin page
 * and action: when two-factor sign-in is required, an admin without it can
 * only reach the enrolment page (allowEnroll).
 */
export async function requireAdmin({ allowEnroll = false } = {}) {
  const locale = await getLocale();
  const user = await getSessionUser();
  const access = adminAccess(user, adminMfaRequired());
  if (access === "login") return redirect({ href: "/login", locale });
  if (access === "forbidden") return redirect({ href: "/", locale });
  if (access === "enroll" && !allowEnroll) return redirect({ href: "/admin/security", locale });
  return user!;
}

/** Any signed-in account (agency or admin), or redirect to login. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) return redirect({ href: "/login", locale: await getLocale() });
  return user;
}
