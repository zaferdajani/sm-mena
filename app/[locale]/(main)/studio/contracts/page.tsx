import { FileSignature, HandCoins, Plus, ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CONTRACT_STATUS_STYLE } from "@/components/contracts/contract-summary";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { listAgencyContracts } from "@/lib/data/contracts";
import { formatDate, formatFils } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function StudioContracts({ params }: PageProps<"/[locale]/studio/contracts">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Contracts");
  const rows = await listAgencyContracts(agency.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("listTitle")}</h2>
        <Link href="/studio/contracts/new" className={buttonVariants({ className: "gap-1.5" })} data-testid="new-contract">
          <Plus className="size-4" /> {t("new")}
        </Link>
      </div>
      {!rows.length && (
        <div className="space-y-2 rounded-2xl border border-dashed p-8 text-center">
          <FileSignature className="mx-auto size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      )}
      <ul className="space-y-2" data-testid="contract-list">
        {rows.map((c) => {
          const Mode = c.paymentMode === "protected" ? ShieldCheck : HandCoins;
          return (
            <li key={c.id}>
              <Link href={`/studio/contracts/${c.id}`} className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-muted/50">
                <Mode className={cn("size-5 shrink-0", c.paymentMode === "protected" ? "text-brand" : "text-muted-foreground")} aria-label={t(`mode.${c.paymentMode}`)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium" dir="auto">{c.title}</span>
                  <span className="block text-xs text-muted-foreground" dir="auto">
                    {c.clientName} · {formatDate(c.createdAt, locale)}
                  </span>
                </span>
                <span className="text-end">
                  <span className="block text-sm font-semibold tabular-nums">{formatFils(c.totalFils, locale, c.currency)}</span>
                  <span className={cn("mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px]", CONTRACT_STATUS_STYLE[c.status])}>{t(`status.${c.status}`)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
