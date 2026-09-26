import "server-only";
import { isStaffRole } from "@/lib/auth/permissions";
import { getSessionUser } from "@/lib/auth/session";

/** The front page's account button: sign in, or back to the studio / admin console. */
export async function accountLink(locale: string) {
  const user = await getSessionUser();
  const ar = locale !== "en";
  if (!user) return { href: `/${locale}/login`, label: ar ? "تسجيل الدخول" : "Sign in" };
  if (isStaffRole(user.role)) return { href: `/${locale}/admin`, label: ar ? "لوحة الإدارة" : "Admin" };
  return { href: `/${locale}/studio`, label: ar ? "الاستوديو" : "Studio" };
}
