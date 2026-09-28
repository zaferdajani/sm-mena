import "server-only";
import { notFound } from "next/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { featureGate } from "@/lib/feature-gate";

/** Every collaboration page: signed-in agency, and the switch decides open / coming soon / hidden. */
export async function collabPage() {
  const { agency, user } = await requireAgency();
  const gate = await featureGate("collaboration");
  if (gate === "off") notFound();
  return { agency, user, soon: gate === "soon" };
}

/** Work-order pages (R2): both switches; "collaboration_delivery" alone may be coming soon. */
export async function deliveryPage() {
  const base = await collabPage();
  const delivery = await featureGate("collaboration_delivery");
  if (delivery === "off") notFound();
  return { ...base, soonFeature: base.soon ? ("collaboration" as const) : delivery === "soon" ? ("collaboration_delivery" as const) : null };
}
