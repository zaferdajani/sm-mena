import "server-only";
import { eq } from "drizzle-orm";
import { createTranslator } from "next-intl";
import { tryOpen } from "@/lib/auth/secret-box";
import type { ContractNotificationKind } from "@/lib/chat";
import { getDb } from "@/lib/db";
import { agencies, type Contract } from "@/lib/db/schema";
import { formatDate } from "@/lib/format";
import { sendContractEmail } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import { addNotifications, type NewNotification } from "./notifications";

// Tells the parties about a contract event (docs/14): an in-app notification
// for the agency's studio, for a buying agency's studio (partner contracts)
// and for the client's device once it signed (visitor cookie), plus an email
// where the party gave an address. Params never hold a phone or an email.

export type Audience = "agency" | "client" | "both";
export type NotifyParams = { milestone?: string; date?: Date | null; days?: number };

type ContractRef = Pick<Contract, "id" | "agencyId" | "clientAgencyId" | "clientVisitorId" | "clientName" | "clientEmail" | "clientTokenEnc" | "title" | "locale">;

/**
 * Notifications link to the contract: the studio page for agencies, and for
 * the client's device `/c/<contract id>`, which only opens (redirects to the
 * private link) on the device that signed.
 */
export const clientDeviceHref = (contractId: string) => `/c/${contractId}`;

export async function notifyContract(c: ContractRef, kind: ContractNotificationKind, audience: Audience, p: NotifyParams = {}) {
  try {
    const db = await getDb();
    const party = async (id: string) => (await db.select({ id: agencies.id, name: agencies.name, email: agencies.email }).from(agencies).where(eq(agencies.id, id)))[0] ?? null;
    const supplier = await party(c.agencyId);
    const buyer = c.clientAgencyId ? await party(c.clientAgencyId) : null;
    const base = { title: c.title, ...(p.milestone ? { milestone: p.milestone } : {}), ...(p.date ? { date: p.date.toISOString() } : {}), ...(p.days !== undefined ? { days: p.days } : {}) };
    const out: NewNotification[] = [];
    const href = `/studio/contracts/${c.id}`;
    const toAgency = audience === "agency" || audience === "both";
    const toClient = audience === "client" || audience === "both";
    if (toAgency) out.push({ agencyId: c.agencyId, kind, href, params: { ...base, name: buyer?.name ?? c.clientName } });
    if (toClient && buyer) out.push({ agencyId: buyer.id, kind, href, params: { ...base, name: supplier?.name ?? "" } });
    if (toClient && c.clientVisitorId) out.push({ visitorId: c.clientVisitorId, kind, href: clientDeviceHref(c.id), params: { ...base, name: supplier?.name ?? "" } });
    await addNotifications(out);

    const link = (path: string) => `${SITE_URL}/${c.locale === "en" ? "en" : "ar"}${path}`;
    const token = tryOpen(c.clientTokenEnc);
    if (toAgency) await email(supplier?.email, kind, { ...p, title: c.title, name: buyer?.name ?? c.clientName }, link(href));
    if (toClient && buyer) await email(buyer.email, kind, { ...p, title: c.title, name: supplier?.name ?? "" }, link(href));
    else if (toClient && token) await email(c.clientEmail, kind, { ...p, title: c.title, name: supplier?.name ?? "" }, link(`/c/${token}`));
  } catch (e) {
    // Notifying is a courtesy; the contract page and its history are the record.
    if (process.env.NODE_ENV !== "test") console.error("[contract-notify]", e);
  }
}

/** One email in both languages: "Arabic line · English line". */
async function email(to: string | null | undefined, kind: ContractNotificationKind, p: NotifyParams & { title: string; name: string }, link: string) {
  if (!to) return;
  const line = (locale: "ar" | "en") => {
    const t = createTranslator({ locale, messages: locale === "ar" ? ar : en, namespace: "Notifications" });
    return t(`kinds.${kind}`, {
      name: p.name,
      title: p.title,
      milestone: p.milestone ?? "",
      date: p.date ? formatDate(p.date, locale) : "",
      days: p.days ?? 0,
      count: 1,
      services: "",
    });
  };
  const arLine = line("ar");
  const enLine = line("en");
  await sendContractEmail(to, `سوّق · ${arLine} · ${enLine}`.slice(0, 180), [arLine, enLine], link);
}
