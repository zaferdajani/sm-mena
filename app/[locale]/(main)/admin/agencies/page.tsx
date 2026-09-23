import { getTranslations, setRequestLocale } from "next-intl/server";
import { AgencyAdminButtons, RemoveDemoButton } from "@/components/admin/admin-buttons";
import { AgencyAvatar } from "@/components/agency-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/verified-badge";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { adminListAgencies } from "@/lib/data/admin";
import { setPlanAction } from "../actions";

export default async function AdminAgencies({ params, searchParams }: PageProps<"/[locale]/admin/agencies">) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const q = String((await searchParams).q ?? "").slice(0, 80);
  const t = await getTranslations("Admin");
  const tc = await getTranslations("Common");
  const tp = await getTranslations("Studio.plan");
  const rows = await adminListAgencies(q || undefined);
  const hasDemo = rows.some((r) => r.isDemo);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <form className="flex-1" role="search">
          <Input name="q" type="search" defaultValue={q} placeholder={t("search")} className="h-9" />
        </form>
        {hasDemo && <RemoveDemoButton />}
      </div>
      <ul className="divide-y rounded-xl border" data-testid="admin-agencies">
        {rows.map((a) => (
          <li key={a.id} className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex items-center gap-3">
              <AgencyAvatar name={a.name} src={a.avatarUrl} size={40} />
              <div className="min-w-0">
                <Link href={`/a/${a.handle}`} className="flex items-center gap-1 font-semibold">
                  <span className="truncate">{a.name}</span>
                  {a.isVerified && <VerifiedBadge label={tc("verified")} />}
                  {a.isDemo && <span className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{tc("demo")}</span>}
                  {a.status === "suspended" && <span className="rounded bg-destructive/10 px-1.5 text-[10px] text-destructive">{t("suspended")}</span>}
                </Link>
                <p className="truncate text-xs text-muted-foreground" dir="ltr">@{a.handle} · {a.ownerEmail} · {a.postCount} posts</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AgencyAdminButtons id={a.id} verified={a.isVerified} status={a.status} />
              <form action={setPlanAction} className="flex items-center gap-1">
                <input type="hidden" name="agencyId" value={a.id} />
                <select name="plan" defaultValue={a.plan} aria-label={t("plan")} className="h-8 rounded-md border bg-transparent px-1 text-xs">
                  {(["free", "pro", "business"] as const).map((p) => <option key={p} value={p}>{tp(p)}</option>)}
                </select>
                <input type="date" name="until" aria-label={t("planUntil")} defaultValue={a.planExpiresAt?.toISOString().slice(0, 10) ?? ""} className="h-8 rounded-md border bg-transparent px-1 text-xs" dir="ltr" />
                <Button type="submit" size="sm" variant="outline">{t("setPlan")}</Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
