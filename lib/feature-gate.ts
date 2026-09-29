import { launchAllowsFeature } from "@/lib/launch-phase";
import "server-only";
import { cache } from "react";
import { adminAccess } from "@/lib/auth/policy";
import { adminMfaRequired } from "@/lib/auth/mfa";
import { getCurrentAgency, getSessionUser } from "@/lib/auth/session";
import { featureOpen, getFeatures, type FeatureKey } from "@/lib/features";

/** Who is asking (once per request): staff preview features in "soon"; pilot agencies use them. */
export const viewer = cache(async () => {
  const user = await getSessionUser();
  const agency = user ? await getCurrentAgency() : null;
  return { staff: adminAccess(user, adminMfaRequired(), "agencies.view") === "ok", agencyHandle: agency?.handle ?? null };
});

/** open: usable by this visitor; soon: show "Coming soon"; off: hide (404). */
export async function featureGate(key: FeatureKey): Promise<"open" | "soon" | "off"> {
  if (!launchAllowsFeature(key, await viewer())) return "off";
  const f = (await getFeatures())[key];
  if (await featureOpen(key, await viewer())) return "open";
  return f.state === "off" ? "off" : "soon";
}

export const canUse = async (key: FeatureKey) => (await featureGate(key)) === "open";
