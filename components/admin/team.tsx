"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { inviteStaffAction, transferOwnershipAction, updateStaffAction } from "@/app/[locale]/(main)/admin/team-actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSIGNABLE_ROLES } from "@/lib/auth/permissions";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

const field = "h-9 rounded-md border bg-background px-2 text-sm";

function ErrorLine({ error }: { error?: string }) {
  const t = useTranslations("AdminTeam.errors");
  if (!error) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {t.has(error) ? t(error) : t("invalid")}
    </p>
  );
}

export function InviteForm() {
  const t = useTranslations("AdminTeam");
  const locale = useLocale();
  const [state, action] = useActionState(inviteStaffAction, undefined);
  const [copied, setCopied] = useState(false);
  const origin = typeof window === "undefined" ? SITE_URL : window.location.origin;
  const link = state?.token ? `${origin}/${locale}/join/staff/${state.token}` : null;
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="font-semibold">{t("invite.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("invite.body")}</p>
      <form action={action} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <label className="grid gap-1 text-xs">
          {t("invite.email")}
          <Input name="email" type="email" required dir="ltr" className="h-9" data-testid="invite-email" />
        </label>
        <label className="grid gap-1 text-xs">
          {t("invite.role")}
          <select name="role" defaultValue="support" className={field} data-testid="invite-role">
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}.name`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          {t("invite.until")}
          <input name="until" type="date" className={field} dir="ltr" />
        </label>
        <SubmitButton className="h-9">{t("invite.create")}</SubmitButton>
      </form>
      <ErrorLine error={state?.error} />
      {link && (
        <div className="space-y-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
          <p>{t("invite.ready", { email: state?.email ?? "", days: 7 })}</p>
          <p className="break-all font-mono text-xs" dir="ltr" data-testid="staff-invite-link">
            {link}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonVariants({ variant: "outline", className: "h-8 gap-1.5" })}
              onClick={async () => {
                await navigator.clipboard.writeText(link).catch(() => {});
                setCopied(true);
              }}
            >
              <Copy className="size-3.5" />
              {copied ? t("invite.copied") : t("invite.copy")}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${t("invite.message")} ${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants(), "h-8 gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]")}
            >
              <MessageCircle className="size-3.5" />
              WhatsApp
            </a>
          </div>
          <p className="text-xs text-muted-foreground">{t("invite.once")}</p>
        </div>
      )}
    </section>
  );
}

/** Role, access end date and on/off switch for one staff member (never the owner). */
export function StaffControls({ userId, role, until, disabled }: { userId: string; role: string; until: string; disabled: boolean }) {
  const t = useTranslations("AdminTeam");
  const [state, action] = useActionState(updateStaffAction, undefined);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <form action={action} className="flex items-center gap-1">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="op" value="role" />
          <select name="role" defaultValue={role} aria-label={t("invite.role")} className={cn(field, "h-8 text-xs")}>
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}.name`)}
              </option>
            ))}
          </select>
          <SubmitButton variant="outline" className="h-8 text-xs">
            {t("change")}
          </SubmitButton>
        </form>
        <form action={action} className="flex items-center gap-1">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="op" value="expiry" />
          <input name="until" type="date" defaultValue={until} aria-label={t("invite.until")} className={cn(field, "h-8 text-xs")} dir="ltr" />
          <SubmitButton variant="outline" className="h-8 text-xs">
            {t("setUntil")}
          </SubmitButton>
        </form>
        <form action={action}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="op" value={disabled ? "enable" : "disable"} />
          <SubmitButton variant={disabled ? "secondary" : "destructive"} className="h-8 text-xs">
            {disabled ? t("enable") : t("disable")}
          </SubmitButton>
        </form>
      </div>
      <ErrorLine error={state?.error} />
    </div>
  );
}

export function TransferOwnership({ candidates }: { candidates: { id: string; email: string }[] }) {
  const t = useTranslations("AdminTeam.transfer");
  const [state, action] = useActionState(transferOwnershipAction, undefined);
  return (
    <details className="rounded-xl border border-destructive/30 p-4">
      <summary className="cursor-pointer font-semibold">{t("title")}</summary>
      <p className="mt-2 text-sm text-muted-foreground">{t("body")}</p>
      {candidates.length === 0 ? (
        <p className="mt-3 text-sm">{t("none")}</p>
      ) : (
        <form action={action} className="mt-3 grid gap-2 sm:max-w-md">
          <label className="grid gap-1 text-xs">
            {t("to")}
            <select name="userId" className={field} dir="ltr">
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            {t("password")}
            <Input name="password" type="password" required autoComplete="current-password" className="h-9" />
          </label>
          <label className="grid gap-1 text-xs">
            {t("code")}
            <Input name="code" inputMode="numeric" required autoComplete="one-time-code" className="h-9" dir="ltr" />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="confirm" required className="mt-1" />
            {t("confirm")}
          </label>
          <SubmitButton variant="destructive">{t("submit")}</SubmitButton>
          <ErrorLine error={state?.error} />
        </form>
      )}
    </details>
  );
}
