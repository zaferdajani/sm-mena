"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { addBackgroundAction } from "@/app/[locale]/(main)/admin/appearance/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Upload an image or looping video as the background of one country's interface (or all), optionally for a date range. */
export function BackgroundForm({ scopes }: { scopes: { value: string; label: string }[] }) {
  const t = useTranslations("Appearance");
  const [state, action] = useActionState(addBackgroundAction, undefined);
  const [preview, setPreview] = useState<{ url: string; video: boolean } | null>(null);
  const [veil, setVeil] = useState(60);
  return (
    <form action={action} className="space-y-3 rounded-2xl border p-4" data-testid="background-form">
      <h2 className="font-semibold">{t("add")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="bg-label">{t("label")}</Label>
          <Input id="bg-label" name="label" required maxLength={80} placeholder={t("labelPh")} dir="auto" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bg-scope">{t("scope")}</Label>
          <select id="bg-scope" name="scope" className="h-10 rounded-lg border bg-background px-2 text-sm" defaultValue="all">
            {scopes.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bg-start">{t("startsOn")}</Label>
          <Input id="bg-start" name="startsOn" type="date" dir="ltr" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="bg-end">{t("endsOn")}</Label>
          <Input id="bg-end" name="endsOn" type="date" dir="ltr" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("datesHint")}</p>
      <div className="grid gap-1.5">
        <Label htmlFor="bg-file">{t("file")}</Label>
        <Input
          id="bg-file"
          name="file"
          type="file"
          required
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? { url: URL.createObjectURL(f), video: f.type.startsWith("video/") } : null);
          }}
        />
        <span className="text-xs text-muted-foreground">{t("fileHint")}</span>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bg-veil">{t("veil", { n: veil })}</Label>
        <input id="bg-veil" name="veil" type="range" min={0} max={95} step={5} value={veil} onChange={(e) => setVeil(Number(e.target.value))} className="accent-[var(--brand)]" />
        <span className="text-xs text-muted-foreground">{t("veilHint")}</span>
      </div>
      {preview && (
        <div className="relative h-40 overflow-hidden rounded-xl border" data-testid="background-preview">
          {preview.video ? (
            <video src={preview.url} autoPlay muted loop playsInline className="size-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
            <img src={preview.url} alt="" className="size-full object-cover" />
          )}
          <div className="absolute inset-0 bg-background" style={{ opacity: veil / 100 }} />
          <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-semibold">{t("previewText")}</p>
        </div>
      )}
      <FormError message={state?.error ? t(`errors.${state.error}` as "errors.invalid") : undefined} />
      {state?.ok && <p className="text-sm text-brand" role="status">{t("added")}</p>}
      <SubmitButton>{t("save")}</SubmitButton>
    </form>
  );
}
