"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { setChatMessageHiddenAction } from "@/app/[locale]/(main)/admin/conversation-actions";
import { Button } from "@/components/ui/button";

export function HideMessageButton({ id, hidden }: { id: number; hidden: boolean }) {
  const t = useTranslations("Chat.admin");
  const [pending, start] = useTransition();
  return (
    <Button size="xs" variant={hidden ? "secondary" : "outline"} disabled={pending} onClick={() => start(() => setChatMessageHiddenAction(id, !hidden))} data-testid="hide-message">
      {hidden ? t("unhide") : t("hide")}
    </Button>
  );
}
