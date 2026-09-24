import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/guards";
import { listAuditLog } from "@/lib/data/admin";
import { timeAgo } from "@/lib/format";

// Who did what: admin actions, sign-ins, 2FA changes, payments, contact-data access.
export default async function AdminAudit({ params }: PageProps<"/[locale]/admin/audit">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("AdminAudit");
  const rows = await listAuditLog();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm" data-testid="audit-log">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-start font-medium">{t("when")}</th>
              <th className="p-2 text-start font-medium">{t("who")}</th>
              <th className="p-2 text-start font-medium">{t("action")}</th>
              <th className="p-2 text-start font-medium">{t("details")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t align-top">
                <td className="whitespace-nowrap p-2 text-xs text-muted-foreground">{timeAgo(r.createdAt.toISOString(), locale)}</td>
                <td className="p-2 text-xs" dir="ltr">{r.actor ?? "—"}</td>
                <td className="p-2 font-mono text-xs" dir="ltr">{r.action}</td>
                <td className="max-w-64 truncate p-2 font-mono text-[11px] text-muted-foreground" dir="ltr" title={JSON.stringify(r.meta)}>
                  {r.entity}
                  {r.entityId ? `:${r.entityId.slice(0, 8)}` : ""} {Object.keys(r.meta as object).length ? JSON.stringify(r.meta) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
