"use client";

import { CheckCircle2, Copy, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState, useTransition } from "react";
import { confirmMfaAction, disableMfaAction, regenerateCodesAction, startMfaAction, type MfaResult } from "@/app/[locale]/(main)/security-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";

type Props = { enabled: boolean; backupCodesLeft: number; keyConfigured: boolean; required: boolean };

function CodeField({ id = "code" }: { id?: string }) {
  const t = useTranslations("Security");
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{t("codeLabel")}</Label>
      <Input id={id} name="code" inputMode="numeric" autoComplete="one-time-code" required dir="ltr" maxLength={20} className="max-w-40 text-center tracking-widest" placeholder="123456" />
    </div>
  );
}

function BackupCodes({ codes }: { codes: string[] }) {
  const t = useTranslations("Security");
  const text = codes.join("\n");
  return (
    <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4" data-testid="backup-codes">
      <p className="text-sm font-medium">{t("backupTitle")}</p>
      <p className="text-xs text-muted-foreground">{t("backupBody")}</p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm" dir="ltr">
        {codes.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => navigator.clipboard?.writeText(text)}>
          <Copy className="size-4" /> {t("copy")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([`Sawwiq backup codes\n\n${text}\n`], { type: "text/plain" }));
            const a = Object.assign(document.createElement("a"), { href: url, download: "sawwiq-backup-codes.txt" });
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="size-4" /> {t("download")}
        </Button>
      </div>
    </div>
  );
}

export function TwoFactorPanel({ enabled, backupCodesLeft, keyConfigured, required }: Props) {
  const t = useTranslations("Security");
  const router = useRouter();
  const [setup, setSetup] = useState<MfaResult | null>(null);
  const [starting, startTransition] = useTransition();
  const [confirmState, confirmAction] = useActionState(confirmMfaAction, undefined);
  const [regenState, regenAction] = useActionState(regenerateCodesAction, undefined);
  const [disableState, disableAction] = useActionState(disableMfaAction, undefined);
  const err = (s?: MfaResult) => (s?.error ? t(`errors.${s.error}` as "errors.badCode") : undefined);

  if (disableState?.done) {
    return (
      <p className="flex items-center gap-2 rounded-xl border p-4 text-sm">
        <ShieldAlert className="size-5 text-amber-600" /> {t("turnedOff")}
      </p>
    );
  }

  if (confirmState?.backupCodes) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-brand" data-testid="mfa-enabled">
          <CheckCircle2 className="size-5" /> {t("enabledNow")}
        </p>
        <BackupCodes codes={confirmState.backupCodes} />
        <Button onClick={() => router.refresh()}>{t("savedCodes")}</Button>
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="space-y-4">
        {required && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm" role="alert" data-testid="mfa-required">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" /> {t("requiredNotice")}
          </p>
        )}
        {!keyConfigured && <FormError message={t("errors.notConfigured")} />}
        {!setup?.secret ? (
          <>
            <p className="text-sm text-muted-foreground">{t("offBody")}</p>
            <FormError message={err(setup ?? undefined)} />
            <Button disabled={!keyConfigured || starting} onClick={() => startTransition(async () => setSetup(await startMfaAction()))} data-testid="mfa-start">
              {t("turnOn")}
            </Button>
          </>
        ) : (
          <form action={confirmAction} className="space-y-4">
            <ol className="list-decimal space-y-1 ps-5 text-sm">
              <li>{t("step1")}</li>
              <li>{t("step2")}</li>
              <li>{t("step3")}</li>
            </ol>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={setup.qr} alt={t("qrAlt")} width={180} height={180} className="rounded-lg border bg-white p-2" />
            <p className="text-xs text-muted-foreground">
              {t("manualKey")} <code className="break-all rounded bg-muted px-1 font-mono" dir="ltr" data-testid="mfa-secret">{setup.secret}</code>
            </p>
            <FormError message={err(confirmState)} />
            <CodeField />
            <SubmitButton>{t("confirm")}</SubmitButton>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2 text-sm font-medium" data-testid="mfa-on">
        <ShieldCheck className="size-5 text-brand" /> {t("onBody", { count: backupCodesLeft })}
      </p>
      {regenState?.backupCodes ? (
        <BackupCodes codes={regenState.backupCodes} />
      ) : (
        <form action={regenAction} className="space-y-3 rounded-xl border p-4">
          <p className="text-sm font-medium">{t("newCodes")}</p>
          <FormError message={err(regenState)} />
          <CodeField id="regen-code" />
          <SubmitButton variant="outline">{t("newCodesButton")}</SubmitButton>
        </form>
      )}
      {!required && (
        <form action={disableAction} className="space-y-3 rounded-xl border border-destructive/30 p-4">
          <p className="text-sm font-medium">{t("turnOff")}</p>
          <FormError message={err(disableState)} />
          <div className="grid gap-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required dir="ltr" />
          </div>
          <CodeField id="off-code" />
          <SubmitButton variant="destructive">{t("turnOff")}</SubmitButton>
        </form>
      )}
    </div>
  );
}
