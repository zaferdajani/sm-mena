import { createHash } from "node:crypto";
import { countryOf } from "@/lib/countries";
import type { Receipt } from "@/lib/contracts/receipts";
import type { Contract } from "@/lib/db/schema";
import { formatDate, formatFils } from "@/lib/format";
import type { Bi } from "./clauses";
import type { LegalDocument } from "./document-types";
import { HOLDER_LINE, paymentStateOf } from "./payment-holder";

/** A receipt as a document for the PDF renderer (no signature page). Both languages, like the contract. */

const R = {
  title: {
    deposit: { ar: "إيصال دفع مبلغ مرحلة", en: "Milestone payment receipt" },
    payout: { ar: "إيصال تحرير مبلغ للوكالة", en: "Payout receipt" },
    refund: { ar: "إيصال استرداد للعميل", en: "Refund receipt" },
  } as Record<Receipt["kind"], Bi>,
  details: { ar: "التفاصيل", en: "Details" },
  amounts: { ar: "المبالغ", en: "Amounts" },
  contract: { ar: "العقد", en: "Contract" },
  milestone: { ar: "المرحلة", en: "Milestone" },
  agency: { ar: "الوكالة", en: "Agency" },
  client: { ar: "العميل", en: "Client" },
  date: { ar: "التاريخ", en: "Date" },
  currency: { ar: "العملة", en: "Currency" },
  reference: { ar: "مرجع الدفع", en: "Payment reference" },
  gross: { ar: "المبلغ الإجمالي", en: "Gross amount" },
  paidIn: { ar: "المبلغ المدفوع", en: "Amount paid in" },
  fee: { ar: "رسوم سوّق ({fee}٪)", en: "Sawwiq fee ({fee}%)" },
  feeOnPayout: { ar: "رسوم سوّق ({fee}٪) تُخصم عند التحرير فقط", en: "Sawwiq fee ({fee}%), deducted only on payout" },
  net: { ar: "الصافي للوكالة", en: "Net to the agency" },
  netOnPayout: { ar: "الصافي للوكالة عند التحرير", en: "Net to the agency on payout" },
  refunded: { ar: "المبلغ المُعاد للعميل (دون رسوم)", en: "Refunded to the client (no fee)" },
  watermark: { ar: "وضع التجربة — لا أموال حقيقية", en: "TEST MODE — NO REAL MONEY" },
  note: {
    ar: "هذا الإيصال سجلّ لحركة المال على عقد سوّق، وليس فاتورة ضريبية. تُصدر الوكالة فاتورتها الضريبية للعميل حيث يلزم القانون.",
    en: "This receipt records a money movement on a Sawwiq contract; it is not a tax invoice. The agency issues its own tax invoice to the client where the law requires one.",
  },
  page: { ar: "صفحة", en: "Page" },
} satisfies Record<string, Bi | Record<string, Bi>>;

const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? String(v[k]) : m));

export function receiptDocument(r: Receipt, c: Contract, parties: { agency: string; client: string }, locale: string): LegalDocument {
  const l = locale === "en" ? "en" : "ar";
  const money = (f: number) => formatFils(f, l, r.currency);
  const fee = c.feePercent;
  const amounts =
    r.kind === "deposit"
      ? [`${R.paidIn[l]}: ${money(r.grossFils)}`, `${fill(R.feeOnPayout[l], { fee })}: ${money(r.feeFils)}`, `${R.netOnPayout[l]}: ${money(r.netFils)}`]
      : r.kind === "payout"
        ? [`${R.gross[l]}: ${money(r.grossFils)}`, `${fill(R.fee[l], { fee })}: ${money(r.feeFils)}`, `${R.net[l]}: ${money(r.netFils)}`]
        : [`${R.refunded[l]}: ${money(r.grossFils)}`];
  const fingerprint = createHash("sha256").update(JSON.stringify([r.number, r.kind, r.grossFils, r.feeFils, r.netFils, r.currency, r.date.toISOString(), c.termsHash])).digest("hex");
  return {
    kind: "receipt",
    locale: l,
    dir: l === "ar" ? "rtl" : "ltr",
    title: R.title[r.kind][l],
    number: r.number,
    subtitle: c.title,
    blocks: [
      {
        heading: R.details[l],
        bullets: [
          `${R.contract[l]}: ${c.number}`,
          `${R.milestone[l]}: ${r.milestoneTitle}`,
          `${R.agency[l]}: ${parties.agency}`,
          `${R.client[l]}: ${parties.client}`,
          `${R.date[l]}: ${formatDate(r.date, l)}`,
          `${R.currency[l]}: ${r.currency}`,
          ...(r.providerRef ? [`${R.reference[l]}: ${r.providerRef}`] : []),
        ],
      },
      { heading: R.amounts[l], bullets: amounts },
      { heading: "", paragraphs: [HOLDER_LINE[paymentStateOf(!r.test)][l], R.note[l]] },
    ],
    signatures: [],
    fingerprint,
    timeZone: countryOf(c.jurisdiction).timeZones[0],
    watermark: r.test ? R.watermark[l] : undefined,
    labels: { page: R.page[l], evidenceTitle: "", signedAt: "", notSigned: "", fingerprint: "", ipHash: "", evidenceNote: "" },
  };
}
