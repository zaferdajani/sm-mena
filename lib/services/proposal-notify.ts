import "server-only";
import { and, inArray, isNull } from "drizzle-orm";
import { createTranslator } from "use-intl";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendPlainEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import ar from "@/messages/ar.json";

/**
 * A provider typed a service the catalogue lacks (docs/30): tell the owner and admins that a proposal is
 * waiting at Admin → Services. The email names the proposed service only, never who typed it.
 */
export async function notifyServiceProposal(text: string) {
  const db = await getDb();
  const staff = await db.select({ email: users.email }).from(users).where(and(inArray(users.role, ["owner", "admin"]), isNull(users.disabledAt)));
  const t = createTranslator({ locale: "ar", messages: ar, namespace: "ServiceProposalEmail" });
  for (const s of staff) await sendPlainEmail(s.email, t("subject", { service: text }), [t("body", { service: text }), "", `${SITE_URL}/ar/admin/services`], "service-proposal");
}
