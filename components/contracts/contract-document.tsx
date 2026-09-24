import { getTranslations } from "next-intl/server";
import { LegalDocumentView } from "@/components/legal/legal-document-view";
import type { ContractView } from "@/lib/data/contracts";
import { contractDocument } from "@/lib/legal/document";

/**
 * The full agreement as both parties read it, print it and download it.
 * `pdfRef` is the client token or the contract id (for the agency's view).
 */
export async function ContractDocument({ v, locale, pdfRef }: { v: ContractView; locale: string; pdfRef?: string }) {
  const t = await getTranslations("Agreements");
  const added = new Set(v.changes.map((c) => c.milestoneId).filter((x): x is string => Boolean(x)));
  const doc = contractDocument({ ...v, addedMilestoneIds: added }, locale);
  const downloads = pdfRef
    ? [
        { href: `/api/legal/contract/${pdfRef}?lang=ar`, label: t("pdfAr") },
        { href: `/api/legal/contract/${pdfRef}?lang=en`, label: t("pdfEn") },
      ]
    : undefined;
  return <LegalDocumentView doc={doc} testId="contract-document" downloads={downloads} />;
}
