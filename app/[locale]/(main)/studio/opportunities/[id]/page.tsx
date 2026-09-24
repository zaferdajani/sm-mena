import { FileSignature, MessagesSquare, Phone } from "lucide-react";
import { currencyOf } from "@/lib/countries";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ProposalForm } from "@/components/studio/proposal-form";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { cheapestPackages } from "@/lib/data/packages";
import { getOpportunity, markOpportunityViewed } from "@/lib/data/requests";
import { openClientChatAction } from "@/app/[locale]/(main)/chat-actions";
import { formatJod } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";
import { whatsappLink } from "@/lib/text";

export default async function OpportunityPage({ params }: PageProps<"/[locale]/studio/opportunities/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const o = await getOpportunity(agency, id);
  if (!o) notFound();
  if (o.isNew) await markOpportunityViewed(agency.id, o.request.id);
  const tchat = await getTranslations("Chat");
  const t = await getTranslations("Opportunities");
  const tc = await getTranslations("Contracts");
  const tr = await getTranslations("Requests");
  const tCity = await getTranslations("Cities");
  const tpk = await getTranslations("Packages");
  const lang = await getLocale();
  const pkg = (await cheapestPackages([agency.id], o.request.services[0])).get(agency.id);
  const r = o.request;
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="space-y-2 rounded-xl bg-muted p-4 text-sm">
        <p className="font-semibold">{r.services.map((s) => serviceLabel(s, lang)).join(" · ")}</p>
        <p className="text-xs text-muted-foreground">
          {r.city ? tCity(r.city) : "—"} · {t("budget")}: {r.budgetMaxJod ? `${formatJod(r.budgetMinJod ?? 0, lang, currencyOf(r.country))} – ${formatJod(r.budgetMaxJod, lang, currencyOf(r.country))}` : t("any")}
          {r.timeline ? ` · ${tr(`timelines.${r.timeline}` as "timelines.asap")}` : ""}
        </p>
        {(r.fullService || r.brands) && (
          <p className="flex flex-wrap gap-1.5 text-xs">
            {r.fullService && <span className="rounded-full bg-brand/10 px-2 py-0.5 font-medium text-brand">{tr("fullService")}</span>}
            {r.brands && <span className="rounded-full bg-background px-2 py-0.5" dir="auto">{tr("brands")}: {r.brands}</span>}
          </p>
        )}
        <p className="whitespace-pre-line" dir="auto">{r.description}</p>
        <div className="border-t pt-2">
          <p className="text-xs font-medium">{t("client")}</p>
          {o.myProposal ? (
            <p className="flex flex-wrap items-center gap-2">
              {r.clientName}{r.businessName ? ` · ${r.businessName}` : ""} ·{" "}
              <a href={whatsappLink(r.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand" dir="ltr" data-testid="client-phone">
                <Phone className="size-3.5" /> {r.phone}
              </a>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("clientHidden")}</p>
          )}
        </div>
      </div>
      {o.myProposal ? (
        <div className="rounded-xl border p-4 text-sm" data-testid="my-proposal">
          <p className="font-semibold">{t("yourProposal")}: {formatJod(o.myProposal.priceJod, lang, currencyOf(agency.country))} {o.myProposal.billing === "monthly" ? tpk("perMonth") : tpk("oneOff")}</p>
          <p className="text-muted-foreground">{t("status")}: {tr(`proposalStatus.${o.myProposal.status}`)}</p>
          <p className="mt-2 whitespace-pre-line" dir="auto">{o.myProposal.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={openClientChatAction.bind(null, r.id)}>
              <button type="submit" className={buttonVariants({ variant: "outline", className: "gap-1.5" })} data-testid="message-client">
                <MessagesSquare className="size-4" /> {tchat("messageClient")}
              </button>
            </form>
            {o.myProposal.status === "accepted" && (
              <Link href={{ pathname: "/studio/contracts/new", query: { proposal: o.myProposal.id } }} className={buttonVariants({ className: "gap-1.5" })} data-testid="create-contract">
                <FileSignature className="size-4" /> {tc("fromProposal")}
              </Link>
            )}
          </div>
        </div>
      ) : r.status === "open" ? (
        <ProposalForm requestId={r.id} suggestedPrice={pkg?.priceJod ?? agency.startingPriceJod} />
      ) : (
        <p className="text-sm text-muted-foreground">{t("form.errors.closed")}</p>
      )}
    </div>
  );
}
