import "server-only";
import { and, inArray, isNull } from "drizzle-orm";
import { createTranslator } from "use-intl";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendPlainEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import ar from "@/messages/ar.json";

export type StaffAlert = "supportReport" | "postReport" | "dispute" | "appeal";

const PAGE: Record<StaffAlert, string> = {
  supportReport: "/admin/bugs",
  postReport: "/admin/reports",
  dispute: "/admin/payments?tab=protected",
  appeal: "/admin/payments?tab=protected",
};

/**
 * Something new waits for the team: email the owner and admins with a link to the page that handles it (the
 * same items the dashboard's "Needs your attention" lists). Never the report text, names, phones or emails of
 * the people involved. Email is a courtesy: a failure never blocks the action that triggered it.
 */
export async function notifyStaff(kind: StaffAlert) {
  try {
    const db = await getDb();
    const staff = await db.select({ email: users.email }).from(users).where(and(inArray(users.role, ["owner", "admin"]), isNull(users.disabledAt)));
    const t = createTranslator({ locale: "ar", messages: ar, namespace: "StaffAlertEmail" });
    for (const s of staff) await sendPlainEmail(s.email, t(`${kind}.subject`), [t(`${kind}.body`), "", `${SITE_URL}/ar${PAGE[kind]}`], `staff-${kind}`);
  } catch (e) {
    console.warn("[staff-alert]", kind, e instanceof Error ? e.message : e);
  }
}
