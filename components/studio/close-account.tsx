"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { deactivateAccountAction, type DeactivateResult } from "@/app/[locale]/(main)/security-actions";
import { Button } from "@/components/ui/button";

/** Studio → Security: close my account (docs/32). */
export function CloseAccount({ handle }: { handle: string }) {
  const t = useTranslations("CloseAccount");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeactivateResult | undefined, FormData>(deactivateAccountAction, undefined);
  return (
    <section className="space-y-3 rounded-xl border border-destructive/30 p-4" data-testid="close-account">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)} data-testid="close-account-open">
          {t("start")}
        </Button>
      ) : (
        <form action={action} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            {t("confirmHandle", { handle })}
            <input name="handle" required autoComplete="off" dir="ltr" className="h-10 rounded-md border bg-transparent px-3" data-testid="close-account-handle" />
          </label>
          <label className="grid gap-1 text-sm">
            {t("password")}
            <input name="password" type="password" required autoComplete="current-password" className="h-10 rounded-md border bg-transparent px-3" data-testid="close-account-password" />
          </label>
          {state?.error && (
            <p className="text-sm text-destructive" role="alert" data-testid="close-account-error">
              {t(`errors.${state.error}`, { contracts: state.contracts?.join(", ") ?? "" })}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={pending} data-testid="close-account-submit">
              {t("submit")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
