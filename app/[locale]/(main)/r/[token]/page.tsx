import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RequestView } from "@/components/requests/request-view";
import { FileSignature } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { clientToken, contractsForRequest } from "@/lib/data/contracts";
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
  const contracts = await contractsForRequest(data.request.id);
  const tc = await getTranslations("Contracts");
  return (
    <>
      {contracts
        .filter((c) => c.status !== "cancelled")
        .map((c) => (
          <Link key={c.id} href={`/c/${clientToken(c)}`} className="mx-4 mt-4 flex items-center gap-2 rounded-2xl border-2 border-brand/40 bg-brand/5 p-4 text-sm font-medium sm:mx-auto sm:max-w-2xl" data-testid="request-contract">
            <FileSignature className="size-5 text-brand" /> {tc("requestContract", { agency: data.proposals.find((p) => p.agency.id === c.agencyId)?.agency.name ?? "" })}
          </Link>
        ))}
      <RequestView {...data} access={{ token }} />
    </>
  );
}
