"use client";

import { Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { sendInquiry } from "@/app/[locale]/(main)/actions";
import { FormError } from "@/components/form-error";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { serviceLabel } from "@/lib/labels";

export function InquiryDialog({ agencyId, agencyName, services, postId }: { agencyId: string; agencyName: string; services: string[]; postId?: string }) {
  const t = useTranslations("Inquiry");
  const tchat = useTranslations("Chat");
  const locale = useLocale();
  const [state, action] = useActionState(sendInquiry, undefined);
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary" className="h-9 flex-1 gap-1.5" data-testid="message-button" />}>
        <Send className="size-4 rtl:-scale-x-100" />
        {t("open")}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title", { name: agencyName })}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        {state?.ok ? (
          <p role="status" className="rounded-lg bg-accent px-3 py-4 text-center text-sm text-accent-foreground" data-testid="inquiry-sent">
            ✓ {t("sent")}{" "}
            <Link href="/chats" className="font-semibold underline">
              {tchat("openChats")}
            </Link>
          </p>
        ) : (
          <form action={action} className="grid gap-3">
            <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
            <input type="hidden" name="agencyId" value={agencyId} />
            {postId && <input type="hidden" name="postId" value={postId} />}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="inq-name">{t("name")}</Label>
                <Input id="inq-name" name="name" required maxLength={80} autoComplete="name" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="inq-phone">{t("phone")}</Label>
                <Input id="inq-phone" name="phone" type="tel" required dir="ltr" autoComplete="tel" placeholder="07X XXX XXXX" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="inq-business">{t("business")}</Label>
              <Input id="inq-business" name="business" maxLength={120} autoComplete="organization" />
            </div>
            {services.length > 0 && (
              <div className="grid gap-1.5">
                <Label htmlFor="inq-service">{t("service")}</Label>
                <select id="inq-service" name="service" className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm">
                  <option value="">{t("anyService")}</option>
                  {services.map((s) => (
                    <option key={s} value={s}>{serviceLabel(s, locale)}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="inq-message">{t("message")}</Label>
              <Textarea id="inq-message" name="message" required minLength={5} maxLength={2000} rows={4} placeholder={t("messagePlaceholder")} />
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[var(--primary)]" />
              {t("consent")}
            </label>
            <p className="text-xs text-muted-foreground" data-testid="inquiry-chat-notice">{tchat("inquiryNotice")}</p>
            <SubmitButton className="h-10">{t("send")}</SubmitButton>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
