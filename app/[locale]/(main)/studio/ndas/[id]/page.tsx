import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cancelNdaAction } from "@/app/[locale]/(main)/nda-actions";
import { ShareLink } from "@/components/contracts/share-link";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { SubmitButton } from "@/components/submit-button";
import { requireAgency } from "@/lib/auth/guards";
import { getNdaForAgency, ndaClientToken } from "@/lib/data/ndas";
import { ndaDocument } from "@/lib/legal/document";

export default async function StudioNda({ params, searchParams }: PageProps<"/[locale]/studio/ndas/[id]">) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const v = await getNdaForAgency(agency.id, id);
  if (!v) notFound();
  const sp = await searchParams;
  const t = await getTranslations("Agreements");
  const n = v.nda;
  const token = ndaClientToken(n);
  return (
    <div className="space-y-4">
      {sp.sent === "1" && (
        <p className="flex items-center gap-2 rounded-xl bg-brand/10 p-3 text-sm" role="status">
          <CheckCircle2 className="size-5 text-brand" /> {t("ndaStudio.sent")}
        </p>
      )}
      <p className="text-sm" data-testid="nda-status">
        {t("ndaStudio.statusLabel")}: <b>{t(`ndaStudio.status.${n.status as "sent"}`)}</b>
      </p>
      {n.status === "sent" && token && <ShareLink path={`/${locale}/n/${token}`} phone={n.clientPhone} name={n.clientName} title={t("ndaStudio.shareTitle")} />}
      {n.clientNote && (
        <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30" data-testid="nda-client-note">
          <p className="font-semibold">{n.status === "declined" ? t("ndaStudio.declined") : t("amendReceived")}</p>
          <p dir="auto">{n.clientNote}</p>
          {n.status === "sent" && <p className="text-xs text-muted-foreground">{t("ndaStudio.amendHowTo")}</p>}
        </div>
      )}
      <div className="rounded-2xl border p-4">
        <LegalDocumentView
          doc={ndaDocument(n, v.agency, locale)}
          testId="nda-document"
          downloads={[
            { href: `/api/legal/nda/${n.id}?lang=ar`, label: t("pdfAr") },
            { href: `/api/legal/nda/${n.id}?lang=en`, label: t("pdfEn") },
          ]}
        />
      </div>
      {n.status === "sent" && (
        <form action={cancelNdaAction}>
          <input type="hidden" name="ndaId" value={n.id} />
          <SubmitButton variant="outline">{t("ndaStudio.cancel")}</SubmitButton>
        </form>
      )}
    </div>
  );
}
