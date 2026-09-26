import { changesFor } from "@/components/contracts/changes-view";
import { CheckCircle2, Handshake, Printer } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientContractView } from "@/components/contracts/client-contract-view";
import { ContractDocument } from "@/components/contracts/contract-document";
import { ChangeRequests, UpdateForm } from "@/components/contracts/change-requests";
import { ContractCommitments, UpdatesList } from "@/components/contracts/commitments";
import { ContractSummary, ContractTimeline } from "@/components/contracts/contract-summary";
import { MilestoneList } from "@/components/contracts/milestone-list";
import { MilestonePartners } from "@/components/contracts/milestone-partners";
import { milestoneInfo } from "@/components/contracts/milestone-info";
import { PrintButton } from "@/components/contracts/print-button";
import { ProblemPanel } from "@/components/contracts/problem-panel";
import { ReadinessBanner } from "@/components/contracts/readiness-banner";
import { ReceiptsList } from "@/components/contracts/receipts-list";
import { ShareLink } from "@/components/contracts/share-link";
import { requireAgency } from "@/lib/auth/guards";
import { clientToken, getContractForAgency, getContractForClientAgency } from "@/lib/data/contracts";
import { sharesForContract } from "@/lib/data/milestone-shares";
import { listPartnerRequests } from "@/lib/data/partners";
import { canUse } from "@/lib/feature-gate";

export default async function StudioContract({ params, searchParams }: PageProps<"/[locale]/studio/contracts/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const sp = await searchParams;
  const t = await getTranslations("Contracts");

  const v = await getContractForAgency(agency.id, id);
  if (!v) {
    // Partner contracts: the agency buying the work sees the client's side, signed in.
    const bought = await getContractForClientAgency(agency.id, id);
    if (!bought) notFound();
    return (
      <div className="space-y-4" data-testid="buying-contract">
        <p className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm">
          <Handshake className="size-4 text-brand" /> {t("buying.intro", { agency: bought.agency.name })}
        </p>
        <ClientContractView v={bought} locale={locale} hidden={{ contractId: bought.contract.id, as: "buyer" }} pdfRef={bought.contract.id} funded={sp.funded === "1"} />
      </div>
    );
  }
  const tl = await getTranslations("Agreements");
  const c = v.contract;
  const hidden = { contractId: c.id };
  const token = clientToken(c);
  // Partners on milestones (docs/40): the agency's accepted partners and the shares on this contract.
  const partnersOn = await canUse("partners");
  const [shares, partnerRows] = partnersOn ? await Promise.all([sharesForContract(c.id), listPartnerRequests(agency.id)]) : [[], []];
  const partners = partnerRows.filter((r) => r.status === "accepted").map((r) => ({ id: r.other.id, name: r.other.name, handle: r.other.handle }));

  return (
    <div className="space-y-4">
      {sp.sent === "1" && (
        <p className="flex items-center gap-2 rounded-xl bg-brand/10 p-3 text-sm" role="status">
          <CheckCircle2 className="size-5 text-brand" /> {t("status.sent")}
        </p>
      )}
      <ContractSummary v={v} locale={locale} />
      {c.paymentMode === "protected" && <ReadinessBanner live={c.paymentsLive} compact />}
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
      {v.clientAgency ? (
        <p className="flex items-center gap-2 rounded-xl bg-muted p-3 text-sm" data-testid="partner-client">
          <Handshake className="size-4 text-brand" /> {t("builder.partnerNote", { name: v.clientAgency.name })}
        </p>
      ) : (
        ["sent", "active", "disputed"].includes(c.status) && token && <ShareLink path={`/${locale}/c/${token}`} phone={c.clientPhone} name={c.clientName} title={c.title} />
      )}
      {c.status === "disputed" && <p className="rounded-xl bg-destructive/10 p-3 text-sm">{t("dispute.active")}</p>}
      <ContractCommitments v={v} locale={locale} />
      {c.status !== "sent" && <ChangeRequests perspective="agency" hidden={hidden} changes={changesFor(v, locale)} active={c.status === "active"} />}
      <section className="space-y-2">
        <h2 className="font-semibold">{t("view.milestones")}</h2>
        <MilestoneList perspective="agency" milestones={v.milestones} mode={c.paymentMode} currency={c.currency} active={c.status === "active"} fundableId={null} hidden={hidden} info={milestoneInfo(v, locale)} />
      </section>
      {partnersOn && !v.clientAgency && ["sent", "active", "disputed"].includes(c.status) && (
        <MilestonePartners
          contractId={c.id}
          currency={c.currency}
          mode={c.paymentMode}
          active={["sent", "active"].includes(c.status)}
          partners={partners}
          milestones={v.milestones.map((m) => {
            const s = shares.find((x) => x.share.milestoneId === m.id);
            return { id: m.id, title: m.title, status: m.status, amountFils: m.amountFils, share: s ? { ...s.share, partner: s.partner } : null };
          })}
        />
      )}
      {["active", "disputed"].includes(c.status) && <UpdateForm hidden={hidden} />}
      <UpdatesList v={v} locale={locale} />
      <ProblemPanel v={v} side="agency" hidden={hidden} locale={locale} />
      <ReceiptsList v={v} locale={locale} pdfRef={c.id} />
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
