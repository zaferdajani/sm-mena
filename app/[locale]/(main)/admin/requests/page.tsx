import { getTranslations, setRequestLocale } from "next-intl/server";
import { FilterChips } from "@/components/admin/filter-chips";
import { requireStaff } from "@/lib/auth/guards";
import { cityName, countryName, currencyLabel, currencyOf } from "@/lib/core/catalog/countries";
import { adminRequests } from "@/lib/data/admin";
import { serviceLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STATUSES = ["open", "closed", "all"] as const;

/**
 * Admin → Requests: the projects business owners sent and how far each got (matched, invited, seen, quotes),
 * so the team can see one that no one answers. Read-only, without the client's name or phone.
 */
export default async function AdminRequestsPage({ params, searchParams }: PageProps<"/[locale]/admin/requests">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("agencies.view");
  const raw = (await searchParams).status;
  const status = STATUSES.find((s) => s === raw) ?? "open";
  const [t, tInd, rows] = await Promise.all([getTranslations("AdminRequests"), getTranslations("Industries"), adminRequests(status)]);
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en", { day: "numeric", month: "short" });
  return (
    <div className="space-y-4" data-testid="admin-requests">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <FilterChips pathname="/admin/requests" param="status" current={status} options={STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) }))} />
      {!rows.length && <p className="rounded-xl border px-3 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      <ul className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => {
          const stuck = r.stuck;
          return (
            <li key={r.id} className={cn("rounded-xl border p-3 text-sm", stuck && "border-amber-500/60 bg-amber-500/5")} data-testid="admin-request-row" data-stuck={stuck || undefined}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{r.businessType ? tInd(r.businessType) : t("noType")}</span>
                <span className="text-xs text-muted-foreground">{fmt.format(r.createdAt)} · {t(`status.${r.status}`)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{r.services.map((s) => serviceLabel(s, locale)).join("، ") || "—"}</p>
              <p className="text-xs text-muted-foreground">
                {[cityName(r.city, locale), countryName(r.country, locale)].filter(Boolean).join("، ")}
                {r.budgetMinJod || r.budgetMaxJod ? ` · ${t("budget", { min: r.budgetMinJod ?? r.budgetMaxJod ?? 0, max: r.budgetMaxJod ?? r.budgetMinJod ?? 0, currency: currencyLabel(currencyOf(r.country), locale) })}` : ""}
                {r.source === "ai" ? ` · ${t("viaAssistant")}` : r.source === "demo" ? ` · ${t("demo")}` : ""}
              </p>
              <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                {(["matched", "invited", "seen", "quotes"] as const).map((k) => (
                  <div key={k} className="flex flex-col-reverse rounded-lg bg-muted/50 p-1.5">
                    <dt className="text-[11px] text-muted-foreground">{t(`counts.${k}`)}</dt>
                    <dd className="text-base font-bold tabular-nums">{r[k]}</dd>
                  </div>
                ))}
              </dl>
              {stuck && <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">{t("stuck")}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
