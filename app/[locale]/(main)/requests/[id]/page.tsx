import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientContracts } from "@/components/requests/client-contracts";
import { RequestView } from "@/components/requests/request-view";
import { contractsForRequest } from "@/lib/data/contracts";
import { getRequestForVisitor } from "@/lib/data/requests";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { robots: { index: false } };

export default async function MyRequestPage({ params }: PageProps<"/[locale]/requests/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const data = await getRequestForVisitor(id, await getVisitorId());
  if (!data) {
    const t = await getTranslations("Requests");
    return <p className="px-4 py-20 text-center text-muted-foreground">{t("notFound")}</p>;
  }
  // The contract an agency sent from an accepted quote, with its signing link (it used to be only on the private /r/ page).
  const contracts = (await contractsForRequest(id)).filter((c) => c.status !== "cancelled");
  const agencyName = (agencyId: string) => data.proposals.find((p) => p.agency.id === agencyId)?.agency.name ?? "";
  return (
    <>
      <div className="mx-4 mt-4 sm:mx-auto sm:max-w-2xl">
        <ClientContracts rows={contracts.map((contract) => ({ contract, agencyName: agencyName(contract.agencyId) }))} title={false} />
      </div>
      <RequestView {...data} access={{ requestId: id }} />
    </>
  );
}
