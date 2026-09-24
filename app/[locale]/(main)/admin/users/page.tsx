import { ShieldCheck, ShieldOff } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireStaff } from "@/lib/auth/guards";
import { can } from "@/lib/auth/permissions";
import { adminListUsers } from "@/lib/data/admin";
import { formatDate, timeAgo } from "@/lib/format";
import { resetMfaAction } from "../actions";

export default async function AdminUsers({ params, searchParams }: PageProps<"/[locale]/admin/users">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireStaff("users.view");
  const { q } = await searchParams;
  const t = await getTranslations("AdminUsers");
  const rows = await adminListUsers(typeof q === "string" ? q : undefined);
  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <input name="q" defaultValue={typeof q === "string" ? q : ""} placeholder={t("search")} className="h-9 flex-1 rounded-md border bg-background px-3 text-sm" dir="auto" />
        <button className="rounded-md border px-3 text-sm hover:bg-muted">{t("go")}</button>
      </form>
      <ul className="divide-y rounded-xl border" data-testid="admin-users">
        {rows.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-3 text-sm">
            {u.mfa ? <ShieldCheck className="size-5 text-brand" aria-label={t("mfaOn")} /> : <ShieldOff className="size-5 text-muted-foreground" aria-label={t("mfaOff")} />}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium" dir="ltr">{u.email}</span>
              <span className="block text-xs text-muted-foreground">
                {t(`roles.${u.role}`)}
                {u.agencyHandle && (
                  <>
                    {" · "}
                    <Link href={`/a/${u.agencyHandle}`} className="hover:underline" dir="ltr">@{u.agencyHandle}</Link>
                  </>
                )}
                {" · "}
                {u.mfa ? t("mfaOn") : t("mfaOff")}
                {" · "}
                {u.lastLoginAt ? t("lastLogin", { when: timeAgo(u.lastLoginAt.toISOString(), locale) }) : t("neverLoggedIn")}
                {" · "}
                {t("joined", { date: formatDate(u.createdAt, locale) })}
              </span>
            </span>
            {u.mfa && u.id !== me.id && u.role !== "owner" && can(me.role, "users.reset_mfa") && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">{t("reset")}</summary>
                <form action={resetMfaAction} className="mt-2 space-y-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <p className="max-w-60 text-muted-foreground">{t("resetHint")}</p>
                  <button className="rounded-md border border-destructive/40 px-2.5 py-1.5 text-destructive hover:bg-destructive/10">{t("resetConfirm")}</button>
                </form>
              </details>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
