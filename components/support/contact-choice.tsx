"use client";

import { Mail, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { openHelpChat } from "@/lib/help/open-event";

// The two ways to reach support (docs/62): the chat answers right away and
// sends no email; the form below is answered by email.
export function ContactChoice({ aiEnabled }: { aiEnabled: boolean }) {
  const t = useTranslations("Support");
  const card = "flex w-full items-start gap-3 rounded-xl border p-3 text-start hover:bg-muted";
  return (
    <section className="space-y-2" data-testid="contact-choice">
      <h2 className="text-sm font-semibold">{t("choose")}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" className={card} onClick={openHelpChat} data-testid="choose-chat">
          <MessageCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block text-sm font-semibold">{t("chatTitle")}</span>
            <span className="block text-xs text-muted-foreground">{aiEnabled ? t("chatBodyAi") : t("chatBody")}</span>
          </span>
        </button>
        <a href="#support-form" className={card} data-testid="choose-email">
          <Mail className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="block text-sm font-semibold">{t("emailTitle")}</span>
            <span className="block text-xs text-muted-foreground">{t("emailBody")}</span>
          </span>
        </a>
      </div>
    </section>
  );
}
