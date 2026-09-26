import { FileSignature, HandCoins, Handshake, Plus, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { answerContractRequestAction } from "@/app/[locale]/(main)/contract-actions";
import { CONTRACT_STATUS_STYLE } from "@/components/contracts/contract-summary";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { listContractRequests } from "@/lib/data/contract-requests";
import { listAgencyContracts, listBuyingContracts } from "@/lib/data/contracts";
import { sharesForPartner } from "@/lib/data/milestone-shares";
import { PartnerWorkList } from "@/components/contracts/partner-work-list";
import { formatDate, formatFils } from "@/lib/format";
import { currencyOf } from "@/lib/countries";
import type { Contract } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export default async function StudioContracts({ params }: PageProps<"/[locale]/studio/contracts">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Contracts");
  const [rows, buying, requests, partnerWork] = await Promise.all([listAgencyContracts(agency.id), listBuyingContracts(agency.id), listContractRequests(agency.id), sharesForPartner(agency.id)]);
  const incoming = requests.incoming.filter((r) => r.status === "pending");
  const outgoing = requests.outgoing.filter((r) => r.status === "pending");

  const row = (c: Contract, sub: string, testId?: string) => {
    const Mode = c.paymentMode === "protected" ? ShieldCheck : HandCoins;
    return (
      <li key={c.id}>
        <Link href={`/studio/contracts/${c.id}`} className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-muted/50" data-testid={testId}>
          <Mode className={cn("size-5 shrink-0", c.paymentMode === "protected" ? "text-brand" : "text-muted-foreground")} aria-label={t(`mode.${c.paymentMode}`)} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium" dir="auto">{c.title}</span>
            <span className="block text-xs text-muted-foreground" dir="auto">
              {sub} · {formatDate(c.createdAt, locale)}
            </span>
          </span>
          <span className="text-end">
            <span className="block text-sm font-semibold tabular-nums">{formatFils(c.totalFils, locale, c.currency)}</span>
            <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px]", CONTRACT_STATUS_STYLE[c.status])}>{t(`status.${c.status}`)}</span>
          </span>
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <PartnerWorkList rows={partnerWork} locale={locale} />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("listTitle")}</h2>
          <Link href="/studio/contracts/new" className={buttonVariants({ className: "gap-1.5" })} data-testid="new-contract">
            <Plus className="size-4" /> {t("new")}
          </Link>
        </div>

        {incoming.length > 0 && (
          <section className="space-y-2" data-testid="contract-requests">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Handshake className="size-4 text-brand" /> {t("requests.title")}
            </h3>
            {incoming.map((r) => (
              <div key={r.id} className="space-y-2 rounded-2xl border-2 border-brand/30 p-3 text-sm" data-testid="contract-request">
                <p className="font-medium" dir="auto">{t("requests.from", { name: r.other.name, title: r.title })}</p>
                {r.brief && <p className="whitespace-pre-line text-muted-foreground" dir="auto">{r.brief}</p>}
                {r.budgetFils ? <p className="text-xs">{t("requests.budget", { amount: formatFils(r.budgetFils, locale, currencyOf(agency.country)) })}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/studio/contracts/new?partner=${r.fromAgencyId}&request=${r.id}`} className={buttonVariants({ size: "sm" })} data-testid="create-from-request">
                    {t("requests.create")}
                  </Link>
                  <form action={answerContractRequestAction}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="answer" value="declined" />
                    <SubmitButton variant="outline" className="h-8">{t("requests.decline")}</SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </section>
        )}

        {!rows.length && (
          <div className="space-y-2 rounded-2xl border border-dashed p-8 text-center">
            <FileSignature className="mx-auto size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        )}
        <ul className="space-y-2" data-testid="contract-list">
          {rows.map((c) => row(c, c.clientName))}
        </ul>
      </div>

      {(buying.length > 0 || outgoing.length > 0) && (
        <section className="space-y-2" data-testid="buying-list">
          <h2 className="text-lg font-semibold">{t("buying.title")}</h2>
          {outgoing.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed p-3 text-sm" data-testid="contract-request-outgoing">
              <span dir="auto">
                {r.title} · <span className="text-muted-foreground">{t("requests.waiting", { name: r.other.name })}</span>
              </span>
              <form action={answerContractRequestAction}>
                <input type="hidden" name="requestId" value={r.id} />
                <input type="hidden" name="answer" value="cancelled" />
                <SubmitButton variant="ghost" className="h-8">{t("requests.cancel")}</SubmitButton>
              </form>
            </div>
          ))}
          <ul className="space-y-2">{buying.map((b) => row(b.contract, t("buying.from", { agency: b.supplier }), "buying-contract-row"))}</ul>
        </section>
      )}
    </div>
  );
}
