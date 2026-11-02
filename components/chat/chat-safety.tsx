"use client";

import { Ban, Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { blockChatAction, reportChatAction } from "@/app/[locale]/(main)/chat-actions";
import { Button } from "@/components/ui/button";
import type { ChatSide } from "@/lib/chat";

const REASONS = ["spam", "inappropriate", "misleading", "underage", "other"] as const;

/** Report or block the other person in a chat (App Store guideline 1.2). */
export function ChatSafety({ conversationId, side, token, onBlocked }: { conversationId: string; side: ChatSide; token?: string; onBlocked: () => void }) {
  const t = useTranslations("Chat.safety");
  const [mode, setMode] = useState<"idle" | "report" | "block">("idle");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("spam");
  const [details, setDetails] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (kind: "report" | "block") => {
    setBusy(true);
    const base = { conversationId, side, token };
    const result = await (kind === "report" ? reportChatAction({ ...base, reason, details }) : blockChatAction(base)).catch(() => ({ error: "generic" as const }));
    setBusy(false);
    if ("ok" in result) {
      setNote(t(kind === "report" ? "reported" : "blocked"));
      setMode("idle");
      setDetails("");
      if (kind === "block") onBlocked();
    } else setNote(t("error"));
  };

  return (
    <div className="shrink-0 border-b px-3 py-1.5 text-xs" data-testid="chat-safety">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "report" ? "idle" : "report")} data-testid="chat-report-open">
          <Flag className="size-3.5" aria-hidden /> {t("report")}
        </button>
        <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "block" ? "idle" : "block")} data-testid="chat-block-open">
          <Ban className="size-3.5" aria-hidden /> {t("block")}
        </button>
        {note && <span role="status" className="text-foreground">{note}</span>}
      </div>
      {mode === "report" && (
        <div className="mt-2 grid gap-2">
          <select value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])} className="h-10 rounded-md border bg-background px-2 text-base md:text-sm" aria-label={t("reasonLabel")}>
            {REASONS.map((r) => <option key={r} value={r}>{t(`reasons.${r}`)}</option>)}
          </select>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} rows={2} placeholder={t("details")} dir="auto" className="rounded-md border bg-transparent px-2 py-1 text-base md:text-sm" />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => run("report")} data-testid="chat-report-send">{t("sendReport")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>{t("cancel")}</Button>
          </div>
        </div>
      )}
      {mode === "block" && (
        <div className="mt-2 grid gap-2">
          <p>{t("blockBody")}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={busy} onClick={() => run("block")} data-testid="chat-block-confirm">{t("confirmBlock")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>{t("cancel")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
