import { changesFor } from "@/components/contracts/changes-view";
import { CheckCircle2, Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContractDocument } from "@/components/contracts/contract-document";
import { ChangeRequests, UpdateForm } from "@/components/contracts/change-requests";
import { ContractCommitments, UpdatesList } from "@/components/contracts/commitments";
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
  const tl = await getTranslations("Agreements");
  const c = v.contract;
  const hidden = { contractId: c.id };
  const token = clientToken(c);

  return (
    <div className="space-y-4">
      {sp.sent === "1" && (
        <p className="flex items-center gap-2 rounded-xl bg-brand/10 p-3 text-sm" role="status">
          <CheckCircle2 className="size-5 text-brand" /> {t("status.sent")}
        </p>
      )}
      <ContractSummary v={v} locale={locale} />
      {c.status === "sent" &&
        v.events
          .filter((e) => e.type === "amend_requested")
          .map((e) => (
            <div key={e.id} className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30" data-testid="amend-notice">
              <p className="font-semibold">{tl("amendReceived")}</p>
              <p dir="auto">{e.note}</p>
              <p className="text-xs text-muted-foreground">{tl("amendHowTo")}</p>
            </div>
          ))}
      {["sent", "active", "disputed"].includes(c.status) && token && <ShareLink path={`/${locale}/c/${token}`} phone={c.clientPhone} name={c.clientName} title={c.title} />}
      {c.status === "disputed" && <p className="rounded-xl bg-destructive/10 p-3 text-sm">{t("dispute.active")}</p>}
      <ContractCommitments v={v} locale={locale} />
      {c.status !== "sent" && <ChangeRequests perspective="agency" hidden={hidden} changes={changesFor(v, locale)} active={c.status === "active"} />}
      <section className="space-y-2">
        <h2 className="font-semibold">{t("view.milestones")}</h2>
        <MilestoneList perspective="agency" milestones={v.milestones} mode={c.paymentMode} currency={c.currency} active={c.status === "active"} fundableId={null} hidden={hidden} />
      </section>
      {["active", "disputed"].includes(c.status) && <UpdateForm hidden={hidden} />}
      <UpdatesList v={v} locale={locale} />
      <ProblemForms perspective="agency" hidden={hidden} canCancel={["sent", "active"].includes(c.status) && v.money.held === 0} canDispute={c.status === "active"} />
      <details className="rounded-2xl border p-4">
        <summary className="cursor-pointer font-semibold">{t("view.readFull")}</summary>
        <div className="mt-3">
          <ContractDocument v={v} locale={locale} pdfRef={c.id} />
        </div>
      </details>
      <PrintButton label={t("view.print")} icon={<Printer className="size-4" />} />
      <ContractTimeline v={v} locale={locale} />
    </div>
  );
}
