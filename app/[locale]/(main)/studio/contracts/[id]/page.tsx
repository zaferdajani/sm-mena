import { CheckCircle2, Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContractDocument } from "@/components/contracts/contract-document";
import { ContractSummary, ContractTimeline } from "@/components/contracts/contract-summary";
import { MilestoneList } from "@/components/contracts/milestone-list";
import { PrintButton } from "@/components/contracts/print-button";
import { ProblemForms } from "@/components/contracts/problem-forms";
import { ShareLink } from "@/components/contracts/share-link";
import { requireAgency } from "@/lib/auth/guards";
import { clientToken, getContractForAgency } from "@/lib/data/contracts";

export default async function StudioContract({ params, searchParams }: PageProps<"/[locale]/studio/contracts/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const v = await getContractForAgency(agency.id, id);
  if (!v) notFound();
  const sp = await searchParams;
  const t = await getTranslations("Contracts");
  const c = v.contract;
  const hidden = { contractId: c.id };

  return (
    <div className="space-y-4">
      {sp.sent === "1" && (
        <p className="flex items-center gap-2 rounded-xl bg-brand/10 p-3 text-sm" role="status">
          <CheckCircle2 className="size-5 text-brand" /> {t("status.sent")}
        </p>
      )}
      <ContractSummary v={v} locale={locale} />
      {["sent", "active", "disputed"].includes(c.status) && <ShareLink path={`/${locale}/c/${clientToken(c)}`} phone={c.clientPhone} name={c.clientName} title={c.title} />}
      {c.status === "disputed" && <p className="rounded-xl bg-destructive/10 p-3 text-sm">{t("dispute.active")}</p>}
      <section className="space-y-2">
        <h2 className="font-semibold">{t("view.milestones")}</h2>
        <MilestoneList perspective="agency" milestones={v.milestones} mode={c.paymentMode} active={c.status === "active"} fundableId={null} hidden={hidden} />
      </section>
      <ProblemForms perspective="agency" hidden={hidden} canCancel={["sent", "active"].includes(c.status) && v.money.held === 0} canDispute={c.status === "active"} />
      <details className="rounded-2xl border p-4">
        <summary className="cursor-pointer font-semibold">{t("view.readFull")}</summary>
        <div className="mt-3">
          <ContractDocument v={v} locale={locale} />
        </div>
      </details>
      <PrintButton label={t("view.print")} icon={<Printer className="size-4" />} />
      <ContractTimeline v={v} locale={locale} />
    </div>
  );
}
