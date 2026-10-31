"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { replySupportAction } from "@/app/[locale]/(main)/admin/bug-actions";
import { SUPPORT_STATUSES, type SupportStatus } from "@/lib/data/bug-statuses";

/**
 * One reply to the reporter, with the report's status after it (labelled; "keep" by default), and a visible
 * confirmation once it is sent: the reporter sees it in their conversation and gets a link by email (docs/63).
 */
export function SupportReplyForm({ id, status }: { id: string; status: SupportStatus }) {
  const t = useTranslations("AdminBugs");
  const [state, action, pending] = useActionState(replySupportAction, undefined);
  return (
    <form action={action} className="grid gap-2 rounded-lg bg-muted/40 p-2" data-testid="report-reply">
      <input type="hidden" name="id" value={id} />
      <label className="grid gap-1 text-xs font-medium">
        {t("reply")}
        <textarea name="body" rows={2} required minLength={2} maxLength={3000} placeholder={t("replyHint")} className="rounded-md border bg-background px-2 py-1.5 text-xs font-normal" dir="auto" />
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs font-medium">
          {t("statusAfter")}
          <select name="status" defaultValue="" className="h-8 rounded-md border bg-background px-2 text-xs font-normal">
            <option value="">{t("keepStatus", { status: t(`reportStatus.${status}`) })}</option>
            {SUPPORT_STATUSES.filter((s) => s !== status).map((s) => (
              <option key={s} value={s}>{t(`reportStatus.${s}`)}</option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">{t("sendReply")}</button>
      </div>
      {state?.ok && <p role="status" className="text-xs font-medium text-brand" data-testid="reply-sent">✓ {t("replySent")}</p>}
    </form>
  );
}
