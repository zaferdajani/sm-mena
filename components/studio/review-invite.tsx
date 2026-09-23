"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { createReviewInviteAction } from "@/app/[locale]/(main)/studio/actions";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export function ReviewInvite({ agencyName }: { agencyName: string }) {
  const t = useTranslations("Reviews.studio");
  const locale = useLocale();
  const [state, action] = useActionState(createReviewInviteAction, undefined);
  const [copied, setCopied] = useState(false);
  // Only rendered after the action returns, so window is always available here.
  const origin = typeof window === "undefined" ? SITE_URL : window.location.origin;
  const link = state?.token ? `${origin}/${locale}/review/${state.token}` : null;
  const message = link ? `${t("inviteMessage", { name: state?.clientName || "", agency: agencyName })} ${link}` : "";
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="font-semibold">{t("inviteTitle")}</h2>
      <p className="text-sm text-muted-foreground">{t("inviteBody")}</p>
      <form action={action} className="flex gap-2">
        <Input name="clientName" maxLength={80} placeholder={t("clientName")} aria-label={t("clientName")} className="h-9" />
        <SubmitButton className="h-9 shrink-0">{t("create")}</SubmitButton>
      </form>
      {link && (
        <div className="space-y-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground">
          <p>{t("linkReady")}</p>
          <p className="break-all font-mono text-xs" dir="ltr" data-testid="invite-link">{link}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonVariants({ variant: "outline", className: "h-8 gap-1.5" })}
              onClick={async () => {
                await navigator.clipboard.writeText(link).catch(() => {});
                setCopied(true);
              }}
            >
              <Copy className="size-3.5" />
              {copied ? t("copied") : t("copy")}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants(), "h-8 gap-1.5 bg-[#25D366] text-white hover:bg-[#1ebe5b]")}
            >
              <MessageCircle className="size-3.5" />
              {t("sendWhatsapp")}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
