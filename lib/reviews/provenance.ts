/**
 * Where a review comes from, for the label next to it (docs/14, docs/20):
 *  - completed_project: the client of a completed Sawwiq contract with live
 *    protected payments, after money was paid out ("Completed project (via Sawwiq)");
 *  - contact_confirmed: a visitor who contacted the agency through Sawwiq days
 *    earlier ("Contact confirmed");
 *  - invited: a private link the agency sent a client ("Invited by the agency").
 * Pure, so server and client components can both use it.
 */
export type ReviewProvenance = "completed_project" | "contact_confirmed" | "invited";

export function reviewProvenance(r: { source: string; contractId?: string | null }): ReviewProvenance {
  if (r.source === "contract" && r.contractId) return "completed_project";
  if (r.source === "inquiry") return "contact_confirmed";
  return "invited";
}
