"use client";

import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { reportPost } from "@/app/[locale]/(main)/actions";
import { SubmitButton } from "@/components/submit-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const REASONS = ["spam", "stolen_work", "misleading", "inappropriate", "other"] as const;

export function ReportDialog({ postId }: { postId: string }) {
  const t = useTranslations("Report");
  const [state, action] = useActionState(reportPost, undefined);
  return (
    <Dialog>
      <DialogTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" data-testid="report-button">
        <Flag className="size-3.5" />
        {t("open")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        {state?.ok ? (
          <p role="status" className="py-4 text-center text-sm">✓ {t("sent")}</p>
        ) : (
          <form action={action} className="grid gap-3">
            <input type="hidden" name="postId" value={postId} />
            <fieldset className="grid gap-2">
              {REASONS.map((reason, i) => (
                <label key={reason} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-primary">
                  <input type="radio" name="reason" value={reason} defaultChecked={i === 0} className="accent-[var(--primary)]" />
                  {t(`reasons.${reason}`)}
                </label>
              ))}
            </fieldset>
            <Textarea name="details" maxLength={1000} rows={3} placeholder={t("details")} />
            <SubmitButton variant="destructive">{t("send")}</SubmitButton>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
