import { Receipt as ReceiptIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { receiptsOf } from "@/lib/contracts/receipts";
import type { ContractView } from "@/lib/data/contracts";
import { formatDate, formatFils } from "@/lib/format";

/**
 * Receipts for every deposit, payout and refund on the contract, each with a
 * PDF in Arabic and English. `pdfRef` is the client's token or the contract id.
 */
export async function ReceiptsList({ v, locale, pdfRef }: { v: ContractView; locale: string; pdfRef: string }) {
  if (v.contract.paymentMode !== "protected") return null;
  const t = await getTranslations("Contracts.receipts");
  const receipts = receiptsOf(v);
  if (!receipts.length) return null;
  const money = (f: number) => formatFils(f, locale, v.contract.currency);
  return (
    <section className="space-y-2" data-testid="receipts">
      <h2 className="flex items-center gap-2 font-semibold">
        <ReceiptIcon className="size-4 text-brand" /> {t("title")}
      </h2>
      <ul className="divide-y rounded-2xl border text-sm">
        {receipts.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3" data-testid="receipt" data-kind={r.kind}>
            <span className="min-w-0 flex-1 basis-full sm:basis-0">
              <span className="block font-medium">
                {t(`kind.${r.kind}`)} · <span dir="auto">{r.milestoneTitle}</span>
                {r.test && <span className="ms-2 rounded bg-amber-500/15 px-1.5 text-[11px] text-amber-700 dark:text-amber-400">{t("test")}</span>}
              </span>
              <span className="block text-xs text-muted-foreground">
                <span dir="ltr">{r.number}</span> · {formatDate(r.date, locale)} ·{" "}
                {r.kind === "refund" ? t("refunded", { amount: money(r.grossFils) }) : t("amounts", { gross: money(r.grossFils), fee: money(r.feeFils), net: money(r.netFils) })}
              </span>
            </span>
            <span className="flex gap-2 text-xs">
              <a href={`/api/receipts/${pdfRef}/${r.id}?lang=ar`} className="rounded-md border px-2 py-1 hover:bg-muted" data-testid="receipt-pdf">{t("pdfAr")}</a>
              <a href={`/api/receipts/${pdfRef}/${r.id}?lang=en`} className="rounded-md border px-2 py-1 hover:bg-muted">{t("pdfEn")}</a>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
