import "server-only";
import { cache } from "react";
import { adminAccess } from "@/lib/auth/policy";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { isLaunchPilot, isRegistrationPhase } from "@/lib/launch-phase";

/** Only a real request can establish an owner, staff member or pilot. */
export const launchViewer = cache(async () => {
  const { getCurrentAgency, getSessionUser } = await import("@/lib/auth/session");
  const user = await getSessionUser();
  const agency = user ? await getCurrentAgency() : null;
  return {
    userId: user?.id ?? null,
    agencyId: agency?.id ?? null,
    staff: adminAccess(user, adminMfaRequired(), "agencies.view") === "ok",
    pilot: Boolean(agency && !agency.isDemo && agency.status === "active" && isLaunchPilot(agency.handle)),
  };
});
export async function canBrowseDirectory(): Promise<boolean> {
  if (!isRegistrationPhase()) return true;
  const who = await launchViewer();
  return who.staff || who.pilot;
}
/** Route convenience only. Import request navigation only on the redirect path:
 * data jobs/tests in the full phase must not load next-intl's browser router.
 * Private profile checks still call launchViewer and never infer an identity.
 */
export async function requireDirectory() {
  if (!(await canBrowseDirectory())) {
    const [{ getLocale }, { redirect }] = await Promise.all([
      import("next-intl/server"), import("@/i18n/navigation"),
    ]);
    redirect({ href: "/soon", locale: await getLocale() });
  }
}
