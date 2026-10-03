import { getTranslations, setRequestLocale } from "next-intl/server";
import { OwnerAdminControls } from "./controls";
import { requireStaff } from "@/lib/auth/guards";
import { countryName } from "@/lib/core/catalog/countries";
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
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-start text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">{t("cols.owner")}</th>
              <th className="px-3 py-2 text-start">{t("cols.where")}</th>
              <th className="px-3 py-2 text-start">{t("cols.needs")}</th>
              <th className="px-3 py-2 text-start">{t("cols.timing")}</th>
              <th className="px-3 py-2 text-start">{t("cols.matches")}</th>
            </tr>
          </thead>
          <tbody>
            {!rows.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">{t("empty")}</td></tr>}
            {rows.map((r) => (
              <tr key={r.userId} className="border-t align-top" data-testid="admin-owner-row">
                <td className="px-3 py-2"><bdi dir="ltr">{r.emailMasked}</bdi><div className="text-xs text-muted-foreground">{fmt.format(r.createdAt)}</div></td>
                <td className="px-3 py-2">{r.city} · {countryName(r.country, locale)}{r.businessType && <div className="text-xs text-muted-foreground">{tInd(r.businessType)}</div>}</td>
                <td className="px-3 py-2">{r.services.map(groupLabel).join("، ")}</td>
                <td className="px-3 py-2">{t(`timings.${r.timing}` as "timings.now")}</td>
                <td className="px-3 py-2">
                  {!r.matches.length && <span className="text-muted-foreground">{t("noMatches")}</span>}
                  {r.matches.length > 0 && (
                    <ul className="grid gap-1">
                      {r.matches.map((m) => <li key={m.handle}><bdi>{m.agencyName}</bdi> <span className="text-xs text-muted-foreground">{m.score} · {t(`status.${m.status}` as "status.suggested")}</span></li>)}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t("note")}</p>
    </div>
  );
}
