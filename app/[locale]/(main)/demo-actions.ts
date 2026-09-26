"use server";

import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createSession, destroySession, getSessionUser } from "@/lib/auth/session";
import { getAgencyByHandle, getAgencyByOwner } from "@/lib/data/agencies";
import { DEMO_COOKIE, DEMO_STUDIO_HANDLES } from "@/lib/demo";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const isStudioHandle = (v: unknown): v is (typeof DEMO_STUDIO_HANDLES)[number] => typeof v === "string" && (DEMO_STUDIO_HANDLES as readonly string[]).includes(v);

/**
 * Turns the demo on for this browser (lib/demo.ts). With `as` set to one of
 * the demo agencies, also signs in as that agency, without a password: only
 * seeded demo agencies whose owner is a plain agency account, never staff.
 */
export async function enterDemoAction(formData: FormData) {
  (await cookies()).set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  const locale = await getLocale();
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

/** Leaves the demo; a demo agency's session ends with it. */
export async function exitDemoAction() {
  (await cookies()).delete(DEMO_COOKIE);
  const user = await getSessionUser();
  if (user && (await getAgencyByOwner(user.id))?.isDemo) await destroySession();
  const locale = await getLocale();
  return redirect({ href: "/", locale });
}
