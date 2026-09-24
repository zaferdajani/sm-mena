import { CheckCircle2, Printer } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientSign } from "@/components/contracts/client-sign";
import { ContractDocument } from "@/components/contracts/contract-document";
import { ContractSummary, ContractTimeline } from "@/components/contracts/contract-summary";
import { MilestoneList } from "@/components/contracts/milestone-list";
import { PrintButton } from "@/components/contracts/print-button";
import { ProblemForms } from "@/components/contracts/problem-forms";
import { Link } from "@/i18n/navigation";
import { getContractByToken, nextFundable } from "@/lib/data/contracts";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

// The client's side of a contract, reached through the private link the agency shared.
export default async function ClientContract({ params, searchParams }: PageProps<"/[locale]/c/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const v = await getContractByToken(token);
  if (!v) notFound();
  const sp = await searchParams;
  const t = await getTranslations("Contracts");
  const c = v.contract;
  const hidden = { token };
  const fundable = nextFundable(v);

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <p className="text-sm text-muted-foreground">
        {t("client.title", { agency: "" })}
        <Link href={`/a/${v.agency.handle}`} className="font-medium text-brand hover:underline">
          {v.agency.name}
        </Link>
      </p>
      {sp.funded === "1" && (
        <p className="flex items-center gap-2 rounded-xl bg-brand/10 p-3 text-sm" role="status" data-testid="funded-ok">
          <CheckCircle2 className="size-5 text-brand" /> {t("fundPage.paid")}
        </p>
      )}
      <ContractSummary v={v} locale={locale} />
      {c.status === "sent" && (
        <>
          <p className="text-sm text-muted-foreground">{t("client.intro")}</p>
          <div className="rounded-2xl border p-4">
            <ContractDocument v={v} locale={locale} />
          </div>
          <ClientSign token={token} />
        </>
      )}
      {c.status === "disputed" && <p className="rounded-xl bg-destructive/10 p-3 text-sm">{t("dispute.active")}</p>}
      {c.status !== "sent" && (
        <>
          <section className="space-y-2">
            <h2 className="font-semibold">{t("view.milestones")}</h2>
            <MilestoneList perspective="client" milestones={v.milestones} mode={c.paymentMode} active={c.status === "active"} fundableId={fundable?.id ?? null} hidden={hidden} />
          </section>
          <ProblemForms perspective="client" hidden={hidden} canCancel={false} canDispute={c.status === "active"} />
          <details className="rounded-2xl border p-4">
            <summary className="cursor-pointer font-semibold">{t("view.readFull")}</summary>
            <div className="mt-3">
              <ContractDocument v={v} locale={locale} />
            </div>
          </details>
          <PrintButton label={t("view.print")} icon={<Printer className="size-4" />} />
          <ContractTimeline v={v} locale={locale} />
        </>
      )}
    </div>
  );
}
