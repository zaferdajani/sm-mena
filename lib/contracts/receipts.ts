import type { Contract, EscrowEntry } from "@/lib/db/schema";
import { feeOn } from "./rules";

/**
 * Receipts for protected payments (docs/14): one for each deposit, payout and
 * refund, built from the append-only ledger. A payout receipt joins the
 * payout and its fee (gross = what was released for the milestone, fee =
 * Sawwiq's share of that part, net = what the agency receives).
 */
export type ReceiptKind = "deposit" | "payout" | "refund";
export type Receipt = {
  /** The ledger entry id of the deposit, payout or refund. */
  id: number;
  kind: ReceiptKind;
  number: string;
  milestoneId: string | null;
  milestoneTitle: string;
  date: Date;
  grossFils: number;
  feeFils: number;
  netFils: number;
  currency: string;
  provider: string;
  providerRef: string | null;
  /** Made while protected payments were in test mode: no real money moved. */
  test: boolean;
};

export function receiptsOf(v: { contract: Pick<Contract, "number" | "currency" | "feePercent" | "paymentsLive">; ledger: EscrowEntry[]; milestones: { id: string; title: string }[] }): Receipt[] {
  const title = (id: string | null) => v.milestones.find((m) => m.id === id)?.title ?? "";
  const base = (e: EscrowEntry) => ({
    id: e.id,
    number: `${v.contract.number}-R${e.id}`,
    milestoneId: e.milestoneId,
    milestoneTitle: title(e.milestoneId),
    date: e.createdAt,
    currency: v.contract.currency,
    provider: e.provider,
    providerRef: e.providerRef,
    test: !v.contract.paymentsLive || e.provider === "mock",
  });
  const out: Receipt[] = [];
  for (const e of v.ledger) {
    if (e.status !== "succeeded") continue;
    if (e.type === "deposit") {
      const fee = feeOn(e.amountFils, v.contract.feePercent);
      out.push({ ...base(e), kind: "deposit", grossFils: e.amountFils, feeFils: fee, netFils: e.amountFils - fee });
    } else if (e.type === "release") {
      const fee = v.ledger.find((f) => f.type === "fee" && f.milestoneId === e.milestoneId && f.status === "succeeded")?.amountFils ?? 0;
      out.push({ ...base(e), kind: "payout", grossFils: e.amountFils + fee, feeFils: fee, netFils: e.amountFils });
    } else if (e.type === "refund") {
      out.push({ ...base(e), kind: "refund", grossFils: e.amountFils, feeFils: 0, netFils: 0 });
    }
  }
  return out;
}
