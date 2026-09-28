import { getTranslations, setRequestLocale } from "next-intl/server";
import { ComingSoon } from "@/components/features/coming-soon";
import { CollabHeader, CollabTabs } from "@/components/collab/collab-tabs";
import { collabOptions } from "@/components/collab/options";
import { NewOrderForm } from "@/components/collab/order-widgets";
import { Link } from "@/i18n/navigation";
import { inquiryForBuyer } from "@/lib/data/collab-inquiries";
import { listAgencyContracts } from "@/lib/data/contracts";
import { linkableContractsFor, workBadgeCount } from "@/lib/data/work-orders";
import { deliveryPage } from "../../gate";

/**
 * Studio → Collaborate → new work order (docs/49 §2). Always starts from an
 * accepted inquiry: the supplier, title, scope and dates are prefilled from
 * the accepted quote; the buyer picks the mode and may attach a contract.
 */
export default async function NewOrderPage({ params, searchParams }: PageProps<"/[locale]/studio/collab/orders/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency, soonFeature } = await deliveryPage();
  if (soonFeature) return <ComingSoon feature={soonFeature} />;
  const sp = await searchParams;
  const inquiryId = typeof sp.inquiry === "string" ? sp.inquiry : "";
  const inquiry = inquiryId ? await inquiryForBuyer(agency.id, inquiryId) : null;
  const quote = inquiry?.status === "converted" ? inquiry.quotes.find((q) => q.id === inquiry.acceptedQuoteId) : null;
  const t = await getTranslations("Orders");
  if (!inquiry || !quote) {
    return (
      <div className="mx-auto grid max-w-3xl gap-5" data-testid="order-new-missing">
        <CollabTabs active="work" badges={{ work: await workBadgeCount(agency.id) }} />
        <CollabHeader title={t("new.heading")} intro={t("new.needsInquiry")} />
        <Link href="/studio/collab/work" className="text-sm font-medium text-brand">{t("new.backToWork")}</Link>
      </div>
    );
  }
  const [contracts, mine, opts, badge] = await Promise.all([linkableContractsFor(quote.supplierAgencyId, agency.id), listAgencyContracts(agency.id), collabOptions(locale, agency.country), workBadgeCount(agency.id)]);
  const tm = await getTranslations("Contracts.ms");
  return (
    <div className="mx-auto grid max-w-3xl gap-5" data-testid="order-new">
      <CollabTabs active="work" badges={{ work: badge }} />
      <CollabHeader title={t("new.heading")} intro={t("new.intro")} />
      <NewOrderForm
        supplier={{ id: quote.supplier.id, name: quote.supplier.name }}
        platforms={opts.platforms}
        inquiryId={inquiry.id}
        contracts={contracts.map((c) => ({ key: c.id, label: `${c.number} · ${c.title}`, milestones: c.milestones.map((m) => ({ key: m.id, label: `${m.title} · ${tm(`status.${m.status}` as "status.pending")}` })) }))}
        parentContracts={mine.filter((c) => ["sent", "active"].includes(c.status)).map((c) => ({ key: c.id, label: `${c.number} · ${c.title}` }))}
        defaults={{ title: inquiry.title, scope: [inquiry.scope, quote.scopeNote && !inquiry.scope.includes(quote.scopeNote) ? `${t("new.quoteNote")}: ${quote.scopeNote}` : ""].filter(Boolean).join("\n\n"), deliverables: inquiry.deliverables, dueOn: quote.dueOn ?? inquiry.dueOn ?? null }}
      />
    </div>
  );
}
