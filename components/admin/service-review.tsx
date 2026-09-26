"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";
import { reviewServiceAction } from "@/app/[locale]/(main)/admin/service-actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { ChipGroup } from "@/components/studio/chips";
import { Input } from "@/components/ui/input";
import { searchTags, tagLabel } from "@/lib/services/catalog";

type Option = { key: string; label: string };

/** One typed service waiting for review: approve it as a tag, merge it into an existing tag, or reject it. */
export function ServiceReview({
  tag,
  groups,
  parents,
  roles,
}: {
  tag: { id: number; text: string; agencies: { name: string; handle: string }[] };
  groups: Option[];
  parents: Option[];
  roles: Option[];
}) {
  const t = useTranslations("AdminServices");
  const locale = useLocale();
  const [state, action] = useActionState(reviewServiceAction, undefined);
  const [mode, setMode] = useState<"approve" | "merge">("approve");
  const [query, setQuery] = useState(tag.text);
  const [target, setTarget] = useState<string | null>(null);
  const matches = useMemo(() => searchTags(query, { limit: 6 }), [query]);
  const isArabic = /[؀-ۿ]/.test(tag.text);
  const select = "h-9 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

  if (state?.ok) return <p className="rounded-xl border p-4 text-sm text-brand" role="status">✓ {t(`done.${state.ok}`, { name: tag.text })}</p>;

  return (
    <article className="grid gap-3 rounded-xl border p-4" data-testid="pending-service">
      <div>
        <p className="text-lg font-semibold" dir="auto">“{tag.text}”</p>
        <p className="text-xs text-muted-foreground">
          {t("usedBy", { count: tag.agencies.length })}: {tag.agencies.map((a) => `@${a.handle}`).join("، ") || "—"}
        </p>
      </div>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm" role="tablist">
        {(["approve", "merge"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`flex-1 rounded-md px-3 py-1.5 ${mode === m ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"}`}>
            {t(m)}
          </button>
        ))}
      </div>

      {mode === "approve" ? (
        <form action={action} className="grid gap-3">
          <input type="hidden" name="tagId" value={tag.id} />
          <input type="hidden" name="action" value="approve" />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              {t("nameAr")}
              <Input name="nameAr" required minLength={2} maxLength={80} dir="rtl" defaultValue={isArabic ? tag.text : ""} />
            </label>
            <label className="grid gap-1 text-sm">
              {t("nameEn")}
              <Input name="nameEn" required minLength={2} maxLength={80} dir="ltr" defaultValue={isArabic ? "" : tag.text} />
            </label>
            <label className="grid gap-1 text-sm">
              {t("group")}
              <select name="group" className={select} defaultValue={groups[0]?.key}>
                {groups.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              {t("parent")}
              <select name="parent" className={select} defaultValue="">
                <option value="">—</option>
                {parents.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-1 text-sm">
            {t("roles")}
            <ChipGroup name="roles" options={roles} />
          </div>
          <label className="grid gap-1 text-sm">
            {t("aliases")}
            <Input name="aliases" maxLength={400} placeholder={t("aliasesHint")} />
          </label>
          <div className="flex flex-wrap gap-2">
            <SubmitButton className="h-9">{t("approveButton")}</SubmitButton>
            <button type="submit" formNoValidate name="action" value="reject" className="h-9 rounded-lg px-3 text-sm text-destructive hover:bg-destructive/10" data-testid="reject-service">
              {t("reject")}
            </button>
          </div>
        </form>
      ) : (
        <form action={action} className="grid gap-3">
          <input type="hidden" name="tagId" value={tag.id} />
          <input type="hidden" name="action" value="merge" />
          <input type="hidden" name="into" value={target ?? ""} />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("mergeSearch")} aria-label={t("mergeSearch")} />
          <ul className="grid gap-1">
            {matches.map((m) => (
              <li key={m.key}>
                <button type="button" onClick={() => setTarget(m.key)} aria-pressed={target === m.key} className={`w-full rounded-md border px-3 py-2 text-start text-sm ${target === m.key ? "border-primary bg-accent" : "hover:bg-muted"}`}>
                  {tagLabel(m.key, locale)} <span className="text-xs text-muted-foreground">· {tagLabel(m.key, locale === "ar" ? "en" : "ar")}</span>
                </button>
              </li>
            ))}
          </ul>
          <SubmitButton className="h-9" disabled={!target}>{target ? t("mergeInto", { name: tagLabel(target, locale) ?? target }) : t("merge")}</SubmitButton>
        </form>
      )}
    </article>
  );
}
