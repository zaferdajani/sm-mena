import "server-only";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
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

/** Signed-in admin, or redirect. */
export async function requireAdmin() {
  const locale = await getLocale();
  const user = await getSessionUser();
  if (!user) return redirect({ href: "/login", locale });
  if (user.role !== "admin") return redirect({ href: "/", locale });
  return user;
}
