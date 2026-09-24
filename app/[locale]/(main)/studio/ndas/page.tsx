import { FileLock2, Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { listAgencyNdas } from "@/lib/data/ndas";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const NDA_STATUS_STYLE: Record<string, string> = {
  sent: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  signed: "bg-brand/15 text-brand",
  declined: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export default async function StudioNdas({ params }: PageProps<"/[locale]/studio/ndas">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Agreements.ndaStudio");
  const rows = await listAgencyNdas(agency.id);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
        </div>
        <Link href="/studio/ndas/new" className={buttonVariants({ className: "shrink-0 gap-1.5" })} data-testid="new-nda">
          <Plus className="size-4" /> {t("new")}
        </Link>
      </div>
      {!rows.length && (
        <div className="space-y-2 rounded-2xl border border-dashed p-8 text-center">
          <FileLock2 className="mx-auto size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      )}
      <ul className="space-y-2" data-testid="nda-list">
        {rows.map((n) => (
          <li key={n.id}>
            <Link href={`/studio/ndas/${n.id}`} className="flex items-center gap-3 rounded-2xl border p-3 hover:bg-muted/50">
              <FileLock2 className="size-5 shrink-0 text-brand" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium" dir="auto">{n.clientName}</span>
                <span className="block truncate text-xs text-muted-foreground" dir="auto">
                  {n.purpose} · {formatDate(n.createdAt, locale)}
                </span>
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px]", NDA_STATUS_STYLE[n.status])}>{t(`status.${n.status as "sent"}`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
