import { Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAgency } from "@/lib/auth/guards";
import { listOpportunities } from "@/lib/data/requests";
import { timeAgo } from "@/lib/format";
import { serviceLabel } from "@/lib/labels";

export default async function OpportunitiesPage({ params }: PageProps<"/[locale]/studio/opportunities">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { agency } = await requireAgency();
  const t = await getTranslations("Opportunities");
  const tCity = await getTranslations("Cities");
  const rows = await listOpportunities(agency);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      <ul className="space-y-3" data-testid="opportunities">
        {rows.map((o) => (
          <li key={o.request.id}>
            <Link href={`/studio/opportunities/${o.request.id}`} className="block space-y-1 rounded-xl border p-4 hover:bg-muted">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {o.request.services.map((s) => serviceLabel(s, locale)).join(" · ")}
                {o.invited && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                    <Sparkles className="size-3" /> {t("invited")}
                  </span>
                )}
                {o.myProposal && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">{t("sent")}</span>}
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground" dir="auto">{o.request.description}</p>
              <p className="text-xs text-muted-foreground">
                {o.request.city ? tCity(o.request.city) : "—"} · {t("budget")}: {o.request.budgetMaxJod ? `${o.request.budgetMinJod ?? 0}–${o.request.budgetMaxJod} JOD` : t("any")} · {t("proposals", { count: o.proposalCount })} · {timeAgo(o.request.createdAt.toISOString(), locale)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
