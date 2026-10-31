import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { listAuditLog } from "@/lib/data/admin";
import { timeAgo } from "@/lib/format";

// Who did what: admin actions, sign-ins, 2FA changes, payments, contact-data access. Each entry is a sentence
// in the reader's language; the raw code and details stay one tap away for whoever investigates.
export default async function AdminAudit({ params }: PageProps<"/[locale]/admin/audit">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireStaff("audit.view");
  const t = await getTranslations("AdminAudit");
  const rows = await listAuditLog();
  const sentence = (action: string) => {
    const key = `actions.${action.replace(/\./g, "_")}`;
    return t.has(key) ? t(key as "actions.auth_login") : t("other");
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>}
      <ul className="divide-y rounded-xl border" data-testid="audit-log">
        {rows.map((r) => {
          const meta = r.meta as Record<string, unknown>;
          return (
            <li key={r.id} className="grid gap-0.5 p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {sentence(r.action)}
                  {r.agencyHandle && (
                    <>
                      {" · "}
                      <Link href={`/a/${r.agencyHandle}`} className="text-brand hover:underline"><bdi>{r.agencyName}</bdi></Link>
                    </>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt.toISOString(), locale)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("by")} <bdi dir="ltr">{r.actor ?? t("system")}</bdi>
              </p>
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">{t("details")}</summary>
                <p className="break-all font-mono text-[11px]" dir="ltr">
                  {r.action} · {r.entity}
                  {r.entityId ? `:${r.entityId.slice(0, 8)}` : ""} {Object.keys(meta).length ? JSON.stringify(meta) : ""}
                </p>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
