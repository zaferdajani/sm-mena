import "server-only";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, contractRequests, type Agency, type ContractRequest } from "@/lib/db/schema";
import { arePartners } from "./contracts";
import { addNotifications } from "./notifications";

// Partner contracts (docs/14, docs/30). The one doing the work is always the
// contract's agency, so an agency that wants to buy from a partner asks for a
// contract; the partner creates it with the asking agency as the client, and
// the asking agency signs, pays and approves from its own studio.

type Result = { ok: true; id: string } | { error: "notPartner" | "invalid" | "tooMany" };

export async function requestContractFromPartner(from: Agency, toAgencyId: string, input: { title: string; brief: string; budgetFils?: number | null }): Promise<Result> {
  if (!(await arePartners(from.id, toAgencyId))) return { error: "notPartner" };
  const title = input.title.trim().slice(0, 120);
  if (title.length < 3) return { error: "invalid" };
  const db = await getDb();
  const open = await db
    .select({ id: contractRequests.id })
    .from(contractRequests)
    .where(and(eq(contractRequests.fromAgencyId, from.id), eq(contractRequests.toAgencyId, toAgencyId), eq(contractRequests.status, "pending")));
  if (open.length >= 3) return { error: "tooMany" };
  const [row] = await db
    .insert(contractRequests)
    .values({ fromAgencyId: from.id, toAgencyId, title, brief: input.brief.trim().slice(0, 2000), budgetFils: input.budgetFils && input.budgetFils > 0 ? Math.round(input.budgetFils) : null })
    .returning({ id: contractRequests.id });
  await addNotifications([{ agencyId: toAgencyId, kind: "contract_request", href: "/studio/contracts", params: { name: from.name, title } }]);
  return { ok: true, id: row.id };
}

export type ContractRequestRow = ContractRequest & { other: { id: string; name: string; handle: string } };

/** Requests this agency received (to create a contract) and sent (waiting for a contract). */
export async function listContractRequests(agencyId: string): Promise<{ incoming: ContractRequestRow[]; outgoing: ContractRequestRow[] }> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(contractRequests)
    .where(or(eq(contractRequests.toAgencyId, agencyId), eq(contractRequests.fromAgencyId, agencyId)))
    .orderBy(desc(contractRequests.createdAt))
    .limit(100);
  if (!rows.length) return { incoming: [], outgoing: [] };
  const ids = [...new Set(rows.map((r) => (r.toAgencyId === agencyId ? r.fromAgencyId : r.toAgencyId)))];
  const others = new Map((await db.select({ id: agencies.id, name: agencies.name, handle: agencies.handle }).from(agencies).where(inArray(agencies.id, ids))).map((a) => [a.id, a]));
  const withOther = rows.flatMap((r) => {
    const o = others.get(r.toAgencyId === agencyId ? r.fromAgencyId : r.toAgencyId);
    return o ? [{ ...r, other: o }] : [];
  });
  return { incoming: withOther.filter((r) => r.toAgencyId === agencyId), outgoing: withOther.filter((r) => r.fromAgencyId === agencyId) };
}

/** The partner (supplier) opening a request to write the contract: only its own, pending ones. */
export async function contractRequestFor(supplierId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(contractRequests).where(and(eq(contractRequests.id, id), eq(contractRequests.toAgencyId, supplierId), eq(contractRequests.status, "pending")));
  return row ?? null;
}

/** The partner declines, or the asking agency cancels, a pending request. */
export async function answerContractRequest(agencyId: string, id: string, answer: "declined" | "cancelled") {
  const db = await getDb();
  const who = answer === "declined" ? eq(contractRequests.toAgencyId, agencyId) : eq(contractRequests.fromAgencyId, agencyId);
  const rows = await db
    .update(contractRequests)
    .set({ status: answer, respondedAt: new Date() })
    .where(and(eq(contractRequests.id, id), eq(contractRequests.status, "pending"), who))
    .returning({ id: contractRequests.id });
  return rows.length > 0;
}

/** Client details to prefill a contract for a partner agency (it becomes the client). */
export async function partnerAsClient(supplierId: string, partnerId: string) {
  if (!/^[0-9a-f-]{36}$/.test(partnerId) || !(await arePartners(supplierId, partnerId))) return null;
  const db = await getDb();
  const [a] = await db.select({ id: agencies.id, name: agencies.name, phone: agencies.phone, whatsapp: agencies.whatsapp, email: agencies.email }).from(agencies).where(eq(agencies.id, partnerId));
  return a ? { id: a.id, name: a.name, phone: a.whatsapp || a.phone || "", email: a.email ?? "" } : null;
}
