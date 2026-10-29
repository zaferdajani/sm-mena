"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { closeClientAccountAction, type CloseClientResult } from "@/app/[locale]/(main)/security-actions";
import { Button } from "@/components/ui/button";

/** Saved → close my account, for business owners (docs/08). Confirmed by typing the account's email. */
export function CloseClientAccount({ email }: { email: string }) {
  const t = useTranslations("CloseClientAccount");
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CloseClientResult | undefined, FormData>(closeClientAccountAction, undefined);
  return (
    <section className="max-w-xl space-y-3 rounded-xl border border-destructive/30 p-4" data-testid="close-client-account">
      <h2 className="font-semibold">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("body")}</p>
      {!open ? (
        <Button variant="outline" onClick={() => setOpen(true)} data-testid="close-client-open">
          {t("start")}
        </Button>
      ) : (
        <form action={action} className="grid gap-3">
          <label className="grid gap-1 text-sm">
            {t("confirmEmail")}
            <input name="email" type="email" required autoComplete="off" dir="ltr" placeholder={email} className="h-10 rounded-md border bg-transparent px-3" data-testid="close-client-email" />
          </label>
          {state?.error && (
            <p className="text-sm text-destructive" role="alert" data-testid="close-client-error">
              {t(`errors.${state.error}`)}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={pending} data-testid="close-client-submit">
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
