import { CheckCircle2, Circle, Handshake } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { partnerTickAction, sharePaidAction } from "@/app/[locale]/(main)/share-actions";
import { PartnerSubmit } from "@/components/contracts/partner-submit";
import { SubmitButton } from "@/components/submit-button";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { partnerWork } from "@/lib/data/milestone-shares";
import { formatFils } from "@/lib/format";

/**
 * A milestone this provider delivers for a partner agency (docs/40): its
 * checklist, handing it to the client, and the share paid out. The client's
 * details and the rest of the contract stay with the agency.
 */
export default async function PartnerWorkPage({ params }: PageProps<"/[locale]/studio/partner-work/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const work = await partnerWork(agency.id, id);
  if (!work) notFound();
  const t = await getTranslations("Shares");
  const tm = await getTranslations("Contracts.ms");
  const { share, milestone, contract, checks, paid } = work;
  const money = (f: number) => formatFils(f, locale, contract.currency);
  const ready = contract.paymentMode === "protected" ? ["funded", "changes_requested"] : ["pending", "changes_requested"];
  const editable = contract.status === "active" && ready.includes(milestone.status);
  const payout = paid.find((p) => p.type === "release");
  const settled = ["approved", "released", "split"].includes(milestone.status);

  return (
    <div className="space-y-4" data-testid="partner-work-page">
      <Link href="/studio/contracts#partner-work" className="text-sm text-brand">
        ← {t("work.back")}
      </Link>
      <header className="space-y-1">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Handshake className="size-4 text-brand" /> {t("work.for", { agency: work.agency.name, number: contract.number })}
        </p>
        <h1 className="text-xl font-bold" dir="auto">{milestone.title}</h1>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]" data-testid="partner-milestone-status">{tm(`status.${milestone.status}` as "status.pending")}</span>
          <span className="font-semibold">{t("yourShare", { amount: money(share.amountFils) })}</span>
        </p>
        {share.note && <p className="text-sm text-muted-foreground" dir="auto">{share.note}</p>}
      </header>

      {contract.paymentMode === "protected" && milestone.status === "pending" && <p className="rounded-xl bg-muted p-3 text-sm">{t("work.waitingFunds")}</p>}

      <section className="space-y-2 rounded-2xl border p-4">
        <h2 className="font-semibold">{t("work.checklist")}</h2>
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.id}>
              <form action={partnerTickAction} className="flex items-center gap-2 text-sm">
                <input type="hidden" name="shareId" value={share.id} />
                <input type="hidden" name="checkId" value={c.id} />
                <input type="hidden" name="value" value={c.doneByAgency ? "0" : "1"} />
                <button type="submit" disabled={!editable} className="flex items-center gap-2 text-start disabled:opacity-70" data-testid="partner-check">
                  {c.doneByAgency ? <CheckCircle2 className="size-5 shrink-0 text-brand" /> : <Circle className="size-5 shrink-0 text-muted-foreground" />}
                  <span dir="auto">{c.text}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {editable && <PartnerSubmit shareId={share.id} />}

      {settled && contract.paymentMode === "protected" && payout && (
        <p className="rounded-xl bg-brand/10 p-3 text-sm font-medium text-brand" data-testid="partner-paid">
          {payout.status === "succeeded" ? t("work.paid", { amount: money(payout.amountFils) }) : t("work.pending", { amount: money(payout.amountFils) })}
        </p>
      )}
      {settled && contract.paymentMode === "direct" && (
        <div className="space-y-2 rounded-xl bg-muted p-3 text-sm">
          <p>{t("work.directDue", { amount: money(share.amountFils) })}</p>
          {share.paidByAgencyAt && <p>{t("work.directPaidByAgency")}</p>}
          {share.receivedByPartnerAt ? (
            <p className="font-medium text-brand">{t("work.received")}</p>
          ) : (
            <form action={sharePaidAction}>
              <input type="hidden" name="shareId" value={share.id} />
              <input type="hidden" name="as" value="partner" />
              <SubmitButton variant="outline" className="h-8">{t("work.confirmReceived", { amount: money(share.amountFils) })}</SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
