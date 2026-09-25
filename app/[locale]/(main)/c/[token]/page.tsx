import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClientContractView } from "@/components/contracts/client-contract-view";
import { Link } from "@/i18n/navigation";
import { clientLinkForDevice, getContractByToken } from "@/lib/data/contracts";
import { getVisitorId } from "@/lib/visitor";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

// The client's side of a contract, reached through the private link the agency shared.
// Notification links use /c/<contract id>: they open the private link only on
// the device that signed the contract (its visitor cookie).
export default async function ClientContract({ params, searchParams }: PageProps<"/[locale]/c/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(token)) {
    const link = await clientLinkForDevice(token, await getVisitorId());
    if (!link) notFound();
    redirect(`/${locale}/c/${link}`);
  }
  const v = await getContractByToken(token);
  if (!v) notFound();
  const sp = await searchParams;
  const t = await getTranslations("Contracts");

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <p className="text-sm text-muted-foreground">
        {t("client.title", { agency: "" })}
        <Link href={`/a/${v.agency.handle}`} className="font-medium text-brand hover:underline">
          {v.agency.name}
        </Link>
      </p>
      <ClientContractView v={v} locale={locale} hidden={{ token }} pdfRef={token} funded={sp.funded === "1"} />
    </div>
  );
}
