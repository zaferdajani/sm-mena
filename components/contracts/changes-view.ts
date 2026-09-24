import type { ContractView } from "@/lib/data/contracts";
import { formatFils } from "@/lib/format";

/** Change requests shaped for the client component (amounts formatted on the server). */
export const changesFor = (v: ContractView, locale: string) =>
  v.changes.map((c) => ({ id: c.id, title: c.title, reason: c.reason, amount: formatFils(c.amountFils, locale, v.contract.currency), dueDate: c.dueDate, checks: c.checks, status: c.status, decidedBy: c.decidedBy }));
