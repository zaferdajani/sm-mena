import { getTranslations, setRequestLocale } from "next-intl/server";
import { OwnerAdminControls } from "./controls";
import { requireStaff } from "@/lib/auth/guards";
import { cityName, countryName } from "@/lib/core/catalog/countries";
import { SERVICE_GROUPS } from "@/lib/core/catalog/services/catalog";
import { OWNER_MATCH_EMAILS, ownerOverview } from "@/lib/data/owner-matching";
import { ownerNeedsStats } from "@/lib/data/owner-needs";

/** Admin → Business owners (docs/59): who registered, what they need, their matches, and the two buttons. */
export default async function AdminOwnersPage({ params }: PageProps<"/[locale]/admin/owners">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("owners.manage");
  const [t, tInd, rows, stats] = await Promise.all([getTranslations("AdminOwners"), getTranslations("Industries"), ownerOverview(), ownerNeedsStats()]);
  const groupLabel = (key: string) => { const g = SERVICE_GROUPS.find((x) => x.key === key); return g ? (locale === "ar" ? g.name_ar : g.name_en) : key; };
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-JO-u-nu-latn" : "en", { day: "numeric", month: "short" });
  const sendOpen = OWNER_MATCH_EMAILS();
  return (
    <div className="space-y-6" data-testid="admin-owners-page">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("intro", { count: stats.total })}</p>
      </div>
      <OwnerAdminControls sendOpen={sendOpen} />
      {/* Cards, not a table: one owner per card reads on a phone without sideways scrolling. */}
      {!rows.length && <p className="rounded-xl border px-3 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      <ul className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <li key={r.userId} className="rounded-xl border p-3 text-sm" data-testid="admin-owner-row">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <bdi dir="ltr" className="font-medium">{r.emailMasked}</bdi>
              <span className="text-xs text-muted-foreground">{fmt.format(r.createdAt)}</span>
            </div>
            <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
              <dt className="text-xs text-muted-foreground">{t("cols.where")}</dt>
              <dd>{[cityName(r.city, locale), countryName(r.country, locale)].filter(Boolean).join("، ")}{r.businessType && <span className="text-muted-foreground"> · {tInd(r.businessType)}</span>}</dd>
              <dt className="text-xs text-muted-foreground">{t("cols.needs")}</dt>
              <dd>{r.services.map(groupLabel).join("، ")}</dd>
              <dt className="text-xs text-muted-foreground">{t("cols.timing")}</dt>
              <dd>{t(`timings.${r.timing}` as "timings.now")}</dd>
              <dt className="text-xs text-muted-foreground">{t("cols.matches")}</dt>
              <dd>
                {!r.matches.length && <span className="text-muted-foreground">{t("noMatches")}</span>}
                {r.matches.length > 0 && (
                  <ul className="grid gap-1">
                    {r.matches.map((m) => <li key={m.handle}><bdi>{m.agencyName}</bdi> <span className="text-xs text-muted-foreground">{m.score} · {t(`status.${m.status}` as "status.suggested")}</span></li>)}
                  </ul>
                )}
              </dd>
            </dl>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
