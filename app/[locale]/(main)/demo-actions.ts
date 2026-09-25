"use server";

import { cookies } from "next/headers";
import { DEMO_COOKIE } from "@/lib/demo-mode";
import { canUse } from "@/lib/feature-gate";

/** Turns the labelled demo view on or off for this browser (docs/31). */
export async function setDemoModeAction(on: boolean) {
  const jar = await cookies();
  // Entering needs the demo view switched on (Admin → Features); leaving always works.
  if (on && !(await canUse("demo_view"))) return;
  if (on) jar.set(DEMO_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax", httpOnly: true });
  else jar.delete(DEMO_COOKIE);
}
