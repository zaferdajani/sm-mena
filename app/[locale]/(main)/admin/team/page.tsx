import { Crown, ShieldCheck, ShieldOff } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InviteForm, StaffControls, TransferOwnership } from "@/components/admin/team";
import { requireStaff } from "@/lib/auth/guards";
import { ASSIGNABLE_ROLES, permissionsOf } from "@/lib/auth/permissions";
import { listPendingInvites, listStaff } from "@/lib/data/staff";
import { formatDate, timeAgo } from "@/lib/format";
import { revokeInviteAction } from "../team-actions";

export default async function AdminTeam({ params }: PageProps<"/[locale]/admin/team">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const me = await requireStaff("staff.manage");
  const t = await getTranslations("AdminTeam");
  const [staff, invites] = await Promise.all([listStaff(), listPendingInvites()]);
  const now = new Date();
  const active = (s: (typeof staff)[number]) => !s.disabledAt && !(s.staffExpiresAt && s.staffExpiresAt < now);
  const candidates = staff.filter((s) => s.id !== me.id && s.mfa && active(s)).map((s) => ({ id: s.id, email: s.email }));

  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-accent p-3 text-sm text-accent-foreground">{t("intro")}</p>

      <section className="space-y-2">
        <h2 className="font-semibold">{t("members")}</h2>
        <ul className="divide-y rounded-xl border" data-testid="staff-list">
          {staff.map((s) => (
            <li key={s.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {s.mfa ? <ShieldCheck className="size-4 text-brand" aria-label={t("mfaOn")} /> : <ShieldOff className="size-4 text-muted-foreground" aria-label={t("mfaOff")} />}
                <span className="min-w-0 flex-1 truncate font-medium" dir="ltr">
                  {s.email}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {s.role === "owner" && <Crown className="size-3.5 text-amber-600" />}
                  {t(`roles.${s.role as "owner"}.name`)}
                </span>
                {s.disabledAt && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{t("disabled")}</span>}
                {!s.disabledAt && s.staffExpiresAt && s.staffExpiresAt < now && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{t("ended")}</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                {s.mfa ? t("mfaOn") : t("mfaOff")}
                {" · "}
                {s.lastLoginAt ? t("lastLogin", { when: timeAgo(s.lastLoginAt.toISOString(), locale) }) : t("neverLoggedIn")}
                {s.staffExpiresAt && ` · ${t("until", { date: formatDate(s.staffExpiresAt, locale) })}`}
              </p>
              {s.role !== "owner" && s.id !== me.id && (
                <StaffControls userId={s.id} role={s.role} until={s.staffExpiresAt?.toISOString().slice(0, 10) ?? ""} disabled={Boolean(s.disabledAt)} />
              )}
            </li>
          ))}
        </ul>
      </section>

      <InviteForm />

      {invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">{t("pending")}</h2>
          <ul className="divide-y rounded-xl border">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                <span className="min-w-0 flex-1 truncate" dir="ltr">
                  {i.email}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`roles.${i.role as "admin"}.name`)} · {t("linkExpires", { date: formatDate(i.expiresAt, locale) })}
                </span>
                <form action={revokeInviteAction}>
                  <input type="hidden" name="id" value={i.id} />
                  <button className="rounded-md border px-2.5 py-1 text-xs hover:bg-muted">{t("revoke")}</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">{t("whatTheyCanDo")}</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {(["owner", ...ASSIGNABLE_ROLES] as const).map((r) => (
            <li key={r} className="rounded-xl border p-3 text-sm">
              <p className="font-medium">{t(`roles.${r}.name`)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(`roles.${r}.body`)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground" dir="ltr">
                {permissionsOf(r).length} permissions
              </p>
            </li>
          ))}
        </ul>
      </section>

      <TransferOwnership candidates={candidates} />
    </div>
  );
}
