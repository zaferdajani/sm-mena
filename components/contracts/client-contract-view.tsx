import { CheckCircle2, Printer, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { changesFor } from "@/components/contracts/changes-view";
import { ChangeRequests } from "@/components/contracts/change-requests";
import { ClientSign } from "@/components/contracts/client-sign";
import { ContractCommitments, UpdatesList } from "@/components/contracts/commitments";
import { ContractDocument } from "@/components/contracts/contract-document";
import { ContractSummary, ContractTimeline } from "@/components/contracts/contract-summary";
import { MilestoneList } from "@/components/contracts/milestone-list";
import { milestoneInfo } from "@/components/contracts/milestone-info";
import { PrintButton } from "@/components/contracts/print-button";
import { ProblemPanel } from "@/components/contracts/problem-panel";
import { ReadinessBanner } from "@/components/contracts/readiness-banner";
import { ReceiptsList } from "@/components/contracts/receipts-list";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { nextFundable, type ContractView } from "@/lib/data/contracts";

/**
 * The client's side of a contract: reached through the private link (`token`),
 * or, for partner contracts, by the buying agency in its studio (`hidden` carries
 * the contract id and as=buyer, and `pdfRef` is the contract id).
 */
export async function ClientContractView({ v, locale, hidden, pdfRef, funded }: { v: ContractView; locale: string; hidden: Record<string, string>; pdfRef: string; funded?: boolean }) {
  const t = await getTranslations("Contracts");
  const c = v.contract;
  const fundable = nextFundable(v);
  return (
    <div className="space-y-4">
      {funded && (
        <p className="flex items-center gap-2 rounded-xl bg-brand/10 p-3 text-sm" role="status" data-testid="funded-ok">
          <CheckCircle2 className="size-5 text-brand" /> {t("fundPage.paid")}
        </p>
      )}
      <ContractSummary v={v} locale={locale} />
      {c.paymentMode === "protected" && <ReadinessBanner live={c.paymentsLive} compact={c.status !== "sent"} />}
      {c.status === "completed" && v.reviewToken && (
        <section className="space-y-2 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4 text-sm" data-testid="review-prompt">
          <p className="font-semibold">{t("review.title")}</p>
          <p className="text-muted-foreground">{t("review.body", { agency: v.agency.name })}</p>
          <Link href={`/review/${v.reviewToken}`} className={buttonVariants({ className: "gap-1.5" })}>
            <Star className="size-4" /> {t("review.cta", { agency: v.agency.name })}
          </Link>
        </section>
      )}
      {c.status === "sent" && (
        <>
          <p className="text-sm text-muted-foreground">{t("client.intro")}</p>
          <div className="rounded-2xl border p-4">
            <ContractDocument v={v} locale={locale} pdfRef={pdfRef} />
          </div>
          <ClientSign hidden={hidden} />
        </>
      )}
      {c.status === "disputed" && <p className="rounded-xl bg-destructive/10 p-3 text-sm">{t("dispute.active")}</p>}
      {c.status !== "sent" && (
        <>
          <ContractCommitments v={v} locale={locale} />
          <ChangeRequests perspective="client" hidden={hidden} changes={changesFor(v, locale)} active={c.status === "active"} />
          <section className="space-y-2">
            <h2 className="font-semibold">{t("view.milestones")}</h2>
            <MilestoneList perspective="client" milestones={v.milestones} mode={c.paymentMode} currency={c.currency} active={c.status === "active"} fundableId={fundable?.id ?? null} hidden={hidden} info={milestoneInfo(v, locale)} />
          </section>
          <ProblemPanel v={v} side="client" hidden={hidden} locale={locale} />
          <ReceiptsList v={v} locale={locale} pdfRef={pdfRef} />
          <UpdatesList v={v} locale={locale} />
          <details className="rounded-2xl border p-4">
            <summary className="cursor-pointer font-semibold">{t("view.readFull")}</summary>
            <div className="mt-3">
              <ContractDocument v={v} locale={locale} pdfRef={pdfRef} />
            </div>
          </details>
          <PrintButton label={t("view.print")} icon={<Printer className="size-4" />} />
          <ContractTimeline v={v} locale={locale} />
        </>
      )}
    </div>
  );
}
