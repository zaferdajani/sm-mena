import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientContracts } from "@/components/requests/client-contracts";
import { RequestView } from "@/components/requests/request-view";
import { contractsForRequest } from "@/lib/data/contracts";
import { getRequestByToken } from "@/lib/data/requests";

export const metadata: Metadata = { robots: { index: false } };

export default async function RequestByTokenPage({ params }: PageProps<"/[locale]/r/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const data = await getRequestByToken(token);
  if (!data) {
    const t = await getTranslations("Requests");
    return <p className="px-4 py-20 text-center text-muted-foreground">{t("notFound")}</p>;
  }
  // Contracts the agency sent for this request, linked for the client.
  const contracts = (await contractsForRequest(data.request.id)).filter((c) => c.status !== "cancelled");
  const agencyName = (agencyId: string) => data.proposals.find((p) => p.agency.id === agencyId)?.agency.name ?? "";
  return (
    <>
      <div className="mx-4 mt-4 sm:mx-auto sm:max-w-2xl">
        <ClientContracts rows={contracts.map((contract) => ({ contract, agencyName: agencyName(contract.agencyId) }))} title={false} />
      </div>
      <RequestView {...data} access={{ token }} />
    </>
  );
}
