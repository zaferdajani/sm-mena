import { Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { answerShareAction } from "@/app/[locale]/(main)/share-actions";
import { SubmitButton } from "@/components/submit-button";
import { Link } from "@/i18n/navigation";
import type { sharesForPartner } from "@/lib/data/milestone-shares";
import { formatFils } from "@/lib/format";

type Rows = Awaited<ReturnType<typeof sharesForPartner>>;

/** Studio → Contracts: milestones this provider delivers for partner agencies (docs/40). */
export async function PartnerWorkList({ rows, locale }: { rows: Rows; locale: string }) {
  const t = await getTranslations("Shares");
  const tm = await getTranslations("Contracts.ms");
  if (!rows.length) return null;
  return (
    <section className="space-y-2" id="partner-work" data-testid="partner-work">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Handshake className="size-5 text-brand" /> {t("workTitle")}
      </h2>
      <p className="text-sm text-muted-foreground">{t("workIntro")}</p>
      <ul className="space-y-2">
        {rows.map(({ share, agency, milestone, contract }) => {
          const amount = formatFils(share.amountFils, locale, contract.currency);
          return (
            <li key={share.id} className="space-y-2 rounded-2xl border p-3 text-sm" data-testid="partner-work-item">
              <p dir="auto">{t("offer", { agency: agency.name, milestone: milestone.title, amount })}</p>
              {share.note && <p className="text-xs text-muted-foreground" dir="auto">{share.note}</p>}
              {share.status === "proposed" ? (
                <form action={answerShareAction} className="flex gap-2">
                  <input type="hidden" name="shareId" value={share.id} />
                  <SubmitButton className="h-8" name="answer" value="accept">
                    {t("accept")}
                  </SubmitButton>
                  <SubmitButton variant="outline" className="h-8" name="answer" value="decline">
                    {t("decline")}
                  </SubmitButton>
                </form>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{tm(`status.${milestone.status}` as "status.pending")}</span>
                  <Link href={`/studio/partner-work/${share.id}`} className="font-medium text-brand" data-testid="partner-work-open">
                    {t("open")}
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
