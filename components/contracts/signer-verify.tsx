"use client";

import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** What the send-code action answers (contracts and NDAs alike). */
export type SignCodeState = { sent?: true; email?: string; masked?: string; shownCode?: string; error?: string } | undefined;

/**
 * Step one of signing from a private link (QA H-01): get a one-time code by email. When the
 * agreement names the client's email, the code goes there (shown masked); otherwise the signer
 * types the address that will be recorded with the signature. A separate form, so sending a
 * code never clears the signature being drawn below.
 */
export function SignerCodeForm({ state, action, hidden, masked }: { state: SignCodeState; action: (formData: FormData) => void; hidden: Record<string, string>; masked: string | null }) {
  const t = useTranslations("Agreements.verify");
  return (
    <form action={action} className="space-y-2 rounded-xl border bg-background p-3" data-testid="signer-verify">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <p className="flex items-center gap-2 text-sm font-semibold"><MailCheck className="size-4 text-brand" aria-hidden /> {t("title")}</p>
      <p className="text-xs text-muted-foreground">{masked ? t("hintFixed", { email: masked }) : t("hintOpen")}</p>
      {!masked && (
        <div className="grid gap-1.5">
          <Label htmlFor="sign-email">{t("email")}</Label>
          <Input id="sign-email" name="signEmail" type="email" required autoComplete="email" dir="ltr" defaultValue={state?.email ?? ""} className="bg-background" />
        </div>
      )}
      <SubmitButton variant="outline" className="h-10" testId="send-sign-code">{state?.sent ? t("resend") : t("send")}</SubmitButton>
      {state?.sent && <p className="text-xs text-muted-foreground" role="status" data-testid="sign-code-sent">{t("sent", { email: state.masked ?? masked ?? "" })}</p>}
      {state?.shownCode && <p className="rounded-md bg-amber-500/15 px-2 py-1 text-xs" data-testid="shown-sign-code">{t("shownCode", { code: state.shownCode })}</p>}
      <FormError message={state?.error ? t(`errors.${state.error}` as "errors.email") : undefined} />
    </form>
  );
}

/** Step two, inside the signing form: the code, and the address it went to. */
export function SignerCodeField({ state }: { state: SignCodeState }) {
  const t = useTranslations("Agreements.verify");
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="sign-code">{t("code")}</Label>
      {state?.email && <input type="hidden" name="signEmail" value={state.email} />}
      <Input id="sign-code" name="signCode" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} dir="ltr" className="w-40 bg-background tracking-widest" data-testid="sign-code" />
    </div>
  );
}
