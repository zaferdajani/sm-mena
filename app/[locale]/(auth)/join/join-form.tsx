"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { join } from "../actions";

export function JoinForm({ cities }: { cities: { key: string; label: string }[] }) {
  const t = useTranslations("Auth");
  const [state, action] = useActionState(join, undefined);
  const [handle, setHandle] = useState(state?.fields?.handle ?? "");
  const f = state?.fields ?? {};
  return (
    <form action={action} className="grid gap-4">
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <div className="grid gap-1.5">
        <Label htmlFor="name">{t("agencyName")}</Label>
        <Input id="name" name="name" required maxLength={80} defaultValue={f.name} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="handle">{t("handle")}</Label>
        <Input
          id="handle"
          name="handle"
          required
          dir="ltr"
          autoCapitalize="none"
          maxLength={30}
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
        />
        <p className="text-xs text-muted-foreground" dir="auto">
          {t("handleHint", { handle: handle || "your.agency" })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="city">{t("city")}</Label>
          <select id="city" name="city" required defaultValue={f.city || "amman"} className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm">
            {cities.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
          <Input id="whatsapp" name="whatsapp" type="tel" required dir="ltr" placeholder="07X XXX XXXX" defaultValue={f.whatsapp} />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required dir="ltr" defaultValue={f.email} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required dir="ltr" />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required className="mt-1 size-4 accent-[var(--primary)]" />
        <span>
          {t("consent")}{" "}
          <Link href="/legal" className="text-brand underline">
            ↗
          </Link>
        </span>
      </label>
      <SubmitButton className="h-10 w-full">{t("joinButton")}</SubmitButton>
    </form>
  );
}
