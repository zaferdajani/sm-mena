import "server-only";
import { cache } from "react";
import { isStaffRole } from "@/lib/auth/permissions";
import { getCurrentAgency, getSessionUser } from "@/lib/auth/session";
import { featureOpen, getFeatures, type FeatureKey } from "@/lib/features";

/** Who is asking (once per request): staff preview features in "soon"; pilot agencies use them. */
export const viewer = cache(async () => {
  const user = await getSessionUser();
  const agency = user ? await getCurrentAgency() : null;
  return { staff: isStaffRole(user?.role), agencyHandle: agency?.handle ?? null };
});

/** open: usable by this visitor; soon: show "Coming soon"; off: hide (404). */
export async function featureGate(key: FeatureKey): Promise<"open" | "soon" | "off"> {
  const f = (await getFeatures())[key];
  if (await featureOpen(key, await viewer())) return "open";
  return f.state === "off" ? "off" : "soon";
}

export const canUse = async (key: FeatureKey) => (await featureGate(key)) === "open";
