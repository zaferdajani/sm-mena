import "server-only";
import { cache } from "react";
import { adminAccess } from "@/lib/auth/policy";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { getCurrentAgency, getSessionUser } from "@/lib/auth/session";
import { isLaunchPilot, isRegistrationPhase } from "@/lib/launch-phase";

export const launchViewer = cache(async () => {
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
