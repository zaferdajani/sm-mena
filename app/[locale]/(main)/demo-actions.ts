"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";
import { getAgencyByHandle, getAgencyByOwner } from "@/lib/data/agencies";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DEMO_COOKIE, DEMO_STUDIO_HANDLES } from "@/lib/demo-mode";
import { canUse } from "@/lib/feature-gate";

/** Turns the labelled demo view on or off for this browser (docs/31). Leaving also ends a demo agency's session (docs/35). */
export async function setDemoModeAction(on: boolean) {
  const jar = await cookies();
  // Entering needs the demo view switched on (Admin → Features); leaving always works.
  if (on && !(await canUse("demo_view"))) return;
  if (on) jar.set(DEMO_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24, sameSite: "lax", httpOnly: true });
  else {
    jar.delete(DEMO_COOKIE);
    const user = await getSessionUser();
    if (user && (await getAgencyByOwner(user.id))?.isDemo) await destroySession();
  }
}

const isStudioHandle = (v: unknown): v is (typeof DEMO_STUDIO_HANDLES)[number] => typeof v === "string" && (DEMO_STUDIO_HANDLES as readonly string[]).includes(v);

/**
 * The /demo page (docs/35): turns the demo view on and, with `as` set to one
 * of the demo agencies, signs in as it without a password. Only seeded demo
 * agencies whose owner is a plain agency account qualify, never staff.
 */
export async function enterDemoAction(formData: FormData) {
  const locale = await getLocale();
  if (!(await canUse("demo_view"))) return redirect({ href: "/demo", locale });
  await setDemoModeAction(true);
  const as = formData.get("as");
  if (isStudioHandle(as)) {
    const agency = await getAgencyByHandle(as);
    if (agency?.isDemo) {
      const db = await getDb();
      const [owner] = await db.select({ role: users.role }).from(users).where(eq(users.id, agency.ownerUserId));
      if (owner?.role === "agency") {
        await createSession(agency.ownerUserId);
        return redirect({ href: "/studio", locale });
      }
    }
  }
  return redirect({ href: "/", locale });
}
