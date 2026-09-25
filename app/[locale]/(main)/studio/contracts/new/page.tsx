import { getTranslations, setRequestLocale } from "next-intl/server";
import { ContractBuilder, type BuilderInitial } from "@/components/contracts/contract-builder";
import { requireAgency } from "@/lib/auth/guards";
import { reviewDaysSetting } from "@/lib/contracts/rules";
import { contractRequestFor, partnerAsClient } from "@/lib/data/contract-requests";
import { feePercent, proposalForContract } from "@/lib/data/contracts";
import { listPackages } from "@/lib/data/packages";
import { countryName, currencyOf } from "@/lib/countries";
import { PLATFORMS, serviceLabel } from "@/lib/labels";
import { protectedPaymentsLive } from "@/lib/payments/readiness";

export default async function NewContract({ params, searchParams }: PageProps<"/[locale]/studio/contracts/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const sp = await searchParams;
  const t = await getTranslations("Contracts.builder");
  const tp = await getTranslations("Platforms");
  const lang = locale === "ar" ? "ar" : "en";

  let initial: BuilderInitial = {};
  if (typeof sp.proposal === "string") {
    const won = await proposalForContract(agency.id, sp.proposal);
    if (won) {
      initial = {
        client: { name: won.request.clientName, phone: won.request.phone },
        title: won.request.services.map((s) => serviceLabel(s, lang)).join(lang === "ar" ? "، " : ", ") + (won.request.businessName ? ` · ${won.request.businessName}` : ""),
        summary: won.request.description.slice(0, 500),
        totalJod: won.proposal.priceJod,
        requestId: won.request.id,
        proposalId: won.proposal.id,
        note: t("fromProposal"),
      };
    }
  } else if (typeof sp.package === "string") {
    const pkg = (await listPackages(agency.id)).find((p) => p.id === sp.package);
    if (pkg) {
      initial = { title: pkg.title, summary: pkg.description, items: pkg.items, totalJod: pkg.priceJod, packageId: pkg.id, months: pkg.billing === "monthly" ? 1 : Math.max(1, Math.round((pkg.deliveryDays ?? 30) / 30)), note: t("fromPackage", { name: pkg.title }) };
    }
  } else if (typeof sp.partner === "string") {
    // Partner contracts: the partner agency is the client (only accepted partners).
    const partner = await partnerAsClient(agency.id, sp.partner);
    if (partner) {
      const request = typeof sp.request === "string" ? await contractRequestFor(agency.id, sp.request) : null;
      const fromThisPartner = request && request.fromAgencyId === partner.id ? request : null;
      initial = {
        client: { name: partner.name, phone: partner.phone, email: partner.email },
        partner: { id: partner.id, name: partner.name, requestId: fromThisPartner?.id ?? null },
        ...(fromThisPartner ? { title: fromThisPartner.title, summary: fromThisPartner.brief, totalJod: fromThisPartner.budgetFils ? fromThisPartner.budgetFils / 1000 : undefined, note: t("fromRequest", { title: fromThisPartner.title }) } : {}),
      };
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <ContractBuilder
        initial={initial}
        agencyName={agency.name}
        platforms={PLATFORMS.map((p) => ({ key: p, label: tp(p) }))}
        feePercent={feePercent()}
        currency={currencyOf(agency.country)}
        countryName={countryName(agency.country, locale)}
        paymentsLive={protectedPaymentsLive()}
        reviewDays={reviewDaysSetting()}
      />
    </div>
  );
}
