import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { NdaSign } from "@/components/ndas/nda-sign";
import { Link } from "@/i18n/navigation";
import { getNdaByToken } from "@/lib/data/ndas";
import { ndaDocument } from "@/lib/legal/document";

export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

// The client's side of an NDA, reached through the private link the agency shared.
export default async function ClientNda({ params }: PageProps<"/[locale]/n/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const v = await getNdaByToken(token);
  if (!v) notFound();
  const t = await getTranslations("Agreements");
  const n = v.nda;
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <p className="text-sm text-muted-foreground">
        {t("ndaClient.from")}{" "}
        <Link href={`/a/${v.agency.handle}`} className="font-medium text-brand hover:underline">
          {v.agency.name}
        </Link>
      </p>
      {n.status === "signed" && (
        <p className="flex items-center gap-2 rounded-xl bg-brand/10 p-3 text-sm" role="status" data-testid="nda-signed">
          <CheckCircle2 className="size-5 text-brand" /> {t("ndaClient.signed")}
        </p>
      )}
      {(n.status === "declined" || n.status === "cancelled") && <p className="rounded-xl bg-muted p-3 text-sm">{t(`ndaStudio.status.${n.status}`)}</p>}
      {n.status === "sent" && <p className="text-sm text-muted-foreground">{t("ndaClient.intro")}</p>}
      <div className="rounded-2xl border p-4">
        <LegalDocumentView
          doc={ndaDocument(n, v.agency, locale)}
          testId="nda-document"
          downloads={[
            { href: `/api/legal/nda/${token}?lang=ar`, label: t("pdfAr") },
            { href: `/api/legal/nda/${token}?lang=en`, label: t("pdfEn") },
          ]}
        />
      </div>
      {n.status === "sent" && <NdaSign token={token} />}
    </div>
  );
}
