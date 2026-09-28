import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { agencies, contracts, workInquiries, workOrders, workQuotes, type Agency } from "@/lib/db/schema";

// The buyer's private cost worksheet (docs/50 §worksheet, AC24): quoted
// supplier costs and dates next to the buyer's own client contract, grouped
// by that contract. Unknowns stay unknown; currencies are never summed
// together; nothing here is a quotation or a commitment. Only the buying
// agency's owner sees it (one login per agency: the owner is finance).

export type WorksheetLine = { id: string; kind: "order" | "inquiry"; title: string; supplier: string; amountFils: number | null; currency: string | null; dueOn: string | null; status: string; parentContractId: string | null; href: string };
export type WorksheetGroup = {
  parent: { id: string; number: string; title: string; totalFils: number; currency: string; status: string } | null;
  lines: WorksheetLine[];
  /** Supplier costs per currency; a line without an amount is counted in `unknown`. */
  costs: { currency: string; fils: number }[];
  unknown: number;
  /** Client price minus supplier costs, only when every known cost is in the contract's currency. */
  margin: { fils: number; percent: number } | null | "mixed_currency";
};

export async function worksheetFor(me: Agency): Promise<WorksheetGroup[]> {
  const db = await getDb();
  const orders = await db
    .select({ o: workOrders, supplier: agencies.name })
    .from(workOrders)
    .innerJoin(agencies, eq(agencies.id, workOrders.supplierAgencyId))
    .where(eq(workOrders.buyerAgencyId, me.id))
    .orderBy(desc(workOrders.createdAt))
    .limit(200);
  const inquiryIds = [...new Set(orders.map((r) => r.o.inquiryId).filter((x): x is string => Boolean(x)))];
  const accepted = inquiryIds.length
    ? await db.select({ inquiryId: workInquiries.id, amountFils: workQuotes.amountFils, currency: workQuotes.currency, dueOn: workQuotes.dueOn }).from(workInquiries).innerJoin(workQuotes, eq(workQuotes.id, workInquiries.acceptedQuoteId)).where(inArray(workInquiries.id, inquiryIds))
    : [];
  const quoteByInquiry = new Map(accepted.map((q) => [q.inquiryId, q]));
  // Converted inquiries without a work order yet still cost something: show them too.
  const orphanInquiries = await db
    .select({ i: workInquiries, q: workQuotes, supplier: agencies.name })
    .from(workInquiries)
    .innerJoin(workQuotes, eq(workQuotes.id, workInquiries.acceptedQuoteId))
    .innerJoin(agencies, eq(agencies.id, workQuotes.supplierAgencyId))
    .where(and(eq(workInquiries.buyerAgencyId, me.id), eq(workInquiries.status, "converted")))
    .limit(200);
  const lines: WorksheetLine[] = [];
  for (const { o, supplier } of orders) {
    const q = o.inquiryId ? quoteByInquiry.get(o.inquiryId) : undefined;
    lines.push({ id: o.id, kind: "order", title: o.title, supplier, amountFils: q?.amountFils ?? null, currency: q?.currency ?? null, dueOn: q?.dueOn ?? null, status: o.status, parentContractId: o.parentContractId, href: `/studio/collab/orders/${o.id}` });
  }
  const coveredInquiries = new Set(orders.map((r) => r.o.inquiryId));
  for (const { i, q, supplier } of orphanInquiries) {
    if (coveredInquiries.has(i.id)) continue;
    lines.push({ id: i.id, kind: "inquiry", title: i.title, supplier, amountFils: q.amountFils, currency: q.currency, dueOn: q.dueOn, status: i.status, parentContractId: i.parentContractId, href: `/studio/collab/work/${i.id}` });
  }
  const parentIds = [...new Set(lines.map((l) => l.parentContractId).filter((x): x is string => Boolean(x)))];
  const parents = parentIds.length ? await db.select({ id: contracts.id, number: contracts.number, title: contracts.title, totalFils: contracts.totalFils, currency: contracts.currency, status: contracts.status }).from(contracts).where(and(inArray(contracts.id, parentIds), eq(contracts.agencyId, me.id))) : [];
  const parentById = new Map(parents.map((p) => [p.id, p]));
  const groups = new Map<string, WorksheetGroup>();
  for (const l of lines) {
    const key = l.parentContractId && parentById.has(l.parentContractId) ? l.parentContractId : "none";
    if (!groups.has(key)) groups.set(key, { parent: key === "none" ? null : parentById.get(key)!, lines: [], costs: [], unknown: 0, margin: null });
    groups.get(key)!.lines.push(l);
  }
  for (const g of groups.values()) {
    const per = new Map<string, number>();
    for (const l of g.lines) {
      // A declined, withdrawn or cancelled order costs nothing; it stays listed with its status. A draft still carries its accepted quote.
      if (["declined", "withdrawn", "cancelled"].includes(l.status)) continue;
      if (l.amountFils === null || !l.currency) g.unknown++;
      else per.set(l.currency, (per.get(l.currency) ?? 0) + l.amountFils);
    }
    g.costs = [...per.entries()].map(([currency, fils]) => ({ currency, fils }));
    if (g.parent && g.costs.length) {
      const foreign = g.costs.some((c) => c.currency !== g.parent!.currency);
      if (foreign) g.margin = "mixed_currency";
      else {
        const cost = g.costs[0].fils;
        g.margin = { fils: g.parent.totalFils - cost, percent: g.parent.totalFils ? Math.round(((g.parent.totalFils - cost) / g.parent.totalFils) * 1000) / 10 : 0 };
      }
    }
  }
  return [...groups.values()].sort((a, b) => Number(Boolean(b.parent)) - Number(Boolean(a.parent)));
}
